import { rm } from "node:fs/promises";

for (const path of ["apps/api/dist", "apps/web/dist", "packages/domain/dist"]) {
  await rm(path, { recursive: true, force: true });
}
