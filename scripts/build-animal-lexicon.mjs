// Builds packages/domain/src/data/animal-lexicon.json from the Open Food Facts
// ingredient taxonomy (data/dataset/raw/ingredients.json, not committed).
//
// Unlike build-taxonomy-index.py, diet status is inherited through `parents`:
// OFF tags "fish" as non-vegetarian but leaves "cod" untagged.
//
// Output (all terms normalised like classifier.ts: no diacritics, lowercase,
// tokens joined by single spaces):
//   n: terms from slaughter (non-vegetarian)
//   v: terms from dairy, eggs, bees (vegetarian, not vegan)
//   s: "shields", vegan terms that contain an animal term ("almond milk"), so
//      the longest match wins and the animal term inside is not reported.
//
// usage: node scripts/build-animal-lexicon.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(resolve(root, "data/dataset/raw/ingredients.json"), "utf-8"));
const outFile = resolve(root, "packages/domain/src/data/animal-lexicon.json");

const LANGUAGES = ["ca", "es", "en", "fr", "de", "it"];
const MAX_WORDS = 5;

// Terms OFF lists under an animal entity that are too generic to flag on their own.
const BLOCKLIST = new Set([
  "animal", "animals", "tier", "tiere", "animale", "animali", "animaux", "animales",
  "fat", "fett", "grasa", "greix", "graisse", "grasso", "gordura",
  "extract", "extrakt", "stock", "broth", "fond", "aroma", "flavour", "flavor",
  "protein", "proteina", "proteine", "proteines",
  // Cross-language collisions: fr "os" (bone) is a common word elsewhere.
  "os",
  // it "sole" (sun, as in sun-dried), en "rind" (citrus peel) vs de "Rind", and
  // obscure fish names that are ordinary words in another language.
  "sole", "rind", "spot", "ling", "vive", "ente", "bull",
  // ca "cocció" (cooking) collides with it "coccio".
  "coccio",
  // es "huesos de albaricoque" are apricot kernels.
  "hueso", "huesos",
  // Adjectives, not ingredients: lactic acid and lactic ferments are not dairy.
  "lactic", "lactico", "lactica", "lactique", "lactiques", "lattico", "lattici",
]);

export function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(" ");
}

function ownStatus(entry) {
  const vegetarian = entry.vegetarian?.en;
  const vegan = entry.vegan?.en;
  if (vegetarian === "no") return "n";
  if (vegan === "no" && vegetarian === "yes") return "v";
  if (vegan === "no") return "v"; // not vegan, vegetarian status untagged: at least dairy/egg level
  if (vegan === "yes") return "s";
  if (vegan === "maybe" || vegetarian === "maybe") return "maybe";
  return undefined;
}

const memo = new Map();
function status(id, seen = new Set()) {
  if (memo.has(id)) return memo.get(id);
  const entry = raw[id];
  if (!entry || seen.has(id)) return undefined;
  seen.add(id);
  let result = ownStatus(entry);
  if (result === undefined) {
    const inherited = (entry.parents ?? []).map((parent) => status(parent, seen));
    if (inherited.includes("n")) result = "n";
    else if (inherited.includes("v")) result = "v";
    else if (inherited.includes("maybe")) result = "maybe";
    else if (inherited.length > 0 && inherited.every((value) => value === "s")) result = "s";
  }
  memo.set(id, result);
  return result;
}

const terms = { n: new Set(), v: new Set(), s: new Set() };
for (const [id, entry] of Object.entries(raw)) {
  const kind = status(id);
  if (kind !== "n" && kind !== "v" && kind !== "s") continue;
  for (const language of LANGUAGES) {
    const name = entry.name?.[language];
    if (typeof name !== "string") continue;
    const term = normalize(name);
    const words = term.split(" ");
    if (term.length < 2 || /^\d+$/.test(term) || words.length > MAX_WORDS) continue;
    if (kind !== "s" && BLOCKLIST.has(term)) continue;
    terms[kind].add(term);
  }
}

// Common label terms the taxonomy has no entry for.
for (const term of [
  "huhnerfleisch", "hahnchenfleisch", "putenfleisch", "entenfleisch", "kalbfleisch",
  "lammfleisch", "hackfleisch", "wildfleisch", "fischfilet",
]) terms.n.add(term);
for (const term of ["yoghurt", "yoghourt", "yogur", "yogurt", "joghurt", "iogurt"]) terms.v.add(term);

// A term tagged both ways across entities is treated as the more severe one.
for (const term of terms.n) { terms.v.delete(term); terms.s.delete(term); }
for (const term of terms.v) terms.s.delete(term);

// Keep only shields that actually contain an animal term as a word sequence.
const animal = new Set([...terms.n, ...terms.v]);
const shields = [...terms.s].filter((term) => {
  const words = term.split(" ");
  for (let start = 0; start < words.length; start++) {
    for (let end = start + 1; end <= words.length; end++) {
      if (end - start === words.length) continue;
      if (animal.has(words.slice(start, end).join(" "))) return true;
    }
  }
  return false;
});

const output = {
  source: "Open Food Facts ingredients taxonomy (ODbL)",
  languages: LANGUAGES,
  n: [...terms.n].sort(),
  v: [...terms.v].sort(),
  s: shields.sort(),
};
writeFileSync(outFile, JSON.stringify(output) + "\n", "utf-8");
console.log(`non-vegetarian: ${output.n.length}, vegetarian: ${output.v.length}, shields: ${output.s.length}`);
console.log(`written ${outFile} (${(JSON.stringify(output).length / 1024).toFixed(0)} kB)`);
