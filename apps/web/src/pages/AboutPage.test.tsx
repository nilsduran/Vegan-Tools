// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders principles and open-source GitHub repository link", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    // Header & Principles
    expect(screen.getByText(/About Vegan Tools|Sobre Vegan Tools/i)).toBeDefined();
    expect(screen.getByText(/Animal Liberation|Alliberament Animal/i)).toBeDefined();
    expect(screen.getByText(/Safe Space|Espai Segur/i)).toBeDefined();
    expect(screen.getByText(/Zero-Tracking|Sense rastreig/i)).toBeDefined();
    expect(screen.getByText(/Rigor and honesty with ingredients|Rigor i honestedat amb els ingredients|Ingredient Rigor/i)).toBeDefined();

    // GitHub repository link
    const githubLink = screen.getByRole("link", { name: /View on GitHub|Veure el codi a GitHub/i });
    expect(githubLink.getAttribute("href")).toBe("https://github.com/nilsduran/Vegan-Tools");
  });
});
