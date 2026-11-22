/** Looks one barcode up through the real product pipeline: npx tsx scripts/try-product.ts <gtin> */
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

const common = execSync("git rev-parse --path-format=absolute --git-common-dir").toString().trim();
config({ path: resolve(common, "..", ".env"), quiet: true });
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;

const { buildApp } = await import("../apps/api/src/app.ts");
const { MemoryRepository } = await import("../apps/api/src/store.ts");
const app = await buildApp({ repo: new MemoryRepository(), disableRateLimit: true });
const res = await app.inject({ method: "GET", url: `/v1/products/${process.argv[2]}` });
const body = res.json();
console.log(JSON.stringify({ ...body, evidence: body.evidence?.map((e: { sourceName: string; sourceUrl?: string; ingredientsText?: string }) => ({ ...e, ingredientsText: e.ingredientsText?.slice(0, 160) })) }, null, 2));
await app.close();
