// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProductScannerPage } from "./ProductScannerPage.js";
import * as api from "../api.js";
import type { ProductResult } from "@vegan-tools/domain";

vi.mock("../api.js", () => ({
  getProduct: vi.fn(),
  classifyIngredientList: vi.fn(),
  extractIngredientText: vi.fn(),
  extractProductIngredientText: vi.fn(),
}));

vi.mock("../components/BarcodeCamera.js", () => ({
  BarcodeCamera: ({ onDetected }: { onDetected: (code: string) => void }) => (
    <div data-testid="mock-barcode-camera">
      <button type="button" onClick={() => onDetected("3017620422003")}>
        Simulate QR/Barcode Scan
      </button>
    </div>
  ),
}));

function renderScanner(initialEntry = "/product") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/product" element={<ProductScannerPage />} />
          <Route path="/product/:gtin" element={<ProductScannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProductScannerPage Form UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("allows entering a barcode manually and searching for it", async () => {
    const user = userEvent.setup();
    const mockProduct: ProductResult = {
      gtin: "3017620422003",
      productName: "Nutella",
      brand: "Ferrero",
      verdict: "vegetarian",
      assurance: "external",
      definitive: false,
      reason: "Contains milk and whey powder.",
      matchedIngredients: ["milk", "whey"],
      findings: [
        {
          id: "milk",
          name: "Milk",
          matchedAlias: "milk",
          status: "vegetarian",
          reason: "Animal-derived milk product",
          substitutions: [],
        },
      ],
      classifierVersion: "1.0",
      traces: [],
      revision: 1,
      evidence: [],
    };

    vi.mocked(api.getProduct).mockResolvedValueOnce(mockProduct);

    renderScanner("/product");

    const input = screen.getByLabelText(/enter barcode/i);
    expect(input).toBeDefined();

    await user.type(input, "3017620422003");
    expect((input as HTMLInputElement).value).toBe("3017620422003");

    const searchButton = screen.getByRole("button", { name: /look up/i });
    expect(searchButton).toBeDefined();

    await user.click(searchButton);

    await waitFor(() => {
      expect(api.getProduct).toHaveBeenCalledWith("3017620422003");
    });

    expect(await screen.findByText("Nutella")).toBeDefined();
    expect(screen.getByText("Vegetarian", { selector: ".verdict" })).toBeDefined();
  });

  it("handles QR/barcode camera detection event", async () => {
    const user = userEvent.setup();
    const mockProduct: ProductResult = {
      gtin: "3017620422003",
      productName: "Oat Milk",
      brand: "Oatly",
      verdict: "vegan",
      assurance: "external",
      definitive: false,
      reason: "Pure plant-based oat drink.",
      matchedIngredients: ["oats", "water"],
      findings: [],
      classifierVersion: "1.0",
      traces: [],
      revision: 1,
      evidence: [],
    };

    vi.mocked(api.getProduct).mockResolvedValueOnce(mockProduct);

    renderScanner("/product");

    const scanButton = screen.getByText("Simulate QR/Barcode Scan");
    await user.click(scanButton);

    await waitFor(() => {
      expect(api.getProduct).toHaveBeenCalledWith("3017620422003");
    });

    expect(await screen.findByText("Oat Milk")).toBeDefined();
    expect(screen.getByText("Vegan", { selector: ".verdict" })).toBeDefined();
  });

  it("switches to Ingredients mode and classifies typed ingredient text", async () => {
    const user = userEvent.setup();

    vi.mocked(api.classifyIngredientList).mockResolvedValueOnce({
      verdict: "vegan",
      assurance: "label_based",
      definitive: true,
      reason: "All identified ingredients appear plant-based.",
      findings: [],
      matchedIngredients: ["water", "sugar", "soy"],
      traces: [],
      classifierVersion: "1.0",
    });

    renderScanner("/product");

    const ingredientsTab = screen.getByRole("tab", { name: /ingredients/i });
    await user.click(ingredientsTab);

    const textarea = screen.getByPlaceholderText(/Ingredients: cocoa mass/i);
    expect(textarea).toBeDefined();

    await user.type(textarea, "Water, sugar, soy lecithin");

    const checkButton = screen.getByRole("button", { name: /check ingredients/i });
    expect(checkButton).toBeDefined();

    await user.click(checkButton);

    expect(await screen.findByText("All identified ingredients appear plant-based.")).toBeDefined();
    expect(api.classifyIngredientList).toHaveBeenCalledWith(
      "Water, sugar, soy lecithin",
      expect.anything(),
    );
  });

  it("shows an error banner when the API network request fails", async () => {
    vi.mocked(api.getProduct).mockRejectedValueOnce(
      new Error("Could not reach the Vegan Tools API. fetch failed"),
    );

    renderScanner("/product/3017620422003");

    expect(
      await screen.findByText(/Could not reach the Vegan Tools API. fetch failed/i),
    ).toBeDefined();
  });
});
