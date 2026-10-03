// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";

describe("Legal Pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders PrivacyPage content and zero-tracking commitment", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getAllByText(/Zero Tracking|Zero rastreig/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GDPR|RGPD/i).length).toBeGreaterThan(0);
  });

  it("renders TermsPage content, Safe Space policy, and medical disclaimer", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getAllByText(/Safe Space|Espai Segur/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Allergen|al·lèrgens/i).length).toBeGreaterThan(0);
  });
});
