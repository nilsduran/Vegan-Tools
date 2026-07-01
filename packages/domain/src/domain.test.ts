import { describe, expect, it } from "vitest";
import {
  classifyIngredients,
  isValidGtin,
  lookupIngredients,
  splitTraces,
  veganizeRecipe,
  productResultSchema,
} from "./index.js";

describe("GTIN validation", () => {
  it("accepts valid EAN-13 and rejects a wrong check digit", () => {
    expect(isValidGtin("3017620422003")).toBe(true);
    expect(isValidGtin("3017620422004")).toBe(false);
  });
});

describe("deterministic ingredient classification", () => {
  it("does not treat traces as ingredients", () => {
    const result = classifyIngredients(
      "Ingredients: cocoa, sugar. May contain milk and egg.",
      { assurance: "label_based", verifiedVeganClaim: true },
    );
    expect(result.verdict).toBe("vegan");
    expect(result.traces).toEqual(["milk and egg"]);
  });

  it("classifies gelatin as not vegetarian", () => {
    expect(classifyIngredients("Sugar, gelatin", { assurance: "label_based" }).verdict)
      .toBe("non_vegetarian");
  });

  it("classifies dairy as vegetarian rather than vegan", () => {
    expect(classifyIngredients("Cocoa, milk, sugar", { assurance: "label_based" }).verdict)
      .toBe("vegetarian");
  });

  it("returns probably vegetarian for potentially animal-derived additives", () => {
    expect(classifyIngredients("Flour, E471, salt", { assurance: "label_based" }).verdict)
      .toBe("probably_vegetarian");
  });

  it("returns probably vegan for an ordinary ingredient list without red flags", () => {
    expect(classifyIngredients("Water, tomatoes, salt", { assurance: "external" }).verdict)
      .toBe("probably_vegan");
  });

  it("keeps unknown for a missing ingredient list", () => {
    expect(classifyIngredients("", { assurance: "external" }).verdict).toBe("unknown");
  });

  it("matches Catalan and Spanish aliases", () => {
    expect(lookupIngredients("sucre, llet en pols, e-120").map((item) => item.id))
      .toContain("milk");
    expect(lookupIngredients("azúcar, gelatina").map((item) => item.id))
      .toContain("gelatin");
  });

  it("explains E-numbers using dictionary metadata", () => {
    const result = classifyIngredients("Sugar, E-120", { assurance: "label_based" });
    expect(result.findings[0]).toMatchObject({
      id: "carmine",
      eNumber: "E120",
      status: "non_vegetarian",
    });
  });

  it("does not confuse plant-based compounds with dairy", () => {
    const result = classifyIngredients(
      "Cocoa mass, cocoa butter, oat milk, vegan cheese",
      { assurance: "label_based" },
    );
    expect(result.verdict).toBe("probably_vegan");
  });

  it("suggests replacements for a recipe", () => {
    const recipe = veganizeRecipe("2 eggs\n100 ml milk\n1 tbsp honey");
    expect(recipe.substitutions.map((item) => item.ingredientId))
      .toEqual(expect.arrayContaining(["egg", "milk", "honey"]));
    expect(recipe.substitutions.find((item) => item.ingredientId === "egg")?.guidance)
      .toContain("2 tbsp ground flaxseed");
    expect(recipe.substitutions.find((item) => item.ingredientId === "milk")?.originalAmount)
      .toBe("100 ml");
  });

  it("keeps vegetarian ingredients when a recipe also contains meat", () => {
    const recipe = veganizeRecipe("200 g chicken\n100 ml milk\n30 g butter");
    expect(recipe.verdict).toBe("non_vegetarian");
    expect(recipe.substitutions.map((item) => item.ingredientId))
      .toEqual(expect.arrayContaining(["animal-meat", "milk", "butter"]));
  });

  it("creates an editable vegan recipe with adjusted quantities and steps", () => {
    const recipe = veganizeRecipe(
      "Pancakes\n2 eggs\n300 ml milk\n\nInstructions:\nBeat the eggs, then add the milk.",
    );
    expect(recipe.veganizedText).toContain(
      "2 flax eggs (2 tbsp ground flaxseed + 6 tbsp water)",
    );
    expect(recipe.veganizedText).toContain("300 ml unsweetened soy milk");
    expect(recipe.veganizedText).toContain("rest for 10 minutes");
    expect(recipe.veganizedText).toContain("Beat the flax eggs");
  });
});

describe("backwards-compatible product responses", () => {
  it("accepts cached results created before classifier versioning", () => {
    const product = productResultSchema.parse({
      gtin: "3017620422003",
      verdict: "probably_vegan",
      assurance: "external",
      definitive: false,
      reason: "No conflict found.",
    });
    expect(product.classifierVersion).toBe("legacy");
  });

  it("maps the previous not_vegetarian name to non_vegetarian", () => {
    const product = productResultSchema.parse({
      gtin: "3017620422003",
      verdict: "not_vegetarian",
      assurance: "external",
      definitive: false,
      reason: "Contains gelatine.",
    });
    expect(product.verdict).toBe("non_vegetarian");
  });
});
