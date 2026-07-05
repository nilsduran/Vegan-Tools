import { describe, expect, it } from "vitest";
import {
  informativeMenuReason,
  menuDisplayText,
  visibleMenuDescription,
} from "./menu.js";

describe("menu display helpers", () => {
  it("omits descriptions that only repeat a translated or original title", () => {
    expect(visibleMenuDescription({
      name: "Chocolate coulant",
      originalName: "Coulant de chocolate",
      description: "Chocolate coulant.",
      verdict: "vegetarian",
    })).toBe("");
    expect(visibleMenuDescription({
      name: "Chocolate coulant",
      originalName: "Coulant de chocolate",
      description: "Coulant de chocolate",
      verdict: "vegetarian",
    })).toBe("");
    expect(visibleMenuDescription({
      name: "Fruit: Pineapple / Melon",
      originalName: "Fruta: Piña / Melón",
      description: "Pineapple / Melon.",
      verdict: "vegan",
    })).toBe("");
  });

  it("replaces generic labels with an ingredient-based explanation", () => {
    expect(informativeMenuReason({
      name: "Chocolate coulant with vanilla ice cream",
      originalName: "Coulant de chocolate con helado de vainilla",
      description: "(takes 15 min. in oven)",
      reason: "Vegetarian dessert.",
      verdict: "vegetarian",
    })).toBe(
      "Vegetarian rather than vegan because the ice cream normally contains dairy, and chocolate coulant commonly contains butter and egg.",
    );
    expect(informativeMenuReason({
      name: "Ice creams",
      originalName: "Helados",
      description:
        "Vanilla, Stracciatella, Coffee, Hazelnut, Dark chocolate, Nougat, Lemon sorbet, Sicilian mandarin sorbet",
      reason: "Vegetarian.",
      verdict: "vegetarian",
    })).toBe(
      "This selection mixes dairy ice creams with sorbets. The ice-cream flavours are vegetarian; the sorbets may be vegan, but their recipe should be checked for milk, egg, honey or gelatin.",
    );
  });

  it("keeps a full translated dish title", () => {
    expect(menuDisplayText({
      name: "Burrata with pappa al pomodoro and arugula",
      originalName: "Burrata con pappa al pomodoro y rúcula",
      description: "",
      verdict: "vegetarian",
    })).toEqual({
      name: "Burrata with pappa al pomodoro and arugula",
      description: "",
    });
  });
});
