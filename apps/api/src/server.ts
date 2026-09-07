/**
 * @file server.ts
 * @description API production server entry point.
 * Loads multi-level environment configurations (`.env`), instantiates persistent stores/caches,
 * initializes the Fastify app instance, and binds to the designated host and port.
 */

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { createRepositoryFromEnvironment } from "./store.js";
import { createRestaurantMenuCacheFromEnvironment } from "./restaurant-menu-cache.js";
import { createMenuSourceStoreFromEnvironment } from "./menu-source-store.js";

config();
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
});
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const app = await buildApp({
  repo: createRepositoryFromEnvironment(),
  restaurantMenuCache: createRestaurantMenuCacheFromEnvironment(),
  menuSourceStore: createMenuSourceStoreFromEnvironment(),
});

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: "0.0.0.0" });
