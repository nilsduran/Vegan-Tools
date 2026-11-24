/**
 * @file eval-menu-links.ts
 * @description Runs the links in eval/menu-links.json through the scanner's real flow
 * against a running API: menu-looking addresses go to the menu reader, the rest to
 * the link check, and "not a menu" falls back to the link check, as the web does.
 * Reports whether each real menu was read and whether each curveball was rejected.
 *
 * Spends Gemini quota (one or two calls per link). Start an API without Supabase
 * (in-memory stores) so nothing is written to production, then:
 *   API_URL=http://localhost:3002 npx tsx scripts/eval-menu-links.ts [index]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyScannedCode, NOT_A_MENU_ERROR } from "../packages/domain/src/index.ts";

const API = process.env.API_URL ?? "http://localhost:3001";
const { cases } = JSON.parse(readFileSync(resolve(import.meta.dirname, "../eval/menu-links.json"), "utf8")) as {
  cases: Array<{ menu: boolean; url: string }>;
};
const only = process.argv[2] === undefined ? undefined : Number(process.argv[2]);

async function post(path: string, body: unknown) {
  const response = await fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status, data: (await response.json()) as Record<string, any> };
}

/** "menu:<dishes>", "not-a-menu" or "failed:<reason>". */
async function readMenu(url: string): Promise<string> {
  const created = await post("/v1/menus/discover", { websiteUrl: url, restaurantName: "" });
  if (!created.ok) return `failed:${created.status} ${created.data.message ?? ""}`;
  let draft = created.data;
  for (let poll = 0; draft.status === "processing" && poll < 120; poll += 1) {
    await new Promise((done) => setTimeout(done, 2000));
    draft = (await (await fetch(`${API}/v1/menus/analyses/${draft.id}?token=${encodeURIComponent(draft.editToken)}`)).json()) as Record<string, any>;
  }
  if (draft.error === NOT_A_MENU_ERROR) return "not-a-menu";
  const dishes = (draft.sections ?? []).reduce((total: number, section: { items?: unknown[] }) => total + (section.items?.length ?? 0), 0);
  return dishes > 0 ? `menu:${dishes}` : `failed:${String(draft.error ?? draft.status).slice(0, 80)}`;
}

/** "menu:<dishes>", "not-a-menu" (with what the link check said) or "failed:<reason>". */
async function scan(url: string): Promise<string> {
  if (classifyScannedCode(url).kind === "menu_url") {
    const menu = await readMenu(url);
    if (menu !== "not-a-menu") return menu;
  }
  const link = await post("/v1/scan/url", { url, language: "ca" });
  if (!link.ok) return `failed:${link.status} ${link.data.message ?? ""}`;
  if (link.data.menuUrl) {
    const menu = await readMenu(link.data.menuUrl);
    return menu === "not-a-menu" ? "not-a-menu (shown as not a restaurant menu)" : menu;
  }
  return `not-a-menu (${link.data.subject}, ${link.data.verdict})`;
}

let menusRead = 0;
let menus = 0;
let rejected = 0;
let curveballs = 0;
for (const [index, item] of cases.entries()) {
  if (only !== undefined && index !== only) continue;
  const started = Date.now();
  const outcome = await scan(item.url).catch((error: Error) => `failed:${error.message}`);
  const right = item.menu ? outcome.startsWith("menu:") : outcome.startsWith("not-a-menu");
  if (item.menu) {
    menus += 1;
    if (right) menusRead += 1;
  } else {
    curveballs += 1;
    if (right) rejected += 1;
  }
  console.log(`${String(index).padStart(2)} ${right ? "ok  " : "MISS"} ${item.menu ? "menu" : "not "} ${String(Math.round((Date.now() - started) / 1000)).padStart(4)}s  ${outcome.slice(0, 70).padEnd(70)} ${item.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}`);
}
console.log(`\nReal menus read: ${menusRead}/${menus}. Curveballs rejected: ${rejected}/${curveballs}.`);
