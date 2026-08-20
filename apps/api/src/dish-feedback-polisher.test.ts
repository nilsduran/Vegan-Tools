import { describe, expect, it, vi } from "vitest";
import { GeminiDishFeedbackPolisher } from "./dish-feedback-polisher.js";

describe("DishFeedbackPolisher", () => {
  it("uses fallback when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const polisher = new GeminiDishFeedbackPolisher();

    const dishResult = await polisher.polishDishFeedback({
      dishName: "Pasta al pesto",
      verdict: "non_vegetarian",
      rawNote: "pasta port ous",
      targetModification: "vegan",
    });

    expect(dishResult.reason).toBe("pasta port ous");
    expect(dishResult.reasonCa).toBe("pasta port ous");
    expect(dishResult.modificationNote).toBe("pasta port ous");
    expect(dishResult.modifications).toEqual([
      { target: "vegan", note: "pasta port ous", noteCa: "pasta port ous" },
    ]);

    const notesResult = await polisher.polishRestaurantNotes("fregidora compartida");
    expect(notesResult.communityNotes).toBe("fregidora compartida");
    expect(notesResult.communityNotesCa).toBe("fregidora compartida");
  });

  it("discards nonsense and gibberish input (e.g. xlkzjv, asdfgh, blank spaces) and generates clean defaults", async () => {
    const polisher = new GeminiDishFeedbackPolisher();

    const gibberishDish = await polisher.polishDishFeedback({
      dishName: "Pizza Margarita",
      verdict: "vegetarian",
      rawNote: "xlkzjv",
    });

    expect(gibberishDish.reason).toBe("Vegetarian (no meat or fish)");
    expect(gibberishDish.reasonCa).toBe("Vegetarià (sense carn ni peix)");
    expect(gibberishDish.modifications).toEqual([]);

    const emptyNotes = await polisher.polishRestaurantNotes("   ");
    expect(emptyNotes.communityNotes).toBe("");
    expect(emptyNotes.communityNotesCa).toBe("");

    const spamNotes = await polisher.polishRestaurantNotes("......??????");
    expect(spamNotes.communityNotes).toBe("");
    expect(spamNotes.communityNotesCa).toBe("");
  });
});
