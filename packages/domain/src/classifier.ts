import { INGREDIENT_DICTIONARY, type IngredientDefinition } from "./ingredient-dictionary.js";
import type {
  Assurance,
  DietVerdict,
  IngredientFinding,
} from "./schemas.js";

export const CLASSIFIER_VERSION = "2026.07.3";

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

export function getIngredientDefinition(id: string): IngredientDefinition | undefined {
  return INGREDIENT_DICTIONARY.find((definition) => definition.id === id);
}

export function splitTraces(text: string): { ingredients: string; traces: string[] } {
  const tracePattern =
    /(?:may (?:also )?contain|traces? of|manufactured in a facility[^.:;]*|pot contenir|traces? de|puede contener|trazas? de)\s*:?\s*([^.;]*)/gi;
  const traces: string[] = [];
  const ingredients = text.replace(tracePattern, (full, captured: string) => {
    const value = (captured || full).trim().replace(/^[:\s]+/, "");
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
    .replace(/ingredients?|ingredientes?|ingredients?|composici[oó]|[:\s,.;()[\]{}-]/gi, "")
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

  const findings = lookupIngredients(ingredients);
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

  const completeIngredientEvidence = [
    "external",
    "label_based",
    "manufacturer",
    "certified",
  ].includes(assurance);
  return result(
    completeIngredientEvidence ? "vegan" : "probably_vegan",
    completeIngredientEvidence
      ? "The provided ingredient list contains no animal-derived or origin-ambiguous ingredient."
      : "No animal-derived or origin-ambiguous ingredient was detected, but the ingredient evidence is incomplete.",
    findings.filter((finding) => finding.status === "vegan"),
    traces,
    assurance,
    trusted,
  );
}
