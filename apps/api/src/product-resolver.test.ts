import { describe, expect, it } from "vitest";
import { CLASSIFIER_VERSION, type ProductResult } from "@vegan-tools/domain";
import { applyResearch, needsResearch, pickPrimaryRecord } from "./product-resolver.js";
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
