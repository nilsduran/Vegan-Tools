import { veganizeRecipe } from "@vegan-tools/domain";
import { describe, expect, it } from "vitest";
import {
  localizeGeneratedText,
  localizeIngredientName,
  localizeIngredientReason,
  localizeSuggestion,
} from "./generated-i18n";

describe("generated Catalan localization", () => {
  it("translates classifier summaries and ingredient labels", () => {
    expect(localizeGeneratedText(
      "Vegetarian but not vegan: contains Milk, Whey.",
      "ca",
    )).toBe("Vegetarià però no vegà: conté Llet, Sèrum de llet.");
    expect(localizeIngredientName({ id: "whey", name: "Whey" }, "ca"))
      .toBe("Sèrum de llet");
    expect(localizeIngredientReason({
      id: "whey",
      reason: "Whey is a dairy by-product.",
    }, "ca")).toBe("El sèrum de llet és un subproducte lacti.");
  });

  it("translates menu adaptations and explanations", () => {
    expect(localizeGeneratedText(
      "Ask whether it can be prepared without alioli and fried in olive oil.",
      "ca",
    )).toBe("Pregunta si es pot preparar sense allioli i fregit amb oli d'oliva.");
    expect(localizeGeneratedText(
      "May be fried in animal fat or contain non-vegan sauce ingredients",
      "ca",
    )).toBe("Es pot haver fregit amb greix animal o contenir ingredients no vegans a la salsa.");
  });

  it("translates recipe summaries, guidance and selectable substitutes", () => {
    expect(localizeGeneratedText(
      "4 ingredients can be replaced with vegan alternatives.",
      "ca",
    )).toBe("4 ingredients es poden substituir per alternatives veganes.");
    expect(localizeGeneratedText(
      "Replace 300 ml 1:1 with unsweetened soy milk. Choose an unsweetened version for savoury recipes.",
      "ca",
    )).toBe(
      "Substitueix 300 ml en proporció 1:1 per llet de soja sense sucre. Tria'n una versió sense sucre per a receptes salades.",
    );
    expect(localizeSuggestion("flax egg for binding", "ca")).toBe("ou de lli per lligar");
    expect(localizeGeneratedText(
      "Replace 1 tbsp 1:1 with maple syrup, then reduce other liquid slightly if the mixture becomes too loose.",
      "ca",
    )).toBe(
      "Substitueix 1 tbsp en proporció 1:1 per xarop d'auró i redueix una mica els altres líquids si la barreja queda massa fluida.",
    );
  });

  it("does not alter generated English content in English", () => {
    const reason = "Vegetarian but not vegan: contains Milk, Whey.";
    expect(localizeGeneratedText(reason, "en")).toBe(reason);
  });

  it("renders the generated Catalan example without English substitution prose", () => {
    const result = veganizeRecipe(`Pancakes
200 g de farina
2 ous
300 ml de llet
30 g de mantega
1 cullerada de mel

Instruccions:
Barreja els ingredients i cuina els pancakes.`);
    const localized = localizeGeneratedText(result.veganizedText, "ca");

    expect(localized).toContain("ous de lli");
    expect(localized).toContain("llet de soja sense sucre");
    expect(localized).toContain("Notes de substitució vegana:");
    expect(localized).not.toMatch(/\b(?:ground flaxseed|substitution notes|olive oil|maple syrup)\b/i);
  });
});
