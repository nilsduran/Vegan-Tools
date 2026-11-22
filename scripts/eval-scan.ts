/**
 * @file eval-scan.ts
 * @description Accuracy of the scanner on real cases (eval/scan-cases.json): barcodes
 * through the full product route (Open Facts + rule engine), links and descriptions
 * through the universal analyzer, cosmetics brands through the cruelty-free lookup, and
 * photos listed in eval/photos/manifest.json when present.
 *
 * Uses real Gemini and Open Facts calls, so it is run on demand (when a prompt, model or
 * provider changes), not on every pull request. The number that must stay at zero is
 * "false vegan": something with animal use reported as vegan or probably vegan.
 *
 *   npm run eval:scan                # everything
 *   npm run eval:scan -- coverage    # one group: coverage | barcodes | links | descriptions | brands | photos
 *   npm run eval:scan -- --json out.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env"), quiet: true });
config({ path: resolve(root, "apps/api/.env"), quiet: true });
try {
  // In a git worktree, the keys live in the main checkout.
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir", { cwd: root }).toString().trim();
  config({ path: resolve(common, "..", ".env"), quiet: true });
} catch {
  // Not a git checkout: environment variables only.
}
// Never write evaluation traffic to production: no Supabase here (stores and usage counters stay in memory).
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;

type Expect = "vegan" | "vegetarian" | "non_vegetarian" | "not_vegan" | "doubtful";
type Group = "vegan" | "vegetarian" | "non_vegetarian" | "unknown";

interface Outcome {
  group: string;
  name: string;
  expect?: string;
  got: string;
  subject?: string;
  subjectOk?: boolean;
  status: "correct" | "wrong" | "false_vegan" | "abstained" | "error";
  detail?: string;
}

const NON_FOOD = new Set(["clothing", "activity", "place", "cosmetic", "other"]);

function groupOf(verdict: string): Group {
  if (verdict === "vegan" || verdict === "probably_vegan") return "vegan";
  if (verdict === "vegetarian" || verdict === "probably_vegetarian") return "vegetarian";
  if (verdict === "non_vegetarian") return "non_vegetarian";
  return "unknown";
}

/** Scores one verdict against the expectation. */
export function score(expect: Expect | undefined, verdict: string, subject?: string): Outcome["status"] {
  const group = groupOf(verdict);
  if (!expect) return "correct";
  const animal = expect === "vegetarian" || expect === "non_vegetarian" || expect === "not_vegan";
  if (animal && group === "vegan") return "false_vegan";
  if (expect === "doubtful") return verdict === "vegan" ? "false_vegan" : "correct";
  if (group === "unknown") return "abstained";
  if (expect === "not_vegan") return group === "vegetarian" || group === "non_vegetarian" ? "correct" : "wrong";
  if (expect === "non_vegetarian" && subject && NON_FOOD.has(subject)) {
    return group === "vegetarian" || group === "non_vegetarian" ? "correct" : "wrong";
  }
  return group === expect ? "correct" : "wrong";
}

async function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : undefined;
  const only = args.find((arg, index) => !arg.startsWith("--") && (jsonIndex < 0 || index !== jsonIndex + 1));

  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set: links, descriptions, brands and photos will fail.");
  }

  const cases = JSON.parse(readFileSync(resolve(root, "eval/scan-cases.json"), "utf8"));
  const { buildApp } = await import("../apps/api/src/app.js");
  const { MemoryRepository } = await import("../apps/api/src/store.js");
  const { GeminiUniversalAnalyzer } = await import("../apps/api/src/universal-analyzer.js");
  const analyzer = new GeminiUniversalAnalyzer();
  const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: analyzer, disableRateLimit: true });
  const outcomes: Outcome[] = [];
  const run = (group: string) => !only || only === group;

  if (run("coverage")) {
    const { lookupOpenFoodFacts } = await import("../apps/api/src/open-food-facts.ts");
    const { lookupOpenBeautyFacts } = await import("../apps/api/src/open-beauty-facts.ts");
    const { lookupOpenProductsFacts } = await import("../apps/api/src/open-products-facts.ts");
    const coverageRows: string[] = [];
    for (const item of cases.coverage ?? []) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      const databases = await Promise.all([
        lookupOpenFoodFacts(item.gtin).catch(() => undefined),
        lookupOpenBeautyFacts(item.gtin).catch(() => undefined),
        lookupOpenProductsFacts(item.gtin).catch(() => undefined),
      ]);
      const names = ["OFF", "OBF", "OPF"];
      const found = databases.flatMap((record, index) => (record ? [names[index]] : []));
      const withIngredients = databases.flatMap((record, index) =>
        record?.evidence.some((evidence) => evidence.ingredientsText?.trim()) ? [names[index]] : [],
      );
      const res = await app.inject({ method: "GET", url: `/v1/products/${item.gtin}` });
      const body = res.json() as { verdict?: string; category?: string; reason?: string; evidence?: Array<{ sourceType: string }> };
      const viaWeb = Boolean(body.evidence?.some((evidence) => evidence.sourceType === "automated_extraction"));
      coverageRows.push(
        `${item.gtin}  in: ${found.join("+") || "none"}  ingredients: ${withIngredients.join("+") || "none"}  web search: ${viaWeb ? "yes" : "no"}  category: ${body.category ?? "-"}  ${item.name}`,
      );
      outcomes.push({
        group: "coverage",
        name: item.name,
        expect: item.expect,
        got: body.verdict ?? `HTTP ${res.statusCode}`,
        status: body.verdict ? score(item.expect, body.verdict, body.category === "beauty" ? "cosmetic" : undefined) : "error",
        detail: body.reason,
      });
    }
    console.log("Coverage (products chosen first, then looked up):");
    for (const row of coverageRows) console.log(`  ${row}`);
    console.log("");
  }

  if (run("barcodes")) {
    for (const item of cases.barcodes) {
      // Open Food Facts asks for gentle request rates.
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      const res = await app.inject({ method: "GET", url: `/v1/products/${item.gtin}` });
      const body = res.json() as { verdict?: string; category?: string; reason?: string };
      const got = body.verdict ?? `HTTP ${res.statusCode}`;
      outcomes.push({
        group: "barcodes",
        name: item.name,
        expect: item.expect,
        got,
        subject: body.category,
        status: body.verdict ? score(item.expect, body.verdict) : "error",
        detail: body.reason,
      });
    }
  }

  const judge = async (group: string, name: string, item: { expect?: Expect; subject?: string[] }, call: () => Promise<{ verdict: string; subject: string; reason: string }>) => {
    try {
      const result = await call();
      outcomes.push({
        group,
        name,
        expect: item.expect,
        got: result.verdict,
        subject: result.subject,
        subjectOk: item.subject ? item.subject.includes(result.subject) : undefined,
        status: score(item.expect, result.verdict, result.subject),
        detail: result.reason,
      });
    } catch (error) {
      outcomes.push({ group, name, expect: item.expect, got: "error", status: "error", detail: String(error instanceof Error ? error.message : error) });
    }
  };

  if (run("links")) {
    for (const item of cases.links) {
      await judge("links", item.name, item, async () => {
        const res = await app.inject({ method: "POST", url: "/v1/scan/url", payload: { url: item.url, language: "en" } });
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}: ${(res.json() as { message?: string }).message ?? ""}`);
        return res.json();
      });
    }
  }

  if (run("descriptions")) {
    for (const item of cases.descriptions) {
      await judge("descriptions", item.text.slice(0, 60), item, () => analyzer.analyzeText({ text: item.text }, "en"));
    }
  }

  if (run("photos")) {
    const manifestPath = resolve(root, "eval/photos/manifest.json");
    const photos = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : cases.photos;
    for (const item of photos as Array<{ file: string; expect?: Expect; subject?: string[] }>) {
      const file = resolve(root, "eval/photos", item.file);
      if (!existsSync(file)) continue;
      const mimetype = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
      await judge("photos", item.file, item, () => analyzer.analyzeImage({ mimetype, buffer: readFileSync(file) }, "en"));
    }
  }

  if (run("brands")) {
    for (const item of cases.brands) {
      try {
        const result = await analyzer.findBrandEthics(item.brand, "en");
        const status: Outcome["status"] =
          item.expect === "not_cruelty_free" && result.status === "cruelty_free"
            ? "false_vegan"
            : result.status === "unknown"
              ? "abstained"
              : (item.expect === "cruelty_free") === (result.status === "cruelty_free")
                ? "correct"
                : "wrong";
        outcomes.push({ group: "brands", name: item.brand, expect: item.expect, got: result.status, status, detail: result.summary });
      } catch (error) {
        outcomes.push({ group: "brands", name: item.brand, expect: item.expect, got: "error", status: "error", detail: String(error) });
      }
    }
  }

  await app.close();

  for (const outcome of outcomes) {
    const mark = { correct: "OK  ", wrong: "MISS", false_vegan: "FAIL", abstained: "??  ", error: "ERR " }[outcome.status];
    const subject = outcome.subjectOk === false ? ` [subject: ${outcome.subject}]` : "";
    console.log(`${mark} ${outcome.group.padEnd(12)} ${outcome.name.slice(0, 58).padEnd(58)} expected ${String(outcome.expect ?? "-").padEnd(16)} got ${outcome.got}${subject}`);
    if (outcome.status !== "correct" && outcome.detail) console.log(`       ${outcome.detail.slice(0, 160)}`);
  }

  console.log("\nGroup         cases  correct  wrong  abstained  errors  false vegan  subject ok");
  const groups = [...new Set(outcomes.map((outcome) => outcome.group))];
  for (const group of [...groups, "TOTAL"]) {
    const list = outcomes.filter((outcome) => group === "TOTAL" || outcome.group === group);
    const count = (status: Outcome["status"]) => list.filter((outcome) => outcome.status === status).length;
    const withSubject = list.filter((outcome) => outcome.subjectOk !== undefined);
    const subjectOk = withSubject.length ? `${withSubject.filter((outcome) => outcome.subjectOk).length}/${withSubject.length}` : "-";
    console.log(
      `${group.padEnd(13)} ${String(list.length).padStart(5)}  ${String(count("correct")).padStart(7)}  ${String(count("wrong")).padStart(5)}  ${String(count("abstained")).padStart(9)}  ${String(count("error")).padStart(6)}  ${String(count("false_vegan")).padStart(11)}  ${subjectOk.padStart(10)}`,
    );
  }

  if (jsonPath) writeFileSync(resolve(process.cwd(), jsonPath), JSON.stringify({ ranAt: new Date().toISOString(), outcomes }, null, 2));
  process.exitCode = outcomes.some((outcome) => outcome.status === "false_vegan") ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
