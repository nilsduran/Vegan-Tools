import type { FastifyInstance } from "fastify";
import {
  dishFeedbackRequestSchema,
  menuPatchSchema,
  restaurantCandidateSchema,
  restaurantNotesRequestSchema,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import type { Repository } from "../store.js";
import type { MenuAnalyzer } from "../menu-analyzer.js";
import type { MenuDiscoverer } from "../menu-discovery.js";
import type { RestaurantWebsiteFinder } from "../restaurant-website-finder.js";
import type { RestaurantMenuCache } from "../restaurant-menu-cache.js";
import { loadSourcesFromStore, type MenuSourceStore } from "../menu-source-store.js";
import type { DishFeedbackPolisher } from "../dish-feedback-polisher.js";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function friendlyMenuError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/quota|exhausted|429|resource/i.test(message)) {
    return "The menu service is busy right now. Please try again in a moment.";
  }
  if (/not configured|api key/i.test(message)) {
    return "Menu analysis is not configured on the API server.";
  }
  if (/model.*unavailable|not found/i.test(message)) {
    return "The configured Gemini model is unavailable. Check GEMINI_MODEL on the API server.";
  }
  if (/took too long|timeout/i.test(message)) {
    return "Menu analysis took too long. Please try again with a clear image.";
  }
  return "Menu analysis failed. Please try again or use a clearer image.";
}

export interface MenuRoutesOptions {
  repo: Repository;
  menuAnalyzer: MenuAnalyzer;
  menuDiscoverer: MenuDiscoverer;
  restaurantWebsiteFinder: RestaurantWebsiteFinder;
  restaurantMenuCache: RestaurantMenuCache;
  menuSourceStore: MenuSourceStore;
  dishFeedbackPolisher: DishFeedbackPolisher;
}

export async function menuRoutes(app: FastifyInstance, options: MenuRoutesOptions) {
  const {
    repo,
    menuAnalyzer,
    menuDiscoverer,
    restaurantWebsiteFinder,
    restaurantMenuCache,
    menuSourceStore,
    dishFeedbackPolisher,
  } = options;

  app.get<{ Params: { menuId: string; storedName: string } }>(
    "/v1/menu-sources/:menuId/:storedName",
    async (request, reply) => {
      const source = await menuSourceStore.read(
        request.params.menuId,
        request.params.storedName,
      );
      if (!source) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Original menu source not found.",
        });
      }
      return reply
        .type(source.mimeType)
        .header("Cache-Control", "public, max-age=3600")
        .send(source.buffer);
    },
  );

  app.post<{
    Body: {
      restaurantName?: string;
      websiteUrl?: string;
      restaurant?: unknown;
    };
  }>("/v1/menus/discover", async (request, reply) => {
    const parsedRestaurant = restaurantCandidateSchema.safeParse(
      request.body?.restaurant,
    );
    const websiteUrl = request.body?.websiteUrl?.trim();
    if (!websiteUrl) {
      return reply.code(400).send({
        code: "RESTAURANT_WEBSITE_REQUIRED",
        message: "Enter a valid website or menu link.",
      });
    }
    let normalizedWebsite: string;
    let fallbackName = "";
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      normalizedWebsite = parsed.toString();
      fallbackName = parsed.hostname.replace(/^www\./i, "").split(".")[0] ?? "Restaurant";
      if (fallbackName) {
        fallbackName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      }
    } catch {
      return reply.code(400).send({
        code: "INVALID_WEBSITE",
        message: "Enter a valid public restaurant website.",
      });
    }

    const restaurant = parsedRestaurant.success
      ? parsedRestaurant.data
      : undefined;

    const restaurantName =
      restaurant?.name ?? (request.body?.restaurantName?.trim() || fallbackName || "Restaurant");

    const draft = await repo.createMenu();

    // Check shared menu cache to return previously discovered menus instantly
    if (restaurant) {
      try {
        const cached = await restaurantMenuCache.get(restaurant);
        if (cached?.menu && cached.menu.status === "ready" && cached.menu.sections.length > 0) {
          const sessionMenu = {
            ...cached.menu,
            id: draft.id,
            editToken: draft.editToken,
          };
          await repo.setMenu(sessionMenu);
          return reply.code(200).send(sessionMenu);
        }
      } catch (cacheError) {
        request.log.warn({ cacheError }, "Restaurant menu cache lookup failed");
      }
    }

    const discoverWithFallback = async () => {
      try {
        return await withTimeout(
          menuDiscoverer.discover(normalizedWebsite),
          25_000,
          "Finding a menu on the restaurant website took too long.",
        );
      } catch (initialError) {
        if (!restaurant) throw initialError;
        const fallbackWebsite = await restaurantWebsiteFinder.find(
          { ...restaurant, websiteUrl: undefined },
          normalizedWebsite,
        );
        if (!fallbackWebsite || fallbackWebsite === normalizedWebsite) {
          throw initialError;
        }
        request.log.info(
          { rejectedWebsite: normalizedWebsite, fallbackWebsite },
          "Retrying menu discovery with a verified website",
        );
        return withTimeout(
          menuDiscoverer.discover(fallbackWebsite),
          25_000,
          "Finding a menu on the restaurant website took too long.",
        );
      }
    };
    void withTimeout(
      discoverWithFallback(),
      55_000,
      "Finding a menu on the restaurant website took too long.",
    )
      .then(async (discovered) => {
        let sourceFiles: Awaited<ReturnType<MenuSourceStore["save"]>> = [];
        try {
          sourceFiles = await menuSourceStore.save(draft.id, [discovered.upload]);
        } catch (sourceError) {
          request.log.warn({ sourceError }, "Discovered menu source could not be saved");
        }
        const draftWithSources = { ...draft, sourceFiles };
        await repo.setMenu(draftWithSources);
        return withTimeout(
          menuAnalyzer.analyze(draftWithSources, [discovered.upload]),
          180_000,
          "Menu analysis took too long. Please try again.",
        ).then((result) => {
          const dishCount = result.sections.reduce(
            (total, section) => total + section.items.length,
            0,
          );
          if (dishCount === 0) {
            throw new Error(
              "The website menu was found, but no dishes could be extracted. Upload the PDF or menu photos instead.",
            );
          }
          return {
            ...result,
            restaurantName,
            sourceUrl: discovered.sourceUrl,
            sourceLabel: "Restaurant website",
          };
        });
      })
      .then(async (result) => {
        await repo.setMenu(result);
        if (restaurant) {
          try {
            await restaurantMenuCache.save(restaurant, result);
          } catch (cacheError) {
            request.log.warn({ cacheError }, "Shared menu cache write failed");
          }
        }
      })
      .catch(async (error: unknown) => {
        request.log.warn({ error }, "Website menu discovery failed");
        await repo.setMenu({
          ...draft,
          restaurantName,
          sourceUrl: normalizedWebsite,
          sourceLabel: "Restaurant website",
          status: "failed",
          error: error instanceof Error
            ? error.message
            : "No readable menu was found. Upload the menu instead.",
        });
      });
    return reply.code(202).send({
      ...draft,
      restaurantName,
      sourceUrl: normalizedWebsite,
      sourceLabel: "Restaurant website",
    });
  });

  app.post("/v1/menus/analyses", async (request, reply) => {
    const uploads: Array<{ filename: string; mimetype: string; buffer: Buffer }> = [];
    let restaurantName = "";
    let sourceUrl: string | undefined;
    let restaurant: RestaurantCandidate | undefined;
    for await (const part of request.parts()) {
      if (part.type === "file") {
        uploads.push({
          filename: part.filename,
          mimetype: part.mimetype,
          buffer: await part.toBuffer(),
        });
      } else if (part.fieldname === "restaurantName" && typeof part.value === "string") {
        restaurantName = part.value.trim().slice(0, 200);
      } else if (part.fieldname === "sourceUrl" && typeof part.value === "string") {
        try {
          const parsed = new URL(part.value);
          if (["http:", "https:"].includes(parsed.protocol)) sourceUrl = parsed.toString();
        } catch {
          sourceUrl = undefined;
        }
      } else if (part.fieldname === "restaurant" && typeof part.value === "string") {
        try {
          const parsed = restaurantCandidateSchema.safeParse(JSON.parse(part.value));
          if (parsed.success) restaurant = parsed.data;
        } catch {
          restaurant = undefined;
        }
      }
    }
    if (uploads.length === 0) {
      return reply.code(400).send({ code: "FILES_REQUIRED", message: "Upload at least one menu file." });
    }

    const draft = await repo.createMenu();
    let sourceFiles: Awaited<ReturnType<MenuSourceStore["save"]>> = [];
    try {
      sourceFiles = await menuSourceStore.save(draft.id, uploads);
    } catch (sourceError) {
      request.log.warn({ sourceError }, "Original menu source could not be saved");
    }
    const draftWithSources = { ...draft, sourceFiles };
    await repo.setMenu(draftWithSources);
    void withTimeout(
      menuAnalyzer.analyze(draftWithSources, uploads),
      180_000,
      "Menu analysis took too long. Please try again.",
    )
      .then(async (result) => {
        const completed = {
          ...result,
          restaurantName: restaurantName || result.restaurantName,
          sourceUrl,
          sourceLabel: sourceUrl ? "Restaurant website and saved menu" : result.sourceLabel,
        };
        await repo.setMenu(completed);
        if (restaurant) {
          try {
            await restaurantMenuCache.save(restaurant, completed);
          } catch (cacheError) {
            request.log.warn({ cacheError }, "Shared menu cache write failed");
          }
        }
      })
      .catch(async (error: unknown) => {
        request.log.warn({ error }, "Menu analysis failed");
        await repo.setMenu({
          ...draft,
          status: "failed",
          error: friendlyMenuError(error),
        });
      });
    return reply.code(202).send(draftWithSources);
  });

  app.get("/v1/menus/recent", async (request) => {
    try {
      return await restaurantMenuCache.list(12);
    } catch (error) {
      request.log.warn({ error }, "Shared menu cache read failed");
      return [];
    }
  });

  app.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    "/v1/menus/analyses/:id",
    async (request, reply) => {
      const menu = await repo.getMenu(
        request.params.id,
        request.query.token ?? "",
      );
      if (!menu) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Menu draft not found." });
      }
      return menu;
    },
  );

  app.patch<{
    Params: { id: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/analyses/:id", async (request, reply) => {
    const parsed = menuPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_MENU", issues: parsed.error.issues });
    }
    const menu = await repo.updateMenu(request.params.id, request.query.token ?? "", parsed.data);
    if (!menu) return reply.code(404).send({ code: "NOT_FOUND", message: "Menu draft not found." });
    return menu;
  });

  app.post<{
    Params: { id: string };
    Querystring: { token?: string };
  }>("/v1/menus/:id/publish", async (request, reply) => {
    const menu = await repo.publishMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      return reply.code(409).send({ code: "NOT_READY", message: "Review the menu before publishing." });
    }
    return menu;
  });

  app.post<{
    Params: { id: string };
    Querystring: { token?: string; highAccuracy?: string };
  }>("/v1/menus/:id/reanalyze", async (request, reply) => {
    let menu = await repo.getMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      menu = await repo.getPublicMenu(request.params.id);
    }
    if (!menu) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Menu not found." });
    }

    const sourceFiles = menu.sourceFiles || [];
    const uploads = await loadSourcesFromStore(menuSourceStore, menu.id, sourceFiles);
    if (uploads.length === 0) {
      return reply.code(400).send({
        code: "NO_SOURCES",
        message: "No original source files available to reanalyze. Please upload the menu photos or PDF.",
      });
    }

    const processingDraft = { ...menu, status: "processing" as const, error: undefined };
    await repo.setMenu(processingDraft);

    try {
      const highAccuracy = request.query.highAccuracy !== "false";
      const analyzed = await withTimeout(
        menuAnalyzer.analyze(processingDraft, uploads, { highAccuracy }),
        180_000,
        "Menu reanalysis took too long. Please try again.",
      );
      await repo.setMenu(analyzed);
      if (menu.restaurantName) {
        try {
          await restaurantMenuCache.save(
            {
              id: menu.id,
              name: menu.restaurantName,
              address: menu.sourceLabel || "",
              latitude: 0,
              longitude: 0,
              mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(menu.restaurantName)}`,
              provider: "curated",
            },
            analyzed,
          );
        } catch (cacheError) {
          request.log.warn({ cacheError }, "Shared menu cache reanalysis write failed");
        }
      }
      return reply.send(analyzed);
    } catch (reanalysisError) {
      const errorMsg = reanalysisError instanceof Error ? reanalysisError.message : "Reanalysis failed.";
      const failedDraft = { ...menu, status: "failed" as const, error: errorMsg };
      await repo.setMenu(failedDraft);
      return reply.code(500).send({ code: "ANALYSIS_FAILED", message: errorMsg });
    }
  });

  app.get<{ Params: { slug: string } }>("/v1/public/menus/:slug", async (request, reply) => {
    const menu = await repo.getPublicMenu(request.params.slug);
    if (!menu) return reply.code(404).send({ code: "NOT_FOUND", message: "Public menu not found." });
    const { editToken: _private, ...publicMenu } = menu;
    return publicMenu;
  });

  app.post<{
    Params: { id: string; dishId: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/:id/dishes/:dishId/feedback", async (request, reply) => {
    const parsed = dishFeedbackRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_FEEDBACK", issues: parsed.error.issues });
    }
    const { verdict, rawNote, targetModification } = parsed.data;

    let menu = await repo.getMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      menu = await repo.getPublicMenu(request.params.id);
    }
    if (!menu) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Menu not found." });
    }

    let foundItem: any;
    let foundSectionIndex = -1;
    let foundItemIndex = -1;

    for (let sIdx = 0; sIdx < menu.sections.length; sIdx++) {
      const section = menu.sections[sIdx];
      if (!section) continue;
      const iIdx = section.items.findIndex((item) => item.id === request.params.dishId);
      if (iIdx !== -1) {
        foundItem = section.items[iIdx];
        foundSectionIndex = sIdx;
        foundItemIndex = iIdx;
        break;
      }
    }

    if (!foundItem || foundSectionIndex === -1 || foundItemIndex === -1) {
      return reply.code(404).send({ code: "DISH_NOT_FOUND", message: "Dish not found in this menu." });
    }

    const polished = await dishFeedbackPolisher.polishDishFeedback({
      dishName: foundItem.name || foundItem.originalName,
      dishDescription: foundItem.description,
      verdict,
      rawNote,
      targetModification,
    });

    const updatedDish = {
      ...foundItem,
      verdict,
      reason: polished.reason,
      reasonCa: polished.reasonCa,
      modificationNote: polished.modificationNote,
      modificationNoteCa: polished.modificationNoteCa,
      modifiableTo: targetModification,
      modifications: polished.modifications.length > 0 ? polished.modifications : foundItem.modifications,
    };

    const newSections = menu.sections.map((section, sIdx) => {
      if (sIdx !== foundSectionIndex) return section;
      return {
        ...section,
        items: section.items.map((item, iIdx) => (iIdx === foundItemIndex ? updatedDish : item)),
      };
    });

    const updatedMenu = {
      ...menu,
      sections: newSections,
    };

    await repo.setMenu(updatedMenu);

    return { menu: updatedMenu, updatedDish };
  });

  app.post<{
    Params: { id: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/:id/notes", async (request, reply) => {
    const parsed = restaurantNotesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_NOTES", issues: parsed.error.issues });
    }

    let menu = await repo.getMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      menu = await repo.getPublicMenu(request.params.id);
    }
    if (!menu) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Menu not found." });
    }

    const polished = await dishFeedbackPolisher.polishRestaurantNotes(parsed.data.rawNotes);

    const updatedMenu = {
      ...menu,
      communityNotes: polished.communityNotes,
      communityNotesCa: polished.communityNotesCa,
    };

    await repo.setMenu(updatedMenu);

    return updatedMenu;
  });
}
