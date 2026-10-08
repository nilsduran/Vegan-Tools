// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RecipeDetailPage } from "./RecipeDetailPage";
import { setLanguage } from "../i18n";

describe("RecipeDetailPage", () => {
  beforeEach(() => {
    setLanguage("ca");
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders authentic master recipe details when found", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/canelons-tradicionals-festa-major"]}>
        <Routes>
          <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Canelons de Festa Major amb Bolets/i)).toBeDefined();
    expect(screen.getAllByText(/Plaques de canelons/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prepara la beixamel/i)).toBeDefined();
  });

  it("scales ingredients when increasing servings", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/canelons-tradicionals-festa-major"]}>
        <Routes>
          <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Default servings is 4 (16 unitats)
    expect(screen.getByText("16 unitats")).toBeDefined();

    // Increase servings by clicking plus button
    const plusBtn = screen.getByLabelText(/increase servings|augmenta les racions/i);
    fireEvent.click(plusBtn); // 5 servings -> 16 * 5 / 4 = 20 unitats
    expect(screen.getByText("20 unitats")).toBeDefined();
  });

  it("toggles ingredient checklist item", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/canelons-tradicionals-festa-major"]}>
        <Routes>
          <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const firstItem = screen.getAllByRole("checkbox")[0]!;
    expect(firstItem.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(firstItem);
    expect(firstItem.getAttribute("aria-checked")).toBe("true");
  });

  it("renders difficulty and cost metrics and supports interactive leaf rating", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/canelons-tradicionals-festa-major"]}>
        <Routes>
          <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Puntua aquesta recepta/i)).toBeDefined();

    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByText(/Gràcies per puntuar aquesta recepta!/i)).toBeDefined();
    expect(localStorage.getItem("vegan_tools_recipe_rating_canelons-tradicionals")).toBe("0.5");
  });

  it("shows recipe not found message for non-existent slug", () => {
    render(
      <MemoryRouter initialEntries={["/recipes/recepta-inexistent"]}>
        <Routes>
          <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Recipe not found|No s'ha trobat la recepta/i)).toBeDefined();
  });
});
