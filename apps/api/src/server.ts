import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { createRepositoryFromEnvironment } from "./store.js";
import { createRestaurantMenuCacheFromEnvironment } from "./restaurant-menu-cache.js";
import { createMenuSourceStoreFromEnvironment } from "./menu-source-store.js";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

const app = await buildApp(
  createRepositoryFromEnvironment(),
  undefined,
  undefined,
  undefined,
  undefined,
  createRestaurantMenuCacheFromEnvironment(),
  createMenuSourceStoreFromEnvironment(),
);
const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: "0.0.0.0" });
