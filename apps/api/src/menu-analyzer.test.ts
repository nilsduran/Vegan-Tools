import { describe, expect, it } from "vitest";
import { isPracticalAdaptation } from "./menu-analyzer.js";

describe("menu adaptation guardrails", () => {
  it("rejects changes that remove the identity of a dish", () => {
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the cod.",
      "Cod fritters",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the sauce.",
      "Patatas bravas",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the cheese.",
      "Caprese salad",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether the potatoes can be served sautéed without the egg.",
      "Potato omelette",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the cheese.",
      "Wood-fired provolone",
      "Provolone nel forno a legna",
    )).toBe(false);
  });

  it("rejects special substitute products but permits simple omissions", () => {
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared with plant-based bolognese.",
      "Spaghetti bolognese",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the cheese garnish.",
      "House salad",
    )).toBe(true);
  });

  it("rejects adaptations that strip most of a short ingredient list", () => {
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the ham, cheese, and egg.",
      "Occhio di Bue",
      "Tomato, mozzarella, sweet ham and egg",
    )).toBe(false);
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared without the ham and cheese.",
      "4 Stagioni",
      "Tomato, mozzarella, mushrooms, black olives, sweet ham and artichokes",
    )).toBe(true);
  });

  it("rejects vegan adaptations that leave an inherently non-vegan dessert base", () => {
    expect(isPracticalAdaptation(
      "Ask whether it can be prepared by omitting the vanilla ice cream.",
      "Chocolate coulant with vanilla ice cream",
      "(takes 15 min. in oven)",
      "vegan",
    )).toBe(false);
  });

  it("analyzes fallback demo menu with modifiable dish support", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalGoogleKey = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    try {
      const { GeminiMenuAnalyzer } = await import("./menu-analyzer.js");
      const analyzer = new GeminiMenuAnalyzer();
      const result = await analyzer.analyze(
        {
          id: "test-menu",
          editToken: "token-123",
          status: "ready",
          restaurantName: "Demo",
          sourceLabel: "Uploaded menu",
          sourceFiles: [],
          sourceCapturedAt: new Date().toISOString(),
          originalLanguage: "es",
          sections: [],
          createdAt: new Date().toISOString(),
          originalDeleteAt: new Date().toISOString(),
        },
        [{ filename: "menu.pdf", mimetype: "application/pdf", buffer: Buffer.from("test") }],
        { includeDrinks: false },
      );

      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0]?.items[0]?.name).toBe("Example dish");
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey;
    }
  });
});

