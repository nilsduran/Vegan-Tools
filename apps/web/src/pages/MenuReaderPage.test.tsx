// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MenuReaderPage } from "./MenuReaderPage.js";
import * as api from "../api.js";
import type { MenuDraft, RestaurantCandidate } from "@vegan-tools/domain";

vi.mock("../api.js", () => ({
  searchRestaurants: vi.fn().mockResolvedValue([]),
  resolveRestaurant: vi.fn(),
  discoverRestaurantMenu: vi.fn(),
  createRestaurantMenuAnalysis: vi.fn(),
  getRecentRestaurantMenus: vi.fn().mockResolvedValue([]),
  getMenuDraft: vi.fn(),
  getApproximateLocation: vi.fn().mockResolvedValue({
    latitude: 41.3879,
    longitude: 2.1699,
    city: "Barcelona",
  }),
}));

function createFakeFile(name: string, type: string, size = 1024): File {
  const blob = new Blob(["%PDF-1.4 fake content"], { type });
  return new File([blob], name, { type });
}

describe("MenuReaderPage Form UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("allows searching for a restaurant and selecting a candidate", async () => {
    const candidate: RestaurantCandidate = {
      id: "foursquare-123",
      name: "Teresa Carles",
      address: "Carrer de Jovellanos, 2, Barcelona",
      latitude: 41.385,
      longitude: 2.168,
      websiteUrl: "https://teresacarles.com",
      mapUrl: "https://foursquare.com/v/123",
      provider: "foursquare",
    };

    vi.mocked(api.searchRestaurants).mockImplementation(async (q) => {
      if (typeof q === "string" && q.includes("Teresa Carles")) {
        return [candidate];
      }
      return [];
    });
    vi.mocked(api.resolveRestaurant).mockResolvedValue(candidate);
    vi.mocked(api.discoverRestaurantMenu).mockResolvedValue({
      id: "menu-123",
      editToken: "token-123",
      status: "processing",
      restaurantName: "Teresa Carles",
      sourceLabel: "Website menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "ca",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole("textbox", { name: /search for a restaurant/i });
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: "Teresa Carles Barcelona" } });
    const searchButton = screen.getByRole("button", { name: /search restaurants/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.searchRestaurants).toHaveBeenCalledWith(
        "Teresa Carles Barcelona",
      );
    });

    expect(await screen.findByText("Teresa Carles")).toBeDefined();
    expect(screen.getByText("Carrer de Jovellanos, 2, Barcelona")).toBeDefined();

    const useButton = screen.getByRole("button", { name: /^(?:menu|carta)$/i });
    fireEvent.click(useButton);

    await waitFor(() => {
      expect(api.resolveRestaurant).toHaveBeenCalledWith(candidate);
    });

    expect(await screen.findByText("Opcions veganes")).toBeDefined();
  });

  it("handles PDF menu upload and triggers analysis", async () => {
    const user = userEvent.setup();
    const pdfFile = createFakeFile("lunch-menu.pdf", "application/pdf");

    const mockDraft: MenuDraft = {
      id: "menu-draft-pdf",
      editToken: "token-pdf",
      status: "processing",
      restaurantName: "",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "en",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    vi.mocked(api.createRestaurantMenuAnalysis).mockResolvedValueOnce(mockDraft);

    const { container } = render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(await screen.findByText("lunch-menu.pdf")).toBeDefined();
    expect(screen.getByText(/1 page ready|1 pàgina a punt/i)).toBeDefined();

    const analyzeButton = screen.getByRole("button", { name: /analyze menu|analitza la carta|analitza el menú/i });
    expect((analyzeButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(analyzeButton);

    await waitFor(() => {
      expect(api.createRestaurantMenuAnalysis).toHaveBeenCalledWith(
        [pdfFile],
        undefined,
      );
    });
  });

  it("handles PNG image menu upload and triggers analysis", async () => {
    const user = userEvent.setup();
    const pngFile = createFakeFile("dinner-menu.png", "image/png");

    const mockDraft: MenuDraft = {
      id: "menu-draft-png",
      editToken: "token-png",
      status: "processing",
      restaurantName: "",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "en",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    vi.mocked(api.createRestaurantMenuAnalysis).mockResolvedValueOnce(mockDraft);

    const { container } = render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    expect(await screen.findByText("dinner-menu.png")).toBeDefined();

    const analyzeButton = screen.getByRole("button", { name: /analyze menu|analitza la carta|analitza el menú/i });
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(api.createRestaurantMenuAnalysis).toHaveBeenCalledWith(
        [pngFile],
        undefined,
      );
    });
  });

  it("handles a mix of PDF and multiple PNG images together", async () => {
    const user = userEvent.setup();
    const pdfFile = createFakeFile("drinks.pdf", "application/pdf");
    const pngFile1 = createFakeFile("starters.png", "image/png");
    const pngFile2 = createFakeFile("mains.png", "image/png");

    const mockDraft: MenuDraft = {
      id: "menu-draft-mix",
      editToken: "token-mix",
      status: "processing",
      restaurantName: "",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "en",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    vi.mocked(api.createRestaurantMenuAnalysis).mockResolvedValueOnce(mockDraft);

    const { container } = render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const fileInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [pdfFile, pngFile1, pngFile2] } });

    expect(await screen.findByText("drinks.pdf")).toBeDefined();
    expect(screen.getByText("starters.png")).toBeDefined();
    expect(screen.getByText("mains.png")).toBeDefined();
    expect(screen.getByText(/3 pages ready|3 pàgines a punt/i)).toBeDefined();

    const analyzeButton = screen.getByRole("button", { name: /analyze menu|analitza la carta|analitza el menú/i });
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(api.createRestaurantMenuAnalysis).toHaveBeenCalledWith(
        [pdfFile, pngFile1, pngFile2],
        undefined,
      );
    });
  });
});
