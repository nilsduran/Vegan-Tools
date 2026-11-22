import { describe, expect, it } from "vitest";
import { classifyIngredients } from "./classifier.js";

const verdict = (text: string) => classifyIngredients(text, { assurance: "label_based" }).verdict;

describe("declared plant origin of dual-origin ingredients", () => {
  it.each([
    "Cacau, sucre, emulgent: lecitina de gira-sol",
    "Sugar, cocoa butter, emulsifier: sunflower lecithin",
    "Harina de trigo, emulgente (lecitina de soja), sal",
    "Farine, eau, émulsifiant : E471 (palme)",
    "Sorbitol, glicerina vegetal, aroma",
    "Wasser, Emulgator: Lecithine (Sonnenblumen), Salz",
    "Orange juice, vitamin D3 (from lichen)",
  ])("resolves %s as probably vegan", (text) => {
    expect(verdict(text)).toBe("probably_vegan");
  });

  it.each([
    "Flour, lecithin, sunflower oil, salt",
    "Farina, E471, oli de gira-sol",
    "Glycerin (animal or vegetable origin), water",
  ])("keeps %s doubtful when the plant word belongs to another ingredient or animal origin is possible", (text) => {
    expect(verdict(text)).toBe("probably_vegetarian");
  });

  it("never overrides an animal ingredient", () => {
    expect(verdict("Sunflower lecithin, whey powder")).toBe("vegetarian");
  });
});
