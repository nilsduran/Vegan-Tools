/**
 * @file classifier.ts
 * @description Rule-based ingredient classification engine. It knows the hand-written
 * dictionary plus the Open Food Facts animal lexicon (animal-lexicon.ts); see
 * docs/benchmark-results.md for measured coverage.
 * Performs diacritic/text normalization, regex-based ingredient alias matching,
 * and deterministic diet verdict resolution (vegan, vegetarian, non-vegetarian, unknown).
 */

import { INGREDIENT_DICTIONARY, type IngredientDefinition } from "./ingredient-dictionary.js";
import { scanAnimalTerms, toLexiconTerm } from "./animal-lexicon.js";
import type {
  Assurance,
  DietVerdict,
  IngredientFinding,
} from "./schemas.js";

export const CLASSIFIER_VERSION = "2026.11.2";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\be[\s-]+(?=\d)/g, "e");
}

function containsAlias(text: string, alias: string): boolean {
  const escaped = normalizeText(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

export function lookupIngredients(text: string): IngredientFinding[] {
  const normalized = normalizeText(text);
  return INGREDIENT_DICTIONARY.flatMap((definition): IngredientFinding[] => {
    const searchable = (definition.exclusions ?? []).reduce((value, exclusion) => {
      const escaped = normalizeText(exclusion).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return value.replace(new RegExp(escaped, "gi"), " ");
    }, normalized);
    const aliases = [...definition.aliases].sort((a, b) => b.length - a.length);
    const matchedAlias = aliases.find((alias) => containsAlias(searchable, alias));
    if (!matchedAlias) return [];
    return [{
      id: definition.id,
      name: definition.name,
      matchedAlias,
      status: definition.status,
      reason: definition.reason,
      eNumber: definition.eNumber,
      substitutions: definition.substitutions ?? [],
    }];
  });
}

const overlaps = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);

/**
 * Merges the hand-written dictionary with the Open Food Facts animal lexicon:
 * drops dictionary hits on words that name a plant-based product ("llet" in
 * "llet de coco"), and adds animal terms the dictionary does not know.
 */
function mergeWithAnimalLexicon(text: string, dictionary: IngredientFinding[]): IngredientFinding[] {
  const { matches, shielded } = scanAnimalTerms(text);
  const kept = dictionary.filter((finding) => {
    if (finding.status === "vegan") return true;
    const alias = toLexiconTerm(finding.matchedAlias);
    const namesPlantProduct = shielded.some((term) => overlaps(term, alias));
    return !namesPlantProduct || matches.some(({ term }) => overlaps(term, alias));
  });
  const keptAliases = kept.map((finding) => toLexiconTerm(finding.matchedAlias));
  const added = matches
    .filter(({ term }) => !keptAliases.some((alias) => overlaps(term, alias)))
    .map(({ term, status }): IngredientFinding => ({
      id: `off:${term}`,
      name: term.charAt(0).toUpperCase() + term.slice(1),
      matchedAlias: term,
      status,
      reason: status === "non_vegetarian"
        ? "Open Food Facts lists this as an ingredient from a slaughtered animal."
        : "Open Food Facts lists this as an animal-derived ingredient (dairy, egg or bee product).",
      substitutions: [],
    }));
  return [...kept, ...added];
}

export function getIngredientDefinition(id: string): IngredientDefinition | undefined {
  return INGREDIENT_DICTIONARY.find((definition) => definition.id === id);
}

export function splitTraces(text: string): { ingredients: string; traces: string[] } {
  const tracePattern =
    /(?:may (?:also )?contain(?: traces of)?|traces? of|manufactured (?:in a facility|on equipment)[^.:;]*|made in a (?:factory|facility)[^.:;]*|packed in a facility[^.:;]*|pot contenir(?: traces de)?|traces? de|elaborat en una (?:fàbrica|línia|instal·lació)[^.:;]*|puede contener(?: trazas de)?|trazas? (?:de|posibles)|posibles trazas de|fabricado en[^.:;]*|kann (?:produktionsbedingt )?spuren (?:enthalten )?von|spuren von|hergestellt in einem betrieb[^.:;]*|peut contenir(?: des traces d[e'])?|traces? (?:d[e']|éventuelles d[e'])|fabriqué dans un atelier[^.:;]*|pu[oò] contenere(?: tracce di)?|tracce di)\s*:?\s*([^.;)]*?)(?:\s+enthalten)?(?=[.;)]|$)/gi;
  const traces: string[] = [];
  const ingredients = text.replace(tracePattern, (full, captured: string) => {
    const value = (captured || full)
      .trim()
      .replace(/^[:\s]+/, "")
      .replace(/\s+enthalten$/i, "")
      .trim();
    if (value) traces.push(value);
    return " ";
  });
  return { ingredients, traces };
}

export interface Classification {
  verdict: DietVerdict;
  reason: string;
  matchedIngredients: string[];
  findings: IngredientFinding[];
  classifierVersion: string;
  traces: string[];
  definitive: boolean;
  assurance: Assurance;
}

function result(
  verdict: DietVerdict,
  reason: string,
  findings: IngredientFinding[],
  traces: string[],
  assurance: Assurance,
  definitive: boolean,
): Classification {
  return {
    verdict,
    reason,
    findings,
    matchedIngredients: findings.map((finding) => finding.name),
    classifierVersion: CLASSIFIER_VERSION,
    traces,
    assurance,
    definitive,
  };
}

export function classifyIngredients(
  text: string,
  options: {
    assurance?: Assurance;
    verifiedVeganClaim?: boolean;
    verifiedVegetarianClaim?: boolean;
  } = {},
): Classification {
  const { ingredients, traces } = splitTraces(text);
  const assurance = options.assurance ?? "unverified";
  const trusted = ["certified", "manufacturer", "label_based"].includes(assurance);
  const meaningfulText = ingredients
    .replace(/ingredients?|ingredientes?|zutaten|ingr[eé]dients?|ingredienti|composici[oó]|[:\s,.;()[\]{}-]/gi, "")
    .trim();

  if (meaningfulText.length < 2) {
    return result(
      "unknown",
      "No readable ingredient list was provided.",
      [],
      traces,
      assurance,
      false,
    );
  }

  const findings = mergeWithAnimalLexicon(ingredients, lookupIngredients(ingredients));
  const nonVegetarian = findings.filter((finding) => finding.status === "non_vegetarian");
  const vegetarian = findings.filter((finding) => finding.status === "vegetarian");
  const ambiguous = findings.filter((finding) => finding.status === "ambiguous");

  if (nonVegetarian.length > 0) {
    return result(
      "non_vegetarian",
      `Contains ${nonVegetarian.map((finding) => finding.name).join(", ")}.`,
      [...nonVegetarian, ...vegetarian, ...ambiguous],
      traces,
      assurance,
      trusted,
    );
  }

  if (vegetarian.length > 0) {
    if (options.verifiedVeganClaim && trusted) {
      return result(
        "unknown",
        "The vegan claim conflicts with animal-derived ingredients on the label. Check the current package.",
        vegetarian,
        traces,
        assurance,
        false,
      );
    }
    return result(
      "vegetarian",
      `Vegetarian but not vegan: contains ${vegetarian.map((finding) => finding.name).join(", ")}.`,
      [...vegetarian, ...ambiguous],
      traces,
      assurance,
      trusted,
    );
  }

  if (options.verifiedVeganClaim && trusted) {
    return result(
      "vegan",
      ambiguous.length > 0
        ? "A trusted vegan claim resolves ingredients whose origin would otherwise be ambiguous."
        : "A trusted source confirms the vegan claim and no conflicting ingredient was found.",
      ambiguous,
      traces,
      assurance,
      true,
    );
  }

  if (options.verifiedVegetarianClaim && trusted) {
    return result(
      "vegetarian",
      "A trusted source confirms that the product is vegetarian, but not that it is vegan.",
      ambiguous,
      traces,
      assurance,
      true,
    );
  }

  if (ambiguous.length > 0) {
    return result(
      "probably_vegetarian",
      `No clearly non-vegetarian ingredient was found, but the origin of ${ambiguous.map((finding) => finding.name).join(", ")} needs confirmation.`,
      ambiguous,
      traces,
      assurance,
      false,
    );
  }

  // Recognising nothing is not evidence of anything: the dictionary is small, so
  // an unmatched list (e.g. "Schweinefleisch, Speck") must never become a
  // definitive "vegan". Only a trusted vegan claim, handled above, can do that.
  return result(
    "probably_vegan",
    "No animal-derived ingredient was recognised, but not every ingredient on the list could be verified.",
    findings.filter((finding) => finding.status === "vegan"),
    traces,
    assurance,
    false,
  );
}
