// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";
import { setLanguage } from "../i18n";

describe("HomePage Spotlight Cards", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders quick cards in English with no obsolete badges or buttons", () => {
    setLanguage("en");
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Recipe card
    expect(screen.getByRole("heading", { name: /Recipes/i })).toBeDefined();

    // Resources card in English
    expect(screen.getByRole("heading", { name: /Understand veganism/i })).toBeDefined();
    expect(screen.getByText(/History from ancient origins to modern thinkers/i)).toBeDefined();

    // Obsolete tags must NOT exist
    expect(screen.queryByText(/RECURSOS & APRENENTATGE/i)).toBeNull();
    expect(screen.queryByText(/Explora recursos/i)).toBeNull();
  });

  it("renders quick cards in Catalan when language is ca", () => {
    setLanguage("ca");
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Receptes/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Comprendre el veganisme/i })).toBeDefined();
    expect(screen.getByText(/Història des dels orígens antics fins a pensadores modernes/i)).toBeDefined();

    expect(screen.queryByText(/RECURSOS & APRENENTATGE/i)).toBeNull();
    expect(screen.queryByText(/Explora recursos/i)).toBeNull();
  });
});
