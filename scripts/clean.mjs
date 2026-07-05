import { rm } from "node:fs/promises";

for (const path of [
  "apps/api/dist",
  "apps/web/dist",
  "apps/web/tsconfig.tsbuildinfo",
  "packages/domain/dist",
]) {
  await rm(path, { recursive: true, force: true });
}
