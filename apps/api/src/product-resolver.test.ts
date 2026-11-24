import { describe, expect, it } from "vitest";
import { CLASSIFIER_VERSION, type ProductResult } from "@vegan-tools/domain";
import { applyResearch, isDoubtfulOnly, needsResearch, pickPrimaryRecord } from "./product-resolver.js";
import { finalizeProductResearch, listAppearsInText, productCategoryOf } from "./universal-analyzer.js";

function record(overrides: Partial<ProductResult>): ProductResult {
  return {
    gtin: "8719327023839",
    verdict: "unknown",
    assurance: "external",
    definitive: false,
    reason: "",
    matchedIngredients: [],
    findings: [],
    classifierVersion: CLASSIFIER_VERSION,
    traces: [],
    revision: 1,
    evidence: [],
    ...overrides,
  };
}

const emptyFoodRecord = record({
  productName: "SPF50 Face Fluid",
  category: "food",
  evidence: [{ id: "off", sourceType: "open_food_facts", sourceName: "Open Food Facts", capturedAt: "", market: "ES", traces: [] }],
});

describe("pickPrimaryRecord", () => {
  it("prefers a record with ingredients over an empty one from a higher-priority database", () => {
    const withIngredients = record({
      category: "beauty",
      verdict: "probably_vegan",
      evidence: [{ id: "obf", sourceType: "open_beauty_facts", sourceName: "OBF", capturedAt: "", market: "ES", traces: [], ingredientsText: "Aqua, Glycerin" }],
    });
    expect(pickPrimaryRecord([emptyFoodRecord, withIngredients])).toBe(withIngredients);
  });

  it("takes the most restrictive verdict when records with data disagree", () => {
    const vegan = record({ verdict: "probably_vegan", evidence: [{ id: "a", sourceType: "open_food_facts", sourceName: "", capturedAt: "", market: "ES", traces: [], ingredientsText: "sugar" }] });
    const milk = record({ verdict: "vegetarian", evidence: [{ id: "b", sourceType: "open_beauty_facts", sourceName: "", capturedAt: "", market: "ES", traces: [], ingredientsText: "sugar, milk" }] });
    expect(pickPrimaryRecord([vegan, milk])?.verdict).toBe("vegetarian");
  });

  it("asks the web when nothing has ingredients", () => {
    expect(needsResearch(emptyFoodRecord)).toBe(true);
    expect(needsResearch(undefined)).toBe(true);
  });
});

describe("applyResearch", () => {
  const sources = [{ url: "https://brand.example/spf50", title: "brand.example" }];

  it("judges a web-found ingredient list with the rules and fixes a misfiled category", () => {
    const result = applyResearch("8719327023839", emptyFoodRecord, finalizeProductResearch(
      { found: true, productName: "SPF50 Face Fluid", brand: "Brand", category: "cosmetic", ingredientsText: "Aqua, Homosalate, Glycerin, Tocopherol", manufacturerVeganClaim: true },
      sources,
    ));
    expect(result).toMatchObject({ category: "beauty", brand: "Brand", verdict: "probably_vegan", assurance: "unverified" });
    expect(result?.evidence.at(-1)).toMatchObject({ sourceType: "automated_extraction", sourceUrl: sources[0]!.url });
  });

  it("finds animal ingredients in a web-found cosmetic list", () => {
    const result = applyResearch("1", undefined, finalizeProductResearch(
      { found: true, productName: "Lip balm", category: "cosmetic", ingredientsText: "Cera Alba, Lanolin, Ricinus Communis Seed Oil" },
      sources,
    ));
    expect(result?.verdict).not.toMatch(/vegan/);
  });

  it("ignores an answer without web sources (possible invention)", () => {
    const research = finalizeProductResearch({ found: true, productName: "X", ingredientsText: "water" }, []);
    expect(research.found).toBe(false);
    expect(applyResearch("1", undefined, research)).toBeUndefined();
  });

  it("never turns an automatic materials judgement into a definitive vegan", () => {
    const result = applyResearch("1", undefined, finalizeProductResearch(
      { found: true, productName: "Canvas bag", category: "clothing", verdict: "vegan", reason: "Cotton canvas." },
      sources,
    ));
    expect(result?.verdict).toBe("probably_vegan");
  });
});

describe("citation check", () => {
  const list = "Aqua, C12-15 Alkyl Benzoate, Butyl Methoxydibenzoylmethane, Ethylhexyl Salicylate, Glycerin, Octocrylene, Niacinamide, Dimethicone";

  it("accepts a list that is on the cited page", () => {
    expect(listAppearsInText(list, `<p>Ingredients: AQUA, C12-15 ALKYL BENZOATE, BUTYL METHOXYDIBENZOYLMETHANE, ETHYLHEXYL SALICYLATE, GLYCERIN, OCTOCRYLENE, NIACINAMIDE, DIMETHICONE.</p>`)).toBe(true);
  });

  it("rejects a list the page does not contain", () => {
    expect(listAppearsInText(list, "Our best sunscreen. Buy now. Aqua and glycerin.")).toBe(false);
  });

  it("maps free-text categories", () => {
    expect(productCategoryOf("Sunscreen / Face Fluid")).toBe("cosmetic");
    expect(productCategoryOf("Leather boots")).toBe("clothing");
    expect(productCategoryOf("Breakfast cereal")).toBe("other");
  });
});

describe("products whose database record has ingredients", () => {
  const glycerinOnly = record({
    productName: "moisturiser",
    category: "beauty",
    brand: "",
    verdict: "probably_vegetarian",
    findings: [{ id: "glycerol", name: "Glycerol", matchedAlias: "glycerin", status: "ambiguous", reason: "", substitutions: [] }],
    evidence: [{ id: "obf", sourceType: "open_beauty_facts", sourceName: "Open Beauty Facts", capturedAt: "", market: "ES", traces: [], ingredientsText: "aqua, glycerin" }],
  });
  const sources = [{ url: "https://brand.example/moisturiser" }];

  it("still searches when the only doubt is a dual-origin ingredient, or the brand is missing", () => {
    expect(isDoubtfulOnly(glycerinOnly)).toBe(true);
    expect(needsResearch(glycerinOnly)).toBe(true);
    expect(needsResearch({ ...glycerinOnly, verdict: "probably_vegan", findings: [] })).toBe(true); // no brand
    expect(needsResearch({ ...glycerinOnly, verdict: "probably_vegan", findings: [], brand: "Brand" })).toBe(false);
    expect(needsResearch({ ...glycerinOnly, verdict: "vegetarian", brand: "Brand", findings: [{ id: "milk", name: "Milk", matchedAlias: "milk", status: "vegetarian", reason: "", substitutions: [] }] })).toBe(false);
  });

  it("keeps the database list, adds the brand and lets a manufacturer vegan statement settle the doubt", () => {
    const result = applyResearch("5060144640024", glycerinOnly, finalizeProductResearch(
      { found: true, productName: "Bulldog Original Moisturiser", brand: "Bulldog", category: "cosmetic", manufacturerVeganClaim: true },
      sources,
    ));
    expect(result).toMatchObject({ brand: "Bulldog", verdict: "probably_vegan", productName: "moisturiser" });
    expect(result?.findings).toEqual(glycerinOnly.findings);
  });

  it("never settles a clearly animal ingredient with a vegan statement", () => {
    const withBeeswax = { ...glycerinOnly, verdict: "vegetarian" as const, findings: [{ id: "beeswax", name: "Beeswax", matchedAlias: "cera alba", status: "vegetarian" as const, reason: "", substitutions: [] }] };
    const result = applyResearch("1", withBeeswax, finalizeProductResearch({ found: true, brand: "X", manufacturerVeganClaim: true }, sources));
    expect(result?.verdict).toBe("vegetarian");
  });
});
