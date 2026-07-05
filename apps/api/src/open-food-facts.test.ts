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

  it("classifies Nutella's French ingredients as vegetarian, never vegan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      product: {
        product_name: "Nutella",
        ingredients_text:
          "Sucre, huile de palme, NOISETTES 13%, cacao maigre 7,4%, LAIT écrémé en poudre 6,6%, LACTOSERUM en poudre, lécithines [SOJA], vanilline.",
        ingredients_analysis_tags: [
          "en:palm-oil",
          "en:non-vegan",
          "en:maybe-vegetarian",
        ],
      },
    }), { status: 200 })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe("vegetarian");
    expect(product?.matchedIngredients).toEqual(expect.arrayContaining(["Milk", "Whey"]));
    expect(product?.reason).toContain("Milk");
  });

  it("never interprets a non-vegan tag as a vegan mark", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      product: {
        ingredients_analysis_tags: ["en:non-vegan", "en:maybe-vegetarian"],
      },
    }), { status: 200 })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe("probably_vegetarian");
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

  it.each([
    ["Apple", ["en:apples"], "vegan"],
    ["Apple pie", ["en:apple-pies"], "probably_vegetarian"],
    ["Dark chocolate 70%", ["en:dark-chocolates"], "probably_vegan"],
  ])("uses a cautious identity inference for %s without ingredients", async (
    productName,
    categoriesTags,
    expectedVerdict,
  ) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      product: {
        product_name: productName,
        categories_tags: categoriesTags,
      },
    }), { status: 200 })));

    const product = await lookupOpenFoodFacts("3017620422003");
    expect(product?.verdict).toBe(expectedVerdict);
  });
});
