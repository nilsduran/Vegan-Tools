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
} from "@vegan-tools/domain";
import { randomUUID } from "node:crypto";
import { repository, type Repository } from "./store.js";
import { lookupOpenFoodFacts } from "./open-food-facts.js";
import { GeminiMenuAnalyzer, type MenuAnalyzer } from "./menu-analyzer.js";
import {
  GeminiIngredientExtractor,
  type IngredientExtractor,
} from "./ingredient-extractor.js";

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
  if (/took too long|timeout/i.test(message)) {
    return "Menu analysis took too long. Please try again with a clear image.";
  }
  return "Menu analysis failed. Please try again or use a clearer image.";
}

export async function buildApp(
  repo: Repository = repository,
  menuAnalyzer: MenuAnalyzer = new GeminiMenuAnalyzer(),
  ingredientExtractor: IngredientExtractor = new GeminiIngredientExtractor(),
) {
  const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN?.split(",") ?? true,
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

  app.get<{ Params: { gtin: string } }>("/v1/products/:gtin", async (request, reply) => {
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin)) {
      return reply.code(400).send({ code: "INVALID_GTIN", message: "Invalid GTIN check digit." });
    }

    const cached = await repo.getProduct(gtin);
    if (cached) return cached;

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
    for await (const part of request.files()) {
      uploads.push({
        filename: part.filename,
        mimetype: part.mimetype,
        buffer: await part.toBuffer(),
      });
    }
    if (uploads.length === 0) {
      return reply.code(400).send({ code: "FILES_REQUIRED", message: "Upload at least one menu file." });
    }

    const draft = await repo.createMenu();
    void withTimeout(
      menuAnalyzer.analyze(draft, uploads),
      20_000,
      "Menu analysis took too long. Please try again.",
    )
      .then((result) => repo.setMenu(result))
      .catch(async (error: unknown) => {
        await repo.setMenu({
          ...draft,
          status: "failed",
          error: friendlyMenuError(error),
        });
      });
    return reply.code(202).send(draft);
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
