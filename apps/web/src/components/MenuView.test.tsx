// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuView } from "./MenuView.js";
import * as api from "../api.js";
import type { MenuDraft } from "@vegan-tools/domain";

vi.mock("../api.js", () => ({
  submitDishFeedback: vi.fn(),
  updateRestaurantNotes: vi.fn(),
  resolveApiUrl: (url: string) => url,
  sourcePdfPageUrl: (url: string, page: number) => `${url}#page=${page}`,
}));

describe("MenuView and DishCorrectionDialog Form UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleMenu: MenuDraft = {
    id: "menu-test-1",
    editToken: "token-test-1",
    status: "ready",
    restaurantName: "Trattoria Vegana",
    sourceLabel: "Uploaded menu",
    sourceFiles: [],
    sourceCapturedAt: new Date().toISOString(),
    originalLanguage: "ca",
    sections: [
      {
        id: "sec-1",
        name: "Pastes",
        nameCa: "Pastes",
        items: [
          {
            id: "dish-tagliatelle",
            originalName: "Tagliatelle al pesto",
            name: "Tagliatelle al pesto",
            description: "Fresh pasta with basil pesto",
            price: "11,00 €",
            verdict: "vegan",
            reason: "Vegetable ingredients",
            reasonCa: "Ingredients vegetals",
            modifications: [],
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    originalDeleteAt: new Date().toISOString(),
  };

  it("opens correction modal, submits feedback and triggers update callback", async () => {
    const user = userEvent.setup();
    const onUpdateMenu = vi.fn();

    vi.mocked(api.submitDishFeedback).mockResolvedValueOnce({
      menu: sampleMenu,
      updatedDish: {
        id: "dish-tagliatelle",
        originalName: "Tagliatelle al pesto",
        name: "Tagliatelle al pesto",
        description: "Fresh pasta with basil pesto",
        price: "11,00 €",
        verdict: "non_vegetarian",
        reason: "Contains egg (fresh pasta is made with eggs)",
        reasonCa: "Conté ou (la pasta fresca porta ou)",
        modifiableTo: "vegan",
        modifications: [
          {
            target: "vegan",
            note: "Ask for dried pasta",
            noteCa: "Demanar pasta seca",
          },
        ],
      },
    });

    render(<MenuView menu={sampleMenu} onUpdateMenu={onUpdateMenu} />);

    expect(screen.getByText("Tagliatelle al pesto")).toBeDefined();

    const editButton = screen.getByRole("button", { name: /correct dish/i });
    await user.click(editButton);

    expect(await screen.findByText(/Dish correction/i)).toBeDefined();

    const noteInput = screen.getByRole("textbox");
    await user.clear(noteInput);
    await user.type(noteInput, "pasta port ous");

    const saveButton = screen.getByRole("button", { name: /save correction/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.submitDishFeedback).toHaveBeenCalledWith(
        "menu-test-1",
        "dish-tagliatelle",
        expect.objectContaining({
          rawNote: "pasta port ous",
        }),
        "token-test-1",
      );
    });

    expect(onUpdateMenu).toHaveBeenCalled();
  });
});
