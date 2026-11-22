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

export interface LikelyMisreading {
  /** The word as read from the photo. */
  word: string;
  /** The animal ingredient it is one or two letters away from. */
  term: string;
  status: AnimalTermMatch["status"];
}

const CONFUSABLE = [new Set(["i", "l", "1", "t", "j", "f"]), new Set(["c", "e", "o", "0"]), new Set(["u", "v"]), new Set(["n", "h"])];

function confusable(a: string, b: string): boolean {
  return CONFUSABLE.some((group) => group.has(a) && group.has(b));
}

/**
 * Whether `word` is `term` with one typical OCR reading error: a dropped letter, a
 * doubled letter, two swapped neighbours, "rn" read for "m", or one visually
 * confusable letter (l/i/1/t, c/e/o, u/v, n/h). Unlike plain edit distance this
 * ignores real words a letter apart ("boisson"/"poisson", "frisch"/"fisch").
 */
export function isOcrLikeVariant(word: string, term: string): boolean {
  if (word === term) return false;
  if (word.length === term.length - 1) {
    for (let i = 0; i < term.length; i += 1) if (term.slice(0, i) + term.slice(i + 1) === word) return true;
    return false;
  }
  if (word.length === term.length + 1) {
    for (let i = 1; i < word.length; i += 1) {
      if (word[i] === word[i - 1] && word.slice(0, i) + word.slice(i + 1) === term) return true;
    }
    return word.replace("rn", "m") === term;
  }
  if (word.length !== term.length) return false;
  const diffs: number[] = [];
  for (let i = 0; i < word.length; i += 1) if (word[i] !== term[i]) diffs.push(i);
  if (diffs.length === 1) return confusable(word[diffs[0]!]!, term[diffs[0]!]!);
  if (diffs.length === 2 && diffs[1] === diffs[0]! + 1) {
    return word[diffs[0]!] === term[diffs[1]!] && word[diffs[1]!] === term[diffs[0]!];
  }
  return false;
}

/** Real words in label languages that are one OCR-like error away from an animal term. */
const REAL_WORD_COLLISIONS = new Set(["roggen"]);

let singleWordTerms: Array<{ term: string; status: AnimalTermMatch["status"] }> | undefined;

/**
 * Words from a photographed label that look like a misread animal ingredient
 * ("gelatna", "lactosse", "beurrre"): long words (6+ letters) one typical OCR error
 * away from a known single-word term (isOcrLikeVariant). Words that are themselves
 * known (animal, plant-shield or vegan qualifier) are never reported. Only for OCR
 * text: typed text does not have reading errors.
 */
export function findLikelyMisreadings(text: string, extraTerms: AnimalTermMatch[] = []): LikelyMisreading[] {
  singleWordTerms ??= [
    ...lexicon.n.filter((term) => !term.includes(" ")).map((term) => ({ term, status: "non_vegetarian" as const })),
    ...lexicon.v.filter((term) => !term.includes(" ")).map((term) => ({ term, status: "vegetarian" as const })),
  ];
  const candidates = [...singleWordTerms, ...extraTerms.filter((entry) => !entry.term.includes(" "))]
    .filter((entry) => entry.term.length >= 5);
  const found = new Map<string, LikelyMisreading>();
  for (const tokens of toSegments(text)) {
    for (const word of tokens) {
      if (word.length < 6 || found.has(word)) continue;
      if (statusOf(word) || statusOf(singular(word)) || shieldTerms.has(word)) continue;
      if (VEGAN_QUALIFIERS.has(word) || PLANT_QUALIFIERS.has(word) || REAL_WORD_COLLISIONS.has(word)) continue;
      for (const entry of candidates) {
        if (Math.abs(entry.term.length - word.length) > 1) continue;
        if (isOcrLikeVariant(word, entry.term)) {
          found.set(word, { word, term: entry.term, status: entry.status });
          break;
        }
      }
    }
  }
  return [...found.values()];
}
