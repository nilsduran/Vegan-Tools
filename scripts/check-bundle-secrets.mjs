import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../apps/web/dist/", import.meta.url));
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if ([".js", ".html", ".css", ".json"].includes(extname(entry.name))) files.push(path);
  }
}

await collect(root);
const bundle = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
const configuredSecrets = [
  process.env.GEMINI_API_KEY,
  process.env.SUPABASE_SECRET_KEY,
].filter((value) => value && value.length >= 8);
const leakedConfiguredSecret = configuredSecrets.some((secret) => bundle.includes(secret));
const googleApiKeyPattern = /AIza[0-9A-Za-z_-]{30,}/;

if (leakedConfiguredSecret || googleApiKeyPattern.test(bundle)) {
  throw new Error("A server-side credential appears in the web bundle.");
}

console.log(`Secret scan passed (${files.length} bundle files checked).`);
