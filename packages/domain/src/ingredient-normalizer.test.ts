import { describe, expect, it } from "vitest";
import { normalizeIngredientText } from "./ingredient-normalizer.js";

describe("normalizeIngredientText (Phase 1 Standard)", () => {
  it("strips precautionary allergen traces into a separate array", () => {
    const raw = "Farina de blat, sucre, oli de gira-sol. Pot contenir traces de llet i ou.";
    const result = normalizeIngredientText(raw);
    expect(result.cleanText).toBe("Farina de blat, sucre, oli de gira-sol");
    expect(result.hadTraces).toBe(true);
    expect(result.traces.length).toBeGreaterThan(0);
    expect(result.traces[0]).toContain("llet");
  });

  it("removes percentage specifications in parentheses and brackets", () => {
    const raw = "Zutaten: Haferflocken (45%), Dinkelmehl [20%], Sonnenblumenöl ( 12.5% ), Salz 1.5%";
    const result = normalizeIngredientText(raw);
    expect(result.cleanText).toBe("Haferflocken, Dinkelmehl, Sonnenblumenöl, Salz");
  });

  it("removes multilingual packaging label prefixes", () => {
    expect(normalizeIngredientText("Ingredients: water, oats, salt").cleanText).toBe("water, oats, salt");
    expect(normalizeIngredientText("Ingredientes: agua, avena, sal").cleanText).toBe("agua, avena, sal");
    expect(normalizeIngredientText("Zutaten: Wasser, Hafer, Salz").cleanText).toBe("Wasser, Hafer, Salz");
    expect(normalizeIngredientText("Ingrédients: eau, avoine, sel").cleanText).toBe("eau, avoine, sel");
    expect(normalizeIngredientText("Ingredienti: acqua, avena, sale").cleanText).toBe("acqua, avena, sale");
  });

  it("canonicalizes European E-numbers across various formatting styles", () => {
    const raw = "farina, e-471, sucre, E 120, aigua, E - 300, sal";
    const result = normalizeIngredientText(raw);
    expect(result.cleanText).toBe("farina, E471, sucre, E120, aigua, E300, sal");
  });

  it("normalizes bullet points, semicolons, and pipes to standard commas", () => {
    const raw = "Maçana • Pastanaga ; Api | Oli de lli * Llavors de xia";
    const result = normalizeIngredientText(raw);
    expect(result.cleanText).toBe("Maçana, Pastanaga, Api, Oli de lli, Llavors de xia");
  });

  it("preserves Catalan ela geminada (l·l) while replacing other middle dots as separators", () => {
    const raw = "Aigua destil·lada • Sucre · Farina col·loidal • Sal";
    const result = normalizeIngredientText(raw);
    expect(result.cleanText).toBe("Aigua destil·lada, Sucre, Farina col·loidal, Sal");
  });

  it("handles empty or malformed input safely", () => {
    expect(normalizeIngredientText("").cleanText).toBe("");
    expect(normalizeIngredientText("   ").cleanText).toBe("");
    // @ts-expect-error test invalid types
    expect(normalizeIngredientText(null).cleanText).toBe("");
  });
});
