// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResourcesPage } from "./ResourcesPage";
import { setLanguage } from "../i18n";

describe("ResourcesPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders single-page main headings and hero content in Catalan", () => {
    setLanguage("ca");
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /Recursos/i,
      }),
    ).toBeDefined();

    // In-page navigation links within the quick nav
    const quickNav = screen.getByRole("navigation", { name: /Sections|Seccions/i });
    expect(quickNav).toBeDefined();
    expect(screen.getByRole("link", { name: /^Per què$/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Vídeos/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Llibres/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Guia pràctica/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Història/i })).toBeDefined();
  });

  it("renders all sections on the same page with videos, books, supplements, and thinkers", () => {
    setLanguage("ca");
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    // Section 1: Per què (3 pillars: animals, planet, health + The Vegan Society definition)
    expect(screen.getAllByText(/The Vegan Society/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pels Animals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pel Planeta/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Per la Salut/i).length).toBeGreaterThan(0);

    // Section 2: Vídeos (embedded iframes + 4 documentaries)
    expect(screen.getAllByText(/Mai no tornaràs a mirar la teva vida/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 Vegà vs 20 Menjadors de carn/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Em vaig fer vegà de broma/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/La veritat: per què em vaig fer vegana/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dominion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Blackfish/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Seaspiracy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/The Game Changers/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Earthlings/i)).toBeNull(); // Earthlings removed (4 docs total)

    // Section 3: Llibres (4 books total) & Buy Amazon links with disclosure
    expect(screen.getAllByText(/Animal Liberation Now/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/The Sexual Politics of Meat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Why We Love Dogs, Eat Pigs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/This Is Vegan Propaganda/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Philosophers on Animals/i)).toBeNull(); // Philosophers on Animals removed
    expect(screen.queryByText(/Aphro-ism/i)).toBeNull(); // Aphro-ism removed
    expect(screen.getAllByText(/Comprar a Amazon/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Com a afiliat d'Amazon/i).length).toBeGreaterThan(0);

    // Section 4: Practical (Supplements, Cosmetics, Directories, Textiles)
    expect(screen.getAllByText(/Vegan Vitality/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cruelty-Free Kitty/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Leaping Bunny Program/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Good On You/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/vegancheatsheet.org/i).length).toBeGreaterThan(0);

    // Section 5: Història
    expect(screen.getAllByText(/Elsie Shrigley/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Carol J. Adams/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Melanie Joy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Jack Symes/i).length).toBeGreaterThan(0);
  });

  it("renders in English when language is en", () => {
    setLanguage("en");
    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Why" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Videos" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Books" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Practical" })).toBeDefined();
    expect(screen.getByRole("link", { name: "History" })).toBeDefined();
  });
});
