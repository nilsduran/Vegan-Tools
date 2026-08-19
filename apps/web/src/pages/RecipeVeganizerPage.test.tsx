// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeVeganizerPage } from "./RecipeVeganizerPage.js";
import * as api from "../api.js";
import type { RecipeAnalysis } from "@vegan-tools/domain";

vi.mock("../api.js", () => ({
  veganizeRecipe: vi.fn(),
}));

function renderVeganizer() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeVeganizerPage />
    </QueryClientProvider>,
  );
}

describe("RecipeVeganizerPage Form UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads an example recipe when clicking 'Use an example'", async () => {
    const user = userEvent.setup();
    renderVeganizer();

    const textarea = screen.getByLabelText(/recipe/i);
    expect((textarea as HTMLTextAreaElement).value).toBe("");

    const exampleButton = screen.getByRole("button", { name: /use an example/i });
    await user.click(exampleButton);

    expect((textarea as HTMLTextAreaElement).value).toContain("Pancakes");
    expect((textarea as HTMLTextAreaElement).value).toContain("flour");
  });

  it("allows entering a custom recipe and veganizing it", async () => {
    const user = userEvent.setup();
    const mockResult: RecipeAnalysis = {
      originalText: "Pancakes with 2 eggs and milk",
      verdict: "vegetarian",
      summary: "Contains egg and dairy; easily veganized with plant-based alternatives.",
      findings: [
        {
          id: "egg",
          name: "Egg",
          matchedAlias: "egg",
          status: "vegetarian",
          reason: "Animal-derived egg",
          substitutions: [],
        },
      ],
      substitutions: [
        {
          ingredientId: "egg",
          ingredient: "Egg",
          detectedText: "2 eggs",
          originalAmount: "2",
          selectedSuggestion: "2 flax eggs",
          reason: "Animal-derived egg",
          guidance: "Acts as a binder in pancakes.",
          suggestions: ["2 flax eggs", "aquafaba"],
        },
      ],
      veganizedText: "Pancakes\n200 g flour\n2 flax eggs\n300 ml soy milk\n30 g vegan butter",
      classifierVersion: "1.0",
    };

    vi.mocked(api.veganizeRecipe).mockResolvedValueOnce(mockResult);

    renderVeganizer();

    const textarea = screen.getByLabelText(/recipe/i);
    await user.type(textarea, "Pancakes with 2 eggs and milk");

    const submitButton = screen.getByRole("button", { name: /veganize recipe/i });
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(submitButton);

    await waitFor(() => {
      expect(api.veganizeRecipe).toHaveBeenCalledWith(
        "Pancakes with 2 eggs and milk",
        {},
      );
    });

    expect(await screen.findByText(/Contains egg and dairy/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "2 flax eggs" })).toBeDefined();
    expect(screen.getByRole("button", { name: "aquafaba" })).toBeDefined();
  });

  it("displays an error message if the veganize API fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.veganizeRecipe).mockRejectedValueOnce(
      new Error("Recipe veganization service is busy."),
    );

    renderVeganizer();

    const textarea = screen.getByLabelText(/recipe/i);
    await user.type(textarea, "Cake recipe");

    const submitButton = screen.getByRole("button", { name: /veganize recipe/i });
    await user.click(submitButton);

    expect(await screen.findByText("Recipe veganization service is busy.")).toBeDefined();
  });
});
