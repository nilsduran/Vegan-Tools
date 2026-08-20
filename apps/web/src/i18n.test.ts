// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { setLanguage, t, tx, type CatalanPhraseKey, type TranslationKey } from "./i18n.js";

describe("I18n Translation Integrity & Completeness", () => {
  it("provides non-empty Catalan translations for all base dictionary keys", () => {
    setLanguage("ca");
    const testKeys: TranslationKey[] = [
      "brand",
      "tagline",
      "home",
      "menus",
      "scanner",
      "recipes",
      "openMenu",
      "openScanner",
      "openRecipes",
      "menusSummary",
      "scannerSummary",
      "recipesSummary",
      "uploadTitle",
      "uploadBody",
      "analyze",
      "reviewing",
      "publish",
      "addDish",
      "remove",
      "source",
      "why",
      "scanPrompt",
      "manualCode",
      "lookUp",
      "unknown",
      "vegan",
      "probablyVegan",
      "vegetarian",
      "probablyVegetarian",
      "nonVegetarian",
      "all",
      "includeModifications",
      "editHint",
    ];

    for (const key of testKeys) {
      const translated = t(key);
      expect(translated, `Missing Catalan translation for key "${key}"`).toBeTruthy();
      expect(typeof translated).toBe("string");
      expect(translated.trim().length).toBeGreaterThan(0);
    }
  });

  it("translates critical UI phrases into Catalan without falling back to English", () => {
    setLanguage("ca");
    const criticalPhrases: CatalanPhraseKey[] = [
      "Dietary verdict",
      "Practical adaptation",
      "No adaptation",
      "Adaptable to vegan",
      "Adaptable to vegetarian",
      "Explanation or notes",
      "Cancel",
      "Save correction",
      "Dish correction",
      "Correct dish",
      "Close",
      "Community notes",
      "Community note",
      "Restaurant warning / note",
      "Save notes",
      "Edit venue notes",
      "Add venue notes",
      "Edit notes",
      "Saving & translating…",
      "Restaurant menu",
      "Menu",
      "My location",
      "Search this area",
      "Show map",
      "Hide map",
      "Recenter map",
      "Locate me",
      "Explore map",
      "Diet filter",
      "Show adaptable",
      "Search for a restaurant",
      "Selected restaurant",
      "Change",
    ];

    for (const phrase of criticalPhrases) {
      const translated = tx(phrase);
      expect(translated, `Translation for phrase "${phrase}" was empty`).toBeTruthy();
      expect(translated, `Phrase "${phrase}" was not translated and fell back to English`).not.toBe(phrase);
    }
  });

  it("returns English when the language is set to English", () => {
    setLanguage("en");
    expect(tx("Dietary verdict")).toBe("Dietary verdict");
    expect(tx("Practical adaptation")).toBe("Practical adaptation");
    expect(tx("Dish correction")).toBe("Dish correction");
    expect(t("vegan")).toBe("Vegan");
  });
});
