import { describe, expect, it, vi } from "vitest";
import type { MenuDraft, MenuItem } from "@vegan-tools/domain";
import { verifyVeganDishes } from "./menu-verification.js";

function dish(id: string, name: string, verdict: MenuItem["verdict"], description = ""): MenuItem {
  return { id, originalName: name, name, description, price: "", verdict, reason: "", modifications: [] };
}

function menuWith(items: MenuItem[]): MenuDraft {
  return {
    id: "m",
    editToken: "t",
    status: "ready",
    restaurantName: "",
    sourceLabel: "",
    sourceFiles: [],
    sourceCapturedAt: "2026-11-22T00:00:00.000Z",
    originalLanguage: "ca",
    sections: [{ id: "s", name: "Plats", items }],
    createdAt: "2026-11-22T00:00:00.000Z",
    originalDeleteAt: "2026-11-22T00:00:00.000Z",
  };
}

const verdicts = (menu: MenuDraft) => Object.fromEntries(menu.sections[0]!.items.map((item) => [item.id, item.verdict]));

describe("verifyVeganDishes", () => {
  it("lowers a 'vegan' dish whose description names an animal ingredient", async () => {
    const result = await verifyVeganDishes(menuWith([
      dish("a", "Amanida de tomàquet", "vegan", "amb formatge de cabra"),
      dish("b", "Crema de carbassa", "vegan", "amb daus de pernil"),
      dish("c", "Hummus", "vegan", "cigrons, tahina, llimona"),
    ]));
    expect(verdicts(result)).toEqual({ a: "vegetarian", b: "non_vegetarian", c: "vegan" });
  });

  it("applies the AI review only downwards and only to vegan dishes", async () => {
    const review = vi.fn().mockResolvedValue([
      { id: "risotto", risk: "likely", kind: "slaughter", ingredient: "chicken stock" },
      { id: "pasta", risk: "possible", kind: "secretion", ingredient: "egg" },
      { id: "salad", risk: "none" },
    ]);
    const result = await verifyVeganDishes(menuWith([
      dish("risotto", "Risotto de bolets", "vegan"),
      dish("pasta", "Tagliatelle fresques amb tomàquet", "vegan"),
      dish("salad", "Amanida verda", "vegan"),
      dish("cheese", "Taula de formatges", "vegetarian"),
    ]), { review });
    expect(verdicts(result)).toEqual({ risotto: "unknown", pasta: "probably_vegan", salad: "vegan", cheese: "vegetarian" });
    expect(review).toHaveBeenCalledWith([
      expect.objectContaining({ id: "risotto" }),
      expect.objectContaining({ id: "pasta" }),
      expect.objectContaining({ id: "salad" }),
    ]);
  });

  it("keeps the rule check when the AI review fails", async () => {
    const result = await verifyVeganDishes(
      menuWith([dish("a", "Croissant", "vegan", "fet amb mantega")]),
      { review: vi.fn().mockRejectedValue(new Error("quota")) },
    );
    expect(verdicts(result)).toEqual({ a: "vegetarian" });
  });

  it("trusts 100% vegan venues", async () => {
    const review = vi.fn();
    const result = await verifyVeganDishes(menuWith([dish("a", "Formatge de la casa", "vegan")]), { isVegan: true, review });
    expect(verdicts(result)).toEqual({ a: "vegan" });
    expect(review).not.toHaveBeenCalled();
  });
});
