/**
 * @file animal-lexicon.ts
 * @description Finds animal-derived ingredient names using a multilingual lexicon
 * generated from the Open Food Facts taxonomy (scripts/build-animal-lexicon.mjs).
 * It widens the coverage of the hand-written dictionary: fish species, cured
 * meats, cheeses, and German and Italian terms.
 */

import lexiconData from "./data/animal-lexicon.json" with { type: "json" };

export interface AnimalTermMatch {
  term: string;
  status: "non_vegetarian" | "vegetarian";
}

const lexicon = lexiconData as { n: string[]; v: string[]; s: string[] };
const nonVegetarianTerms = new Set(lexicon.n);
const vegetarianTerms = new Set(lexicon.v);
const shieldTerms = new Set(lexicon.s);
const MAX_WORDS = 5;

// "vegan cheese", "carn vegetal", "pflanzliche Wurst": the animal word names a plant-based product.
const VEGAN_QUALIFIERS = new Set([
  "vegan", "vegana", "vegano", "vegans", "veganes", "veganos", "vegane", "veganer", "veganes",
  "vega", "vegetal", "vegetals", "vegetale", "vegetali", "vegetales", "vegetaux", "vegetalien",
  "plant", "pflanzlich", "pflanzliche", "pflanzlicher", "pflanzliches",
]);

// "llet de civada", "peanut butter", "burro di cacao": plant milks, butters and creams.
const PLANT_QUALIFIERS = new Set([
  "soja", "soy", "soya", "soia",
  "civada", "avena", "oat", "oats", "avoine", "hafer",
  "ametlla", "ametlles", "almendra", "almendras", "almond", "almonds", "amande", "amandes", "mandel", "mandorla", "mandorle",
  "coco", "coconut", "cocco", "kokos",
  "arros", "arroz", "rice", "riz", "riso", "reis",
  "cacau", "cacao", "cocoa", "kakao",
  "cacauet", "cacauets", "cacahuete", "cacahuetes", "peanut", "peanuts", "arachide", "arachidi", "cacahuet", "erdnuss",
  "avellana", "avellanes", "avellanas", "hazelnut", "noisette", "noisettes", "nocciola", "nocciole", "haselnuss",
  "anacard", "anacards", "anacardo", "anacardos", "cashew", "cashews", "cajou",
  "karite", "shea", "espelta", "spelt", "epeautre", "pesol", "pesols", "pea", "guisante",
]);

// "carn de soja", "soy meat": meat words that name a plant protein.
const MEAT_ANALOGUE_QUALIFIERS = new Set(["soja", "soy", "soya", "soia", "seitan", "tofu"]);

const CONNECTORS = new Set(["de", "d", "di", "of", "du", "des", "aus"]);

export interface AnimalTermScan {
  /** Animal-derived terms found in the text. */
  matches: AnimalTermMatch[];
  /** Animal words that turned out to name a plant-based product ("llet" in "llet de coco"). */
  shielded: string[];
}

function statusOf(term: string | undefined): AnimalTermMatch["status"] | undefined {
  if (!term) return undefined;
  if (nonVegetarianTerms.has(term)) return "non_vegetarian";
  if (vegetarianTerms.has(term)) return "vegetarian";
  return undefined;
}

// The taxonomy mostly lists singulars: "honeys", "cheeses", it "vongole", "formaggi".
// Short words are left alone ("Eis" is not "Ei").
function singular(token: string): string | undefined {
  if (token.length < 5) return undefined;
  const stem = token.slice(0, -1);
  const candidates = token.endsWith("es")
    ? [stem, token.slice(0, -2)]
    : token.endsWith("s")
      ? [stem]
      : token.endsWith("e")
        ? [`${stem}a`]
        : token.endsWith("i")
          ? [`${stem}o`, `${stem}e`, `${token}o`]
          : [];
  return candidates.find((candidate) => statusOf(candidate) !== undefined);
}

// German compounds are open-ended ("Leberwurst", "Putenschinken"); the taxonomy
// cannot list them all. "Fruchtfleisch" and "Tomatenfleisch" are fruit pulp.
const GERMAN_MEAT_SUFFIX = /(?:fleisch|wurst|wurstchen|schinken)$/;
const GERMAN_PLANT_PART = /frucht|tomate|soja|veg|tofu|seitan|pflanz|kokos|gemuse|weizen|erbsen|oliven|kurbis/;
function isGermanMeatCompound(token: string): boolean {
  return token.length > 7 && GERMAN_MEAT_SUFFIX.test(token) && !GERMAN_PLANT_PART.test(token);
}

function normalizeTokens(segment: string): string[] {
  // Bare numbers are percentages ("iogurt 100% vegetal"); they carry no ingredient.
  return segment.split(/[^a-z0-9]+/).filter((token) => token && !/^\d+$/.test(token));
}

function toSegments(text: string): string[][] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    // Ingredient separators: a term never spans two ingredients.
    .split(/[,;:()[\]{}./•|*\n]+/)
    .map(normalizeTokens)
    .filter((tokens) => tokens.length > 0);
}

function isPlantBased(
  tokens: string[],
  start: number,
  end: number,
  status: AnimalTermMatch["status"],
): boolean {
  const isQualifier = (token: string | undefined) =>
    token !== undefined &&
    (VEGAN_QUALIFIERS.has(token) ||
      (status === "vegetarian" ? PLANT_QUALIFIERS : MEAT_ANALOGUE_QUALIFIERS).has(token));
  // "plant-based meat": skip over "based".
  const before = tokens[start - 1] === "based" ? tokens[start - 2] : tokens[start - 1];
  const after = tokens[end];
  const afterConnector = after !== undefined && CONNECTORS.has(after) ? tokens[end + 1] : undefined;
  return isQualifier(before) || isQualifier(after) || isQualifier(afterConnector);
}

export function scanAnimalTerms(text: string): AnimalTermScan {
  const matches = new Map<string, AnimalTermMatch>();
  const shielded = new Set<string>();
  for (const tokens of toSegments(text)) {
    let index = 0;
    while (index < tokens.length) {
      let consumed = 1;
      // Longest match first, so "cocoa butter" wins over "butter".
      for (let length = Math.min(MAX_WORDS, tokens.length - index); length >= 1; length--) {
        const term = tokens.slice(index, index + length).join(" ");
        if (shieldTerms.has(term)) {
          shielded.add(term);
          consumed = length;
          break;
        }
        const status = statusOf(term) ??
          (length === 1
            ? statusOf(singular(term)) ?? (isGermanMeatCompound(term) ? "non_vegetarian" : undefined)
            : undefined);
        if (!status) continue;
        if (isPlantBased(tokens, index, index + length, status)) {
          shielded.add(term);
        } else {
          matches.set(term, { term, status });
        }
        consumed = length;
        break;
      }
      index += consumed;
    }
  }
  return { matches: [...matches.values()], shielded: [...shielded] };
}

export function findAnimalTerms(text: string): AnimalTermMatch[] {
  return scanAnimalTerms(text).matches;
}

/** Normalises a term the same way the lexicon is stored: plain tokens joined by spaces. */
export function toLexiconTerm(value: string): string {
  return toSegments(value).map((tokens) => tokens.join(" ")).join(" ");
}
