// @vitest-environment jsdom
/**
 * @file ValuesPage.test.tsx
 * @description Unit tests for the Ethical Manifesto & Values public page.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ValuesPage } from "./ValuesPage";

describe("ValuesPage", () => {
  it("renders ethical manifesto heading, core principles, and back link", () => {
    render(
      <MemoryRouter>
        <ValuesPage />
      </MemoryRouter>,
    );

    // Title and Hero
    expect(
      screen.getByRole("heading", {
        name: /Why we created Vegan Tools|Per què hem creat Vegan Tools/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByText(/Ethical Manifesto & Values|Manifest Ètic & Carta de Valors/i),
    ).toBeDefined();

    // 5 Core Sections
    expect(
      screen.getByText(/Animal ethics, not a temporary trend|Ètica animal, no pas una moda/i),
    ).toBeDefined();
    expect(screen.getByText(/Safe Space|Espai Segur \(Safe Space\)/i)).toBeDefined();
    expect(
      screen.getByText(/Rigor and honesty with ingredients|Rigor i honestedat amb els ingredients/i),
    ).toBeDefined();
    expect(
      screen.getByText(/True privacy: zero ads, zero tracking|Privacitat real: sense anuncis ni rastreig/i),
    ).toBeDefined();
    expect(screen.getByText(/Open source and community|Codi obert i comunitat/i)).toBeDefined();

    // Back link
    expect(screen.getByRole("link", { name: /Back to Home|Torna a l'inici/i })).toBeDefined();
  });
});
