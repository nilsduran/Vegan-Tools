import { describe, expect, it } from "vitest";
import {
  MASTER_RECIPES,
  filterRecipes,
  recipeItemSchema,
  scaleIngredientAmount,
} from "./cookbook.js";

describe("Cookbook Domain", () => {
  it("validates all master recipes against recipeItemSchema", () => {
    expect(MASTER_RECIPES.length).toBeGreaterThanOrEqual(6);

    for (const recipe of MASTER_RECIPES) {
      const parsed = recipeItemSchema.safeParse(recipe);
      expect(parsed.success).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.title.ca).toBeTruthy();
      expect(recipe.title.en).toBeTruthy();
      expect(recipe.description.ca).toBeTruthy();
      expect(recipe.description.en).toBeTruthy();
    }
  });

  it("filters recipes correctly by category", () => {
    const traditional = filterRecipes(MASTER_RECIPES, "", "traditional", "ca");
    expect(traditional.length).toBeGreaterThan(0);
    expect(traditional.every((r) => r.category === "traditional")).toBe(true);

    const baking = filterRecipes(MASTER_RECIPES, "", "baking", "ca");
    expect(baking.length).toBeGreaterThan(0);
    expect(baking.every((r) => r.category === "baking")).toBe(true);
  });

  it("filters recipes correctly by text search in Catalan and English", () => {
    const canelonsCa = filterRecipes(MASTER_RECIPES, "canelons", "all", "ca");
    expect(canelonsCa.length).toBe(1);
    expect(canelonsCa[0]?.id).toBe("canelons-tradicionals");

    const cannelloniEn = filterRecipes(MASTER_RECIPES, "cannelloni", "all", "en");
    expect(cannelloniEn.length).toBe(1);
    expect(cannelloniEn[0]?.id).toBe("canelons-tradicionals");

    const byIngredient = filterRecipes(MASTER_RECIPES, "anacards", "all", "ca");
    expect(byIngredient.some((r) => r.id === "formatge-curat-anacards")).toBe(true);
  });

  it("scales ingredient amounts mathematically", () => {
    // 200g base for 4 servings -> 100g for 2 servings
    expect(scaleIngredientAmount(200, 4, 2)).toBe(100);
    // 200g base for 4 servings -> 300g for 6 servings
    expect(scaleIngredientAmount(200, 4, 6)).toBe(300);
    // 16 units for 4 servings -> 8 units for 2 servings
    expect(scaleIngredientAmount(16, 4, 2)).toBe(8);
    // Undefined base amount returns undefined
    expect(scaleIngredientAmount(undefined, 4, 2)).toBeUndefined();
  });

  it("filters recipes correctly by difficulty and cost", () => {
    const easyRecipes = filterRecipes(MASTER_RECIPES, "", "all", "ca", "easy");
    expect(easyRecipes.length).toBeGreaterThan(0);
    expect(easyRecipes.every((r) => r.difficulty === "easy")).toBe(true);

    const hardRecipes = filterRecipes(MASTER_RECIPES, "", "all", "ca", "hard");
    expect(hardRecipes.length).toBeGreaterThan(0);
    expect(hardRecipes.some((r) => r.id === "parker-house-rolls-emp")).toBe(true);

    const budgetRecipes = filterRecipes(MASTER_RECIPES, "", "all", "ca", "all", "1");
    expect(budgetRecipes.length).toBeGreaterThan(0);
    expect(budgetRecipes.every((r) => r.cost === "1")).toBe(true);
  });

  it("includes iconic haute cuisine recipes from Eleven Madison Park and Huset", () => {
    const emp = MASTER_RECIPES.find((r) => r.id === "parker-house-rolls-emp");
    expect(emp).toBeDefined();
    expect(emp?.difficulty).toBe("hard");
    expect(emp?.cost).toBe("2");

    const huset = MASTER_RECIPES.find((r) => r.id === "sourdough-spent-grain-huset");
    expect(huset).toBeDefined();
    expect(huset?.difficulty).toBe("medium");
    expect(huset?.cost).toBe("1");
  });

  it("ensures all master recipes have at least 5 detailed steps and realistic positive durations", () => {
    for (const recipe of MASTER_RECIPES) {
      expect(recipe.steps.length).toBeGreaterThanOrEqual(5);
      for (const step of recipe.steps) {
        expect(step.durationMinutes).toBeDefined();
        expect(step.durationMinutes).toBeGreaterThan(0);
        expect(step.instruction.ca.length).toBeGreaterThan(20);
        expect(step.instruction.en.length).toBeGreaterThan(20);
      }
      expect(recipe.prepTimeMinutes).toBeGreaterThanOrEqual(10);
      expect(recipe.cookTimeMinutes).toBeGreaterThanOrEqual(10);
    }
  });

  it("ensures all recipes have valid images and strict safe-space plant-based realism", () => {
    for (const recipe of MASTER_RECIPES) {
      expect(
        recipe.imageUrl.startsWith("/images/recipes/") ||
          recipe.imageUrl.startsWith("https://")
      ).toBe(true);
    }

    const padThai = MASTER_RECIPES.find((r) => r.id === "pad-thai-tofu");
    expect(padThai).toBeDefined();
    expect(padThai?.imageUrl).toContain("pad-thai-tofu");

    const rolls = MASTER_RECIPES.find((r) => r.id === "parker-house-rolls-emp");
    expect(rolls).toBeDefined();
    expect(rolls?.imageUrl).toContain("parker-house-rolls");

    const sourdough = MASTER_RECIPES.find((r) => r.id === "sourdough-spent-grain-huset");
    expect(sourdough).toBeDefined();
    expect(sourdough?.imageUrl).toContain("sourdough-spent-grain");
  });

  it("ensures all recipes have accredited sources and enriched tags", () => {
    for (const recipe of MASTER_RECIPES) {
      expect(recipe.source).toBeDefined();
      expect(recipe.source?.name.length).toBeGreaterThan(3);
      expect(recipe.tags.length).toBeGreaterThanOrEqual(5);
    }
  });
});
