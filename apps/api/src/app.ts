import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  classifyIngredients,
  CLASSIFIER_VERSION,
  isValidGtin,
  menuPatchSchema,
  normalizeGtin,
  veganizeRecipe,
  type Evidence,
  type ProductResult,
  type RestaurantCandidate,
  restaurantCandidateSchema,
} from "@vegan-tools/domain";
import { randomUUID } from "node:crypto";
import { repository, type Repository } from "./store.js";
import { lookupOpenFoodFacts } from "./open-food-facts.js";
import { GeminiMenuAnalyzer, type MenuAnalyzer } from "./menu-analyzer.js";
import {
  GeminiIngredientExtractor,
  type IngredientExtractor,
} from "./ingredient-extractor.js";
import {
  WebsiteMenuDiscoverer,
  type MenuDiscoverer,
} from "./menu-discovery.js";
import {
  GoogleSearchRestaurantWebsiteFinder,
  type RestaurantWebsiteFinder,
} from "./restaurant-website-finder.js";
import {
  MemoryRestaurantMenuCache,
  type RestaurantMenuCache,
} from "./restaurant-menu-cache.js";
import {
  MemoryMenuSourceStore,
  type MenuSourceStore,
} from "./menu-source-store.js";

const FOURSQUARE_RESTAURANT_CATEGORY = "4d4b7105d754a06374d81259";

async function withTimeout<T>(
  operation: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function friendlyMenuError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/503|unavailable|high demand|overload/i.test(message)) {
    return "The menu reader is temporarily busy. Please try again in a moment.";
  }
  if (/429|resource_exhausted|quota/i.test(message)) {
    return "The menu analysis quota is temporarily exhausted. Please try again later.";
  }
  if (/404|not found|not supported/i.test(message)) {
    return "The configured Gemini model is unavailable. Check GEMINI_MODEL on the API server.";
  }
  if (/took too long|timeout/i.test(message)) {
    return "Menu analysis took too long. Please try again with a clear image.";
  }
  return "Menu analysis failed. Please try again or use a clearer image.";
}

export async function buildApp(
  repo: Repository = repository,
  menuAnalyzer: MenuAnalyzer = new GeminiMenuAnalyzer(),
  ingredientExtractor: IngredientExtractor = new GeminiIngredientExtractor(),
  menuDiscoverer: MenuDiscoverer = new WebsiteMenuDiscoverer(),
  restaurantWebsiteFinder: RestaurantWebsiteFinder =
    new GoogleSearchRestaurantWebsiteFinder(),
  restaurantMenuCache: RestaurantMenuCache = new MemoryRestaurantMenuCache(),
  menuSourceStore: MenuSourceStore = new MemoryMenuSourceStore(),
) {
  const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });
  const restaurantSearchCache = new Map<
    string,
    { expiresAt: number; results: RestaurantCandidate[] }
  >();
  let lastNominatimRequestAt = 0;
  const waitForNominatim = async () => {
    const remaining = 1_000 - (Date.now() - lastNominatimRequestAt);
    if (remaining > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
    }
    lastNominatimRequestAt = Date.now();
  };
  const configuredOrigins = process.env.WEB_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const loopbackOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
  await app.register(cors, {
    origin: configuredOrigins.length > 0
      ? [...configuredOrigins, loopbackOrigin]
      : true,
  });
  await app.register(multipart, {
    limits: { files: 8, fileSize: 10 * 1024 * 1024 },
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Vegan Tools API", version: "0.1.0" },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => ({ status: "ok" }));

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

  app.get<{
    Querystring: {
      q?: string;
      near?: string;
      autocomplete?: string;
      sessionToken?: string;
      latitude?: string;
      longitude?: string;
    };
  }>(
    "/v1/restaurants/search",
    async (request, reply) => {
      const query = request.query.q?.trim();
      if (!query || query.length < 2) {
        return reply.code(400).send({
          code: "QUERY_REQUIRED",
          message: "Enter at least two characters of the restaurant name.",
        });
      }

      const foursquareKey = process.env.FOURSQUARE_API_KEY?.trim();
      const defaultNear =
        process.env.DEFAULT_RESTAURANT_NEAR?.trim() || "Barcelona";
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const hasLocation =
        Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
      const cacheKey = [
        foursquareKey ? "foursquare" : "openstreetmap",
        request.query.autocomplete === "true" ? "autocomplete" : "search",
        query.toLocaleLowerCase(),
        request.query.near?.trim().toLocaleLowerCase() ?? "",
        hasLocation ? `${latitude},${longitude}` : "",
      ].join("|");
      const cachedSearch = restaurantSearchCache.get(cacheKey);
      if (cachedSearch && cachedSearch.expiresAt > Date.now()) {
        return cachedSearch.results;
      }
      let inferredTextNear = "";
      let inferredRestaurantQuery = query;
      if (
        request.query.autocomplete !== "true" &&
        !request.query.near?.trim() &&
        !hasLocation &&
        !query.includes(",")
      ) {
        const words = query.split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          for (const suffixLength of [2, 1]) {
            if (words.length <= suffixLength) continue;
            const possibleLocality = words.slice(-suffixLength).join(" ");
            try {
              const localityUrl = new URL(
                "https://nominatim.openstreetmap.org/search",
              );
              localityUrl.search = new URLSearchParams({
                q: possibleLocality,
                format: "jsonv2",
                limit: "1",
                addressdetails: "0",
                layer: "address",
              }).toString();
              await waitForNominatim();
              const localityResponse = await fetch(localityUrl, {
                headers: {
                  "User-Agent":
                    process.env.NOMINATIM_USER_AGENT ??
                    process.env.OFF_USER_AGENT ??
                    "VeganTools/0.1 (https://nilsduran.github.io)",
                  Accept: "application/json",
                },
                signal: AbortSignal.timeout(5_000),
              });
              if (!localityResponse.ok) continue;
              const localities = await localityResponse.json() as Array<{
                addresstype?: string;
                type?: string;
              }>;
              const localityType =
                localities[0]?.addresstype ?? localities[0]?.type;
              if (
                localityType &&
                ["city", "town", "village", "municipality"].includes(localityType)
              ) {
                inferredTextNear = possibleLocality;
                inferredRestaurantQuery = words.slice(0, -suffixLength).join(" ");
                break;
              }
            } catch {
              // Location inference is optional; normal provider search remains available.
            }
          }
        }
      }
      if (!foursquareKey && request.query.autocomplete === "true") {
        return reply.code(503).send({
          code: "AUTOCOMPLETE_PROVIDER_REQUIRED",
          message:
            "Live suggestions require Foursquare. Press Enter to search OpenStreetMap instead.",
        });
      }
      if (foursquareKey) {
        if (request.query.autocomplete === "true") {
          const sessionToken = request.query.sessionToken?.trim();
          if (!sessionToken || !/^[a-zA-Z0-9]{32}$/.test(sessionToken)) {
            return reply.code(400).send({
              code: "INVALID_SESSION_TOKEN",
              message: "A valid autocomplete session token is required.",
            });
          }
          const url = new URL("https://places-api.foursquare.com/places/search");
          url.search = new URLSearchParams({
            query,
            fsq_category_ids: FOURSQUARE_RESTAURANT_CATEGORY,
            limit: "8",
            fields: "fsq_place_id,name,location,latitude,longitude,website",
            ...(request.query.near?.trim()
              ? { near: request.query.near.trim() }
              : hasLocation
              ? { ll: `${latitude},${longitude}`, radius: "30000" }
              : defaultNear
              ? { near: defaultNear }
              : {}),
          }).toString();
          try {
            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${foursquareKey}`,
                "X-Places-Api-Version": "2025-06-17",
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(8_000),
            });
            if (!response.ok) {
              throw new Error(`Foursquare suggestion search failed (${response.status}).`);
            }
            const payload = await response.json() as {
              results?: Array<{
                fsq_place_id?: string;
                name?: string;
                latitude?: number;
                longitude?: number;
                website?: string;
                location?: { formatted_address?: string };
              }>;
            };
            const candidates = (payload.results ?? [])
              .map((item): RestaurantCandidate | undefined => {
                const id = item.fsq_place_id;
                const name = item.name;
                if (!id || !name) return undefined;
                let websiteUrl: string | undefined;
                try {
                  const website = item.website ? new URL(item.website) : undefined;
                  if (website && ["http:", "https:"].includes(website.protocol)) {
                    websiteUrl = website.toString();
                  }
                } catch {
                  websiteUrl = undefined;
                }
                return {
                  id: `foursquare-${id}`,
                  name,
                  address: item.location?.formatted_address ?? "",
                  latitude: Number(item.latitude ?? 0),
                  longitude: Number(item.longitude ?? 0),
                  websiteUrl,
                  mapUrl: `https://foursquare.com/v/${id}`,
                  provider: "foursquare" as const,
                };
              })
              .filter((item): item is RestaurantCandidate => item !== undefined);
            restaurantSearchCache.set(cacheKey, {
              expiresAt: Date.now() + 2 * 60_000,
              results: candidates,
            });
            return candidates;
          } catch (error) {
            request.log.warn({ error }, "Foursquare autocomplete failed");
            return reply.code(503).send({
              code: "AUTOCOMPLETE_UNAVAILABLE",
              message: "Live restaurant suggestions are temporarily unavailable.",
            });
          }
        }

        const commaParts = query.split(",").map((part) => part.trim()).filter(Boolean);
        const inferredNear = request.query.near?.trim() ||
          (commaParts.length > 1
            ? commaParts.slice(1).join(", ")
            : inferredTextNear || defaultNear);
        const foursquareQuery = commaParts.length > 1
          ? commaParts[0] ?? query
          : inferredRestaurantQuery;
        const url = new URL("https://places-api.foursquare.com/places/search");
        url.search = new URLSearchParams({
          query: foursquareQuery,
          fsq_category_ids: FOURSQUARE_RESTAURANT_CATEGORY,
          ...(inferredNear ? { near: inferredNear } : {}),
          ...(!inferredNear && hasLocation
            ? { ll: `${latitude},${longitude}`, radius: "30000" }
            : {}),
          limit: "8",
          fields: "fsq_place_id,name,location,latitude,longitude,website",
        }).toString();
        try {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${foursquareKey}`,
              "X-Places-Api-Version": "2025-06-17",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8_000),
          });
          if (!response.ok) throw new Error(`Foursquare search failed (${response.status}).`);
          const payload = await response.json() as {
            results?: Array<{
              fsq_place_id?: string;
              name?: string;
              latitude?: number;
              longitude?: number;
              website?: string;
              location?: {
                formatted_address?: string;
                address?: string;
                locality?: string;
                region?: string;
                country?: string;
              };
            }>;
          };
          const candidates: RestaurantCandidate[] = (payload.results ?? [])
            .filter((item) =>
              item.fsq_place_id && item.name &&
              Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
            )
            .map((item) => {
              let websiteUrl: string | undefined;
              try {
                const parsed = item.website ? new URL(item.website) : undefined;
                if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
                  websiteUrl = parsed.toString();
                }
              } catch {
                websiteUrl = undefined;
              }
              const location = item.location;
              const address = location?.formatted_address ?? [
                location?.address,
                location?.locality,
                location?.region,
                location?.country,
              ].filter(Boolean).join(", ");
              return {
                id: `foursquare-${item.fsq_place_id}`,
                name: item.name ?? query,
                address: address || request.query.near?.trim() || "",
                latitude: item.latitude ?? 0,
                longitude: item.longitude ?? 0,
                websiteUrl,
                mapUrl: `https://foursquare.com/v/${item.fsq_place_id}`,
                provider: "foursquare" as const,
              };
            });
          restaurantSearchCache.set(cacheKey, {
            expiresAt: Date.now() + 15 * 60_000,
            results: candidates,
          });
          return candidates;
        } catch (error) {
          request.log.warn({ error }, "Foursquare restaurant search failed; using OpenStreetMap");
        }
      }

      const searchText = [
        query,
        request.query.near?.trim() || inferredTextNear || defaultNear,
      ].filter(Boolean).join(", ");
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.search = new URLSearchParams({
        q: searchText,
        format: "jsonv2",
        limit: "6",
        addressdetails: "1",
        extratags: "1",
        layer: "poi",
        ...(hasLocation
          ? {
              viewbox: `${longitude - 0.35},${latitude + 0.25},${longitude + 0.35},${latitude - 0.25}`,
              bounded: "0",
            }
          : {}),
      }).toString();

      try {
        await waitForNominatim();
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              process.env.NOMINATIM_USER_AGENT ??
              process.env.OFF_USER_AGENT ??
              "VeganTools/0.1 (https://nilsduran.github.io)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error(`OpenStreetMap search failed (${response.status}).`);
        const raw = await response.json() as Array<{
          osm_id: number;
          osm_type: "node" | "way" | "relation";
          name?: string;
          display_name: string;
          lat: string;
          lon: string;
          type?: string;
          category?: string;
          extratags?: { website?: string; "contact:website"?: string };
        }>;
        const candidates: RestaurantCandidate[] = raw
          .filter((item) =>
            ["restaurant", "cafe", "fast_food", "bar", "pub", "food_court"].includes(item.type ?? "")
          )
          .map((item) => {
            const website = item.extratags?.website ?? item.extratags?.["contact:website"];
            let websiteUrl: string | undefined;
            try {
              const parsed = website ? new URL(website) : undefined;
              if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
                websiteUrl = parsed.toString();
              }
            } catch {
              websiteUrl = undefined;
            }
            return {
              id: `${item.osm_type}-${item.osm_id}`,
              name: item.name?.trim() || item.display_name.split(",")[0]?.trim() || query,
              address: item.display_name,
              latitude: Number(item.lat),
              longitude: Number(item.lon),
              websiteUrl,
              mapUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
              provider: "openstreetmap",
            };
          });
        restaurantSearchCache.set(cacheKey, {
          expiresAt: Date.now() + 15 * 60_000,
          results: candidates,
        });
        return candidates;
      } catch (error) {
        request.log.warn({ error }, "Restaurant search failed");
        return reply.code(503).send({
          code: "RESTAURANT_SEARCH_UNAVAILABLE",
          message: "Restaurant search is temporarily unavailable. You can still upload a menu.",
        });
      }
    },
  );

  app.post<{ Body: unknown }>("/v1/restaurants/resolve", async (request, reply) => {
    const parsed = restaurantCandidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "INVALID_RESTAURANT",
        message: "The selected restaurant is invalid.",
      });
    }
    const candidate = parsed.data;
    if (candidate.provider !== "foursquare") {
      if (candidate.websiteUrl) return candidate;
      try {
        const websiteUrl = await restaurantWebsiteFinder.find(candidate);
        return websiteUrl ? { ...candidate, websiteUrl } : candidate;
      } catch (error) {
        request.log.warn({ error }, "Official website search failed");
        return candidate;
      }
    }

    const foursquareKey = process.env.FOURSQUARE_API_KEY?.trim();
    if (!foursquareKey) {
      return reply.code(503).send({
        code: "FOURSQUARE_NOT_CONFIGURED",
        message: "Foursquare is not configured on the API server.",
      });
    }
    const fsqPlaceId = candidate.id.replace(/^foursquare-/, "");
    const url = new URL("https://places-api.foursquare.com/places/search");
    url.search = new URLSearchParams({
      query: candidate.name,
      ...(candidate.latitude || candidate.longitude
        ? { ll: `${candidate.latitude},${candidate.longitude}`, radius: "1500" }
        : {}),
      limit: "8",
      fields: "fsq_place_id,name,location,latitude,longitude,website",
    }).toString();
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${foursquareKey}`,
          "X-Places-Api-Version": "2025-06-17",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`Foursquare place lookup failed (${response.status}).`);
      const payload = await response.json() as {
        results?: Array<{
          fsq_place_id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          website?: string;
          location?: {
            formatted_address?: string;
            address?: string;
            locality?: string;
            region?: string;
            country?: string;
          };
        }>;
      };
      const match = (payload.results ?? []).find(
        (item) => item.fsq_place_id === fsqPlaceId,
      ) ?? payload.results?.[0];
      if (!match?.fsq_place_id || !match.name) {
        return reply.code(404).send({
          code: "RESTAURANT_NOT_FOUND",
          message: "The selected restaurant could not be resolved.",
        });
      }
      let websiteUrl: string | undefined;
      try {
        const website = match.website ? new URL(match.website) : undefined;
        if (website && ["http:", "https:"].includes(website.protocol)) {
          websiteUrl = website.toString();
        }
      } catch {
        websiteUrl = undefined;
      }
      const location = match.location;
      if (!websiteUrl && Number.isFinite(match.latitude) && Number.isFinite(match.longitude)) {
        try {
          const latitude = Number(match.latitude);
          const longitude = Number(match.longitude);
          const osmUrl = new URL("https://nominatim.openstreetmap.org/search");
          osmUrl.search = new URLSearchParams({
            q: match.name,
            format: "jsonv2",
            limit: "5",
            addressdetails: "1",
            extratags: "1",
            layer: "poi",
            viewbox: `${longitude - 0.08},${latitude + 0.06},${longitude + 0.08},${latitude - 0.06}`,
            bounded: "1",
          }).toString();
          await waitForNominatim();
          const osmResponse = await fetch(osmUrl, {
            headers: {
              "User-Agent":
                process.env.NOMINATIM_USER_AGENT ??
                process.env.OFF_USER_AGENT ??
                "VeganTools/0.1 (https://nilsduran.github.io)",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8_000),
          });
          if (osmResponse.ok) {
            const osmResults = await osmResponse.json() as Array<{
              lat?: string;
              lon?: string;
              extratags?: { website?: string; "contact:website"?: string };
            }>;
            const closestWithWebsite = osmResults
              .map((item) => ({
                item,
                distance:
                  Math.abs(Number(item.lat) - latitude) +
                  Math.abs(Number(item.lon) - longitude),
              }))
              .filter(({ item, distance }) =>
                distance < 0.04 &&
                Boolean(item.extratags?.website ?? item.extratags?.["contact:website"])
              )
              .sort((left, right) => left.distance - right.distance)[0]?.item;
            const osmWebsite =
              closestWithWebsite?.extratags?.website ??
              closestWithWebsite?.extratags?.["contact:website"];
            if (osmWebsite) {
              const parsedWebsite = new URL(osmWebsite);
              if (["http:", "https:"].includes(parsedWebsite.protocol)) {
                websiteUrl = parsedWebsite.toString();
              }
            }
          }
        } catch (error) {
          request.log.debug({ error }, "OpenStreetMap website enrichment failed");
        }
      }
      if (!websiteUrl) {
        try {
          websiteUrl = await restaurantWebsiteFinder.find({
            ...candidate,
            name: match.name,
            address: location?.formatted_address ?? candidate.address,
            latitude: Number(match.latitude ?? candidate.latitude),
            longitude: Number(match.longitude ?? candidate.longitude),
          });
        } catch (error) {
          request.log.warn({ error }, "Official website search failed");
        }
      }
      return {
        id: `foursquare-${match.fsq_place_id}`,
        name: match.name,
        address: location?.formatted_address ?? [
          location?.address,
          location?.locality,
          location?.region,
          location?.country,
        ].filter(Boolean).join(", "),
        latitude: Number(match.latitude ?? candidate.latitude),
        longitude: Number(match.longitude ?? candidate.longitude),
        websiteUrl,
        mapUrl: `https://foursquare.com/v/${match.fsq_place_id}`,
        provider: "foursquare",
      } satisfies RestaurantCandidate;
    } catch (error) {
      request.log.warn({ error }, "Foursquare restaurant resolution failed");
      return reply.code(503).send({
        code: "RESTAURANT_RESOLUTION_UNAVAILABLE",
        message: "The selected restaurant could not be loaded. Try again.",
      });
    }
  });

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
    const restaurant = parsedRestaurant.success
      ? parsedRestaurant.data
      : undefined;
    const restaurantName =
      restaurant?.name ?? request.body?.restaurantName?.trim();
    const websiteUrl = request.body?.websiteUrl?.trim();
    if (!restaurantName || !websiteUrl) {
      return reply.code(400).send({
        code: "RESTAURANT_WEBSITE_REQUIRED",
        message: "Select a restaurant with a website or enter its official website.",
      });
    }
    let normalizedWebsite: string;
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      normalizedWebsite = parsed.toString();
    } catch {
      return reply.code(400).send({
        code: "INVALID_WEBSITE",
        message: "Enter a valid public restaurant website.",
      });
    }

    const draft = await repo.createMenu();
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

  app.get<{ Params: { gtin: string } }>("/v1/products/:gtin", async (request, reply) => {
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin)) {
      return reply.code(400).send({ code: "INVALID_GTIN", message: "Invalid GTIN check digit." });
    }

    const cached = await repo.getProduct(gtin);
    if (cached?.classifierVersion === CLASSIFIER_VERSION) return cached;

    try {
      const product = await lookupOpenFoodFacts(gtin);
      if (product) {
        await repo.saveProduct(product);
        return product;
      }
    } catch (error) {
      request.log.warn({ error }, "Open Food Facts lookup failed");
    }

    const unknown: ProductResult = {
      gtin,
      verdict: "unknown",
      assurance: "unverified",
      definitive: false,
      reason: "No trustworthy product evidence was found. Scan the current ingredient label.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: CLASSIFIER_VERSION,
      traces: [],
      revision: 1,
      evidence: [],
    };
    return unknown;
  });

  app.post<{
    Params: { gtin: string };
    Body: { ingredientsText?: string; market?: string; verifiedVeganClaim?: boolean };
  }>("/v1/products/:gtin/evidence", async (request, reply) => {
    if (!request.headers.authorization?.startsWith("Bearer ")) {
      return reply.code(401).send({ code: "AUTH_REQUIRED", message: "Sign in to submit evidence." });
    }
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin) || !request.body?.ingredientsText?.trim()) {
      return reply.code(400).send({ code: "INVALID_EVIDENCE", message: "GTIN and ingredients are required." });
    }

    const analysis = classifyIngredients(request.body.ingredientsText, {
      assurance: "label_based",
      verifiedVeganClaim: request.body.verifiedVeganClaim,
    });
    const previous = await repo.getProduct(gtin);
    const capturedAt = new Date().toISOString();
    const evidence: Evidence = {
      id: randomUUID(),
      sourceType: "package_label",
      sourceName: "User-confirmed package label",
      capturedAt,
      market: request.body.market ?? "ES",
      reviewerId: "authenticated-user",
      ingredientsText: request.body.ingredientsText,
      traces: analysis.traces,
    };
    const product: ProductResult = {
      gtin,
      productName: previous?.productName,
      brand: previous?.brand,
      imageUrl: previous?.imageUrl,
      ingredientsImageUrl: previous?.ingredientsImageUrl,
      verdict: analysis.verdict,
      assurance: analysis.assurance,
      definitive: analysis.definitive,
      reason: analysis.reason,
      matchedIngredients: analysis.matchedIngredients,
      findings: analysis.findings,
      classifierVersion: analysis.classifierVersion,
      traces: analysis.traces,
      verifiedAt: capturedAt,
      revision: (previous?.revision ?? 0) + 1,
      evidence: [...(previous?.evidence ?? []), evidence],
    };
    await repo.saveProduct(product);
    return reply.code(201).send(product);
  });

  app.post<{
    Body: {
      ingredientsText?: string;
      verifiedVeganClaim?: boolean;
      verifiedVegetarianClaim?: boolean;
    };
  }>("/v1/ingredients/classify", async (request, reply) => {
    if (!request.body?.ingredientsText?.trim()) {
      return reply.code(400).send({
        code: "INGREDIENTS_REQUIRED",
        message: "Paste a readable ingredient list.",
      });
    }
    return classifyIngredients(request.body.ingredientsText, {
      assurance: "label_based",
      verifiedVeganClaim: request.body.verifiedVeganClaim,
      verifiedVegetarianClaim: request.body.verifiedVegetarianClaim,
    });
  });

  app.post("/v1/ingredients/extract", async (request, reply) => {
    const upload = await request.file();
    if (!upload || !upload.mimetype.startsWith("image/")) {
      return reply.code(400).send({
        code: "IMAGE_REQUIRED",
        message: "Take or choose a photo of the ingredient label.",
      });
    }

    try {
      const ingredientsText = await withTimeout(
        ingredientExtractor.extract({
          mimetype: upload.mimetype,
          buffer: await upload.toBuffer(),
        }),
        30_000,
        "Photo reading took too long. Type the ingredients manually.",
      );
      return { ingredientsText };
    } catch (error) {
      return reply.code(503).send({
        code: "EXTRACTION_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Could not read this photo.",
      });
    }
  });

  app.post<{ Params: { gtin: string } }>(
    "/v1/products/:gtin/ingredients/extract",
    async (request, reply) => {
      const gtin = normalizeGtin(request.params.gtin);
      if (!isValidGtin(gtin)) {
        return reply.code(400).send({
          code: "INVALID_GTIN",
          message: "Invalid GTIN check digit.",
        });
      }

      let product = await repo.getProduct(gtin);
      if (!product?.ingredientsImageUrl) {
        product = await lookupOpenFoodFacts(gtin);
        if (product) await repo.saveProduct(product);
      }
      if (!product?.ingredientsImageUrl) {
        return reply.code(404).send({
          code: "INGREDIENT_IMAGE_MISSING",
          message: "Open Food Facts does not have an ingredient-label image for this product.",
        });
      }

      try {
        const url = new URL(product.ingredientsImageUrl);
        if (
          url.protocol !== "https:" ||
          !(url.hostname === "openfoodfacts.org" || url.hostname.endsWith(".openfoodfacts.org"))
        ) {
          throw new Error("The ingredient image source is not allowed.");
        }
        const imageResponse = await fetch(url, {
          headers: {
            "User-Agent":
              process.env.OFF_USER_AGENT ?? "VeganTools/0.1 (contact@example.com)",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!imageResponse.ok) throw new Error("The ingredient image could not be downloaded.");
        const mimetype = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
        if (!mimetype.startsWith("image/")) {
          throw new Error("Open Food Facts returned an invalid ingredient image.");
        }
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        if (buffer.byteLength > 10 * 1024 * 1024) {
          throw new Error("The ingredient image is too large.");
        }
        const ingredientsText = await withTimeout(
          ingredientExtractor.extract({ mimetype, buffer }),
          20_000,
          "Photo reading took too long. Type the ingredients manually.",
        );
        return { ingredientsText };
      } catch (error) {
        return reply.code(503).send({
          code: "EXTRACTION_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Could not read this photo.",
        });
      }
    },
  );

  app.post<{ Body: { recipeText?: string } }>(
    "/v1/recipes/veganize",
    async (request, reply) => {
      if (!request.body?.recipeText?.trim()) {
        return reply.code(400).send({
          code: "RECIPE_REQUIRED",
          message: "Paste a recipe with its ingredients.",
        });
      }
      return veganizeRecipe(request.body.recipeText);
    },
  );

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
      const menu = await repo.getMenu(request.params.id);
      if (!menu || menu.editToken !== request.query.token) {
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

  app.get<{ Params: { slug: string } }>("/v1/public/menus/:slug", async (request, reply) => {
    const menu = await repo.getPublicMenu(request.params.slug);
    if (!menu) return reply.code(404).send({ code: "NOT_FOUND", message: "Public menu not found." });
    const { editToken: _private, ...publicMenu } = menu;
    return publicMenu;
  });

  return app;
}
