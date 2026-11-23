// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { BrandEthics, UniversalScanResult } from "@vegan-tools/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

const getBrandEthics = vi.fn<(brand: string, language: string) => Promise<BrandEthics>>();
vi.mock("../api", () => ({ getBrandEthics: (brand: string, language: string) => getBrandEthics(brand, language) }));

import { UniversalResult } from "./UniversalResult";

const cleanser: UniversalScanResult = {
  subject: "cosmetic",
  title: "Hydrating Cleanser",
  brand: "SomeBrand",
  verdict: "unknown",
  reason: "The ingredient list could not be checked.",
  concerns: ["Possible animal testing"],
  alternatives: [],
  findings: [],
  traces: [],
  assurance: "unverified",
  sources: [],
};

function renderResult(result: UniversalScanResult) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UniversalResult result={result} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  getBrandEthics.mockReset();
});

describe("UniversalResult for cosmetics", () => {
  it("waits for the brand check and then gives one verdict", async () => {
    let answer: (value: BrandEthics) => void = () => {};
    getBrandEthics.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderResult(cleanser);

    // No verdict yet, so nothing can be contradicted a moment later.
    expect(screen.getByRole("status").textContent).toMatch(/brand tests on animals/i);
    expect(screen.queryByText(/Unknown|Desconegut/)).toBeNull();

    answer({
      brand: "SomeBrand",
      status: "tests_on_animals",
      summary: "Sold where animal testing is required.",
      parentCompany: "Parent Group",
      sources: [],
      checkedAt: "2026-11-23T00:00:00.000Z",
    });
    expect(await screen.findByText(/Not cruelty-free: the brand or its parent company tests on animals/)).toBeTruthy();
    expect(screen.getByText("Not vegan")).toBeTruthy();
    // The model's guess ("possible animal testing") would only repeat it vaguely.
    expect(screen.queryByText("Possible animal testing")).toBeNull();
  });

  it("does not wait when the ingredients already say it is not vegan", () => {
    getBrandEthics.mockReturnValue(new Promise(() => {}));
    renderResult({ ...cleanser, verdict: "probably_vegetarian", reason: "Contains honey.", concerns: [] });
    expect(screen.getByText("Contains honey.")).toBeTruthy();
  });

  it("keeps the product's own verdict when the brand is cruelty-free", async () => {
    getBrandEthics.mockResolvedValue({
      brand: "SomeBrand",
      status: "cruelty_free",
      summary: "Leaping Bunny certified.",
      sources: [],
      checkedAt: "2026-11-23T00:00:00.000Z",
    });
    renderResult({ ...cleanser, verdict: "probably_vegan", reason: "No animal ingredient found.", concerns: [] });
    expect(await screen.findByText("No animal ingredient found.")).toBeTruthy();
  });
});
