/**
 * @file app.ts
 * @description Central Fastify application factory (`buildApp`).
 * Configures global middleware (CORS, multipart, Swagger documentation), dependency injection,
 * and mounts modular route controllers (location, recipes, products, reviews, restaurants, menus).
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { repository, type Repository } from "./store.js";
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
import {
  GeminiDishFeedbackPolisher,
  type DishFeedbackPolisher,
} from "./dish-feedback-polisher.js";
import {
  createRestaurantReviewStore,
  type RestaurantReviewStore,
} from "./restaurant-review-store.js";
import {
  createRestaurantVisitStore,
  type RestaurantVisitStore,
} from "./restaurant-visit-store.js";

// Domain route modules
import { locationRoutes } from "./routes/location.js";
import { recipeRoutes } from "./routes/recipes.js";
import { productRoutes } from "./routes/products.js";
import { reviewRoutes } from "./routes/reviews.js";
import { restaurantRoutes } from "./routes/restaurants.js";
import { menuRoutes } from "./routes/menus.js";
import { visitRoutes } from "./routes/visits.js";

// Re-export routes and helpers for external consumers & tests
export * from "./routes/location.js";
export * from "./routes/recipes.js";
export * from "./routes/products.js";
export * from "./routes/reviews.js";
export * from "./routes/restaurants.js";
export * from "./routes/menus.js";
export * from "./routes/visits.js";
export * from "./restaurant-visit-store.js";

export interface AppDependencies {
  repo?: Repository;
  menuAnalyzer?: MenuAnalyzer;
  ingredientExtractor?: IngredientExtractor;
  menuDiscoverer?: MenuDiscoverer;
  restaurantWebsiteFinder?: RestaurantWebsiteFinder;
  restaurantMenuCache?: RestaurantMenuCache;
  menuSourceStore?: MenuSourceStore;
  dishFeedbackPolisher?: DishFeedbackPolisher;
  reviewStore?: RestaurantReviewStore;
  visitStore?: RestaurantVisitStore;
  disableRateLimit?: boolean;
  rateLimitMax?: number;
}

export async function buildApp(
  depsOrRepo?: AppDependencies | Repository,
  menuAnalyzerArg?: MenuAnalyzer,
  ingredientExtractorArg?: IngredientExtractor,
  menuDiscovererArg?: MenuDiscoverer,
  restaurantWebsiteFinderArg?: RestaurantWebsiteFinder,
  restaurantMenuCacheArg?: RestaurantMenuCache,
  menuSourceStoreArg?: MenuSourceStore,
  dishFeedbackPolisherArg?: DishFeedbackPolisher,
  restaurantReviewStoreArg?: RestaurantReviewStore,
  restaurantVisitStoreArg?: RestaurantVisitStore,
) {
  // Check if first argument is an AppDependencies object or a Repository instance
  const isDepsObject =
    depsOrRepo &&
    typeof depsOrRepo === "object" &&
    !("createMenu" in depsOrRepo);

  const deps: AppDependencies = isDepsObject
    ? (depsOrRepo as AppDependencies)
    : {
        repo: depsOrRepo as Repository | undefined,
        menuAnalyzer: menuAnalyzerArg,
        ingredientExtractor: ingredientExtractorArg,
        menuDiscoverer: menuDiscovererArg,
        restaurantWebsiteFinder: restaurantWebsiteFinderArg,
        restaurantMenuCache: restaurantMenuCacheArg,
        menuSourceStore: menuSourceStoreArg,
        dishFeedbackPolisher: dishFeedbackPolisherArg,
        reviewStore: restaurantReviewStoreArg,
        visitStore: restaurantVisitStoreArg,
      };

  const repo = deps.repo ?? repository;
  const menuAnalyzer = deps.menuAnalyzer ?? new GeminiMenuAnalyzer();
  const ingredientExtractor = deps.ingredientExtractor ?? new GeminiIngredientExtractor();
  const menuDiscoverer = deps.menuDiscoverer ?? new WebsiteMenuDiscoverer();
  const restaurantWebsiteFinder = deps.restaurantWebsiteFinder ?? new GoogleSearchRestaurantWebsiteFinder();
  const restaurantMenuCache = deps.restaurantMenuCache ?? new MemoryRestaurantMenuCache();
  const menuSourceStore = deps.menuSourceStore ?? new MemoryMenuSourceStore();
  const dishFeedbackPolisher = deps.dishFeedbackPolisher ?? new GeminiDishFeedbackPolisher();
  const reviewStore = deps.reviewStore ?? createRestaurantReviewStore();
  const visitStore = deps.visitStore ?? createRestaurantVisitStore();

  const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024, trustProxy: true });

  const normalizeCorsOrigin = (origin: string) =>
    origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  const configuredOrigins = process.env.WEB_ORIGIN
    ?.split(",")
    .map(normalizeCorsOrigin)
    .filter(Boolean) ?? [];
  const productionWebOrigins = [
    "https://vegantools.org",
    "https://www.vegantools.org",
    "https://vegan-tools.onrender.com",
  ];
  const allowedOrigins = new Set([...configuredOrigins, ...productionWebOrigins]);
  const loopbackOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
  const privateLanOrigin =
    /^https?:\/\/(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeCorsOrigin(origin);
      const isAllowed =
        allowedOrigins.has(normalizedOrigin) ||
        loopbackOrigin.test(normalizedOrigin) ||
        privateLanOrigin.test(normalizedOrigin);
      callback(null, isAllowed);
    },
  });

  // ── Rate limiting ─────────────────────────────────────────────────────
  // Global default: 100 requests per minute per IP.
  // AI-heavy routes get stricter per-route overrides (registered below)
  // to prevent cost abuse on Gemini / Geoapify.
  // In tests, disabled by default to avoid flakiness unless explicitly enabled via { disableRateLimit: false }.
  const isTestEnv = process.env.NODE_ENV === "test";
  const disableRateLimit = deps.disableRateLimit ?? isTestEnv;

  if (!disableRateLimit) {
    await app.register(rateLimit, {
      max: deps.rateLimitMax ?? 100,
      timeWindow: "1 minute",
      allowList: (req) => {
        const url = req.url ?? "";
        return url === "/health" || url.startsWith("/docs");
      },
      addHeadersOnExceeding: { "x-ratelimit-limit": true, "x-ratelimit-remaining": true, "x-ratelimit-reset": true },
      addHeaders: { "x-ratelimit-limit": true, "x-ratelimit-remaining": true, "x-ratelimit-reset": true, "retry-after": true },
    });
  }

  await app.register(multipart, {
    limits: { files: 8, fileSize: 10 * 1024 * 1024 },
  });

  await app.register(swagger, {
    openapi: {
      info: { title: "Vegan Tools API", version: "0.1.0" },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/", async () => ({
    name: "Vegan Tools API",
    status: "ok",
    health: "/health",
  }));

  app.get("/health", async (_request, reply) => {
    return reply
      .type("text/plain; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send("ok");
  });

  // RFC 9116 — Security vulnerability disclosure
  app.get("/.well-known/security.txt", async (_request, reply) => {
    return reply
      .type("text/plain; charset=utf-8")
      .header("Cache-Control", "public, max-age=86400")
      .send(
        [
          "# Vegan Tools Security Policy",
          "# https://securitytxt.org/ — RFC 9116",
          "",
          "Contact: mailto:nils@vegantools.org",
          "Preferred-Languages: ca, en, es",
          "Canonical: https://vegan-tools-api.onrender.com/.well-known/security.txt",
          "Expires: 2027-10-01T00:00:00.000Z",
          "",
        ].join("\n"),
      );
  });

  // Register modular route plugins
  await locationRoutes(app);
  await recipeRoutes(app);
  await productRoutes(app, { repo, ingredientExtractor });
  await reviewRoutes(app, { reviewStore });
  await restaurantRoutes(app, { restaurantWebsiteFinder, restaurantMenuCache });
  await menuRoutes(app, {
    repo,
    menuAnalyzer,
    menuDiscoverer,
    restaurantWebsiteFinder,
    restaurantMenuCache,
    menuSourceStore,
    dishFeedbackPolisher,
  });
  await visitRoutes(app, { visitStore });

  return app;
}
