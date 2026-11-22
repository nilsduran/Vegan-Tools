/**
 * @file products.ts
 * @description API routes for product queries, Open Food Facts integration, OCR label extraction, and ingredient classification.
 * Supports barcode verification, user evidence submissions, and rule-based ingredient classification.
 */

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  classifyIngredients,
  CLASSIFIER_VERSION,
  isValidGtin,
  normalizeGtin,
  type Evidence,
  type ProductResult,
} from "@vegan-tools/domain";
import type { Repository } from "../store.js";
import { lookupOpenFoodFacts } from "../open-food-facts.js";
import { lookupOpenBeautyFacts } from "../open-beauty-facts.js";
import { lookupOpenProductsFacts } from "../open-products-facts.js";
import type { IngredientExtractor } from "../ingredient-extractor.js";
import { authenticateRequest, createTokenVerifier, type TokenVerifier } from "../auth.js";

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

export interface ProductRoutesOptions {
  repo: Repository;
  ingredientExtractor: IngredientExtractor;
  verifyToken?: TokenVerifier;
}

export async function productRoutes(app: FastifyInstance, options: ProductRoutesOptions) {
  const { repo, ingredientExtractor } = options;
  const verifyToken = options.verifyToken ?? createTokenVerifier();

  app.get<{ Params: { gtin: string } }>("/v1/products/:gtin", async (request, reply) => {
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin)) {
      return reply.code(400).send({ code: "INVALID_GTIN", message: "Invalid GTIN check digit." });
    }

    const cached = await repo.getProduct(gtin);
    if (cached?.classifierVersion === CLASSIFIER_VERSION) return cached;

    // The three databases are asked at once (a barcode is in at most one of
    // them in practice) and food wins over cosmetics over other products.
    const lookups = await Promise.allSettled([
      lookupOpenFoodFacts(gtin),
      lookupOpenBeautyFacts(gtin),
      lookupOpenProductsFacts(gtin),
    ]);
    for (const lookup of lookups) {
      if (lookup.status === "rejected") {
        request.log.warn({ error: lookup.reason }, "Open Facts lookup failed");
      }
    }
    const product = lookups
      .map((lookup) => (lookup.status === "fulfilled" ? lookup.value : undefined))
      .find((candidate): candidate is ProductResult => Boolean(candidate));
    if (product) {
      await repo.saveProduct(product);
      return product;
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
    if (!(await authenticateRequest(request, verifyToken))) {
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

  app.post("/v1/ingredients/extract", { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } }, async (request, reply) => {
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
        if (!product) {
          product = await lookupOpenBeautyFacts(gtin);
        }
        if (product) await repo.saveProduct(product);
      }
      if (!product?.ingredientsImageUrl) {
        return reply.code(404).send({
          code: "INGREDIENT_IMAGE_MISSING",
          message: "No ingredient-label image was found for this product.",
        });
      }

      try {
        const url = new URL(product.ingredientsImageUrl);
        const isAllowedHost =
          url.hostname === "openfoodfacts.org" ||
          url.hostname.endsWith(".openfoodfacts.org") ||
          url.hostname === "openbeautyfacts.org" ||
          url.hostname.endsWith(".openbeautyfacts.org");
        if (url.protocol !== "https:" || !isAllowedHost) {
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
}
