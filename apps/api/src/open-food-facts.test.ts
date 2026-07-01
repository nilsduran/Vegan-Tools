import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupOpenFoodFacts } from "./open-food-facts.js";

describe("Open Food Facts classification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Open Food Facts' vegan mark when ingredients do not conflict", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "success",
      product: {
        product_name: "Plant-based spread",
        brands: "Example",
        ingredients_analysis_tags: ["en:vegan"],
        labels_tags: [],
        last_modified_t: 1_782_000_000,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe("vegan");
    expect(product?.definitive).toBe(false);
    expect(product?.reason).toContain("marks this product as vegan");
  });

  it("does not let a vegan mark override a conflicting animal ingredient", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      product: {
        ingredients_text: "Sugar, milk powder",
        ingredients_analysis_tags: ["en:vegan"],
      },
    }), { status: 200 })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe("vegetarian");
  });

  it("treats a plant-based category without ingredients as probably vegan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      product: {
        product_name: "Breadsticks",
        categories_tags: ["en:plant-based-foods", "en:breads"],
        image_ingredients_url: "https://images.openfoodfacts.org/images/products/label.jpg",
      },
    }), { status: 200 })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe("probably_vegan");
    expect(product?.ingredientsImageUrl).toContain("images.openfoodfacts.org");
  });
});
