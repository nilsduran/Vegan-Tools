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
  discoverMenuByUrl: vi.fn(),
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

  it(
    "allows searching for a restaurant and selecting a candidate",
    async () => {
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
        expect.anything(),
      );
    });

    expect(await screen.findByText("Teresa Carles")).toBeDefined();
    expect(screen.getByText(/Carrer de Jovellanos, 2, Barcelona/)).toBeDefined();

    const useButton = screen.getByRole("button", { name: /^(?:menu|carta)$/i });
    fireEvent.click(useButton);

    await waitFor(() => {
      expect(api.resolveRestaurant).toHaveBeenCalledWith(candidate);
      expect(api.discoverRestaurantMenu).toHaveBeenCalledWith(candidate, "https://teresacarles.com");
    });

    expect(await screen.findByRole("button", { name: /back to map/i })).toBeDefined();
  }, 15000);

  it("clears search query and results when clicking the X clear button", async () => {
    const candidate: RestaurantCandidate = {
      id: "foursquare-456",
      name: "Roots Vegan",
      address: "Gran Via, Barcelona",
      latitude: 41.388,
      longitude: 2.165,
      mapUrl: "https://foursquare.com/v/456",
      provider: "foursquare",
    };

    vi.mocked(api.searchRestaurants).mockImplementation(async (q) => {
      if (typeof q === "string" && q.includes("Roots")) {
        return [candidate];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole("textbox", { name: /search for a restaurant/i });
    fireEvent.change(searchInput, { target: { value: "Roots" } });

    const searchButton = screen.getByRole("button", { name: /search restaurants/i });
    fireEvent.click(searchButton);

    expect(await screen.findByText("Roots Vegan")).toBeDefined();

    // Clear button should be visible
    const clearButton = screen.getByRole("button", { name: /clear|neteja|remove|elimina/i });
    expect(clearButton).toBeDefined();

    fireEvent.click(clearButton);

    // Search query and results should be wiped
    expect((searchInput as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Roots Vegan")).toBeNull();
  });

  it("filters restaurants with AND flags and OR categories", async () => {
    const candidateVeganItalian: RestaurantCandidate = {
      id: "r1",
      name: "Vegan Italian Pasta",
      address: "Carrer de Balmes, 1",
      latitude: 41.38,
      longitude: 2.16,
      mapUrl: "https://example.com/1",
      provider: "curated",
      cuisine: "italian",
      tags: ["vegan", "italian"],
      isVegan: true,
      rating: 4.8,
    };
    const candidateVeganAsian: RestaurantCandidate = {
      id: "r2",
      name: "Vegan Ramen Bar",
      address: "Carrer d'Aragó, 10",
      latitude: 41.39,
      longitude: 2.15,
      mapUrl: "https://example.com/2",
      provider: "curated",
      cuisine: "asian",
      tags: ["vegan", "asian"],
      isVegan: true,
      rating: 4.9,
    };
    const candidateNonVeganItalian: RestaurantCandidate = {
      id: "r3",
      name: "Classic Italian Trattoria",
      address: "Carrer de Mallorca, 50",
      latitude: 41.39,
      longitude: 2.16,
      mapUrl: "https://example.com/3",
      provider: "openstreetmap",
      cuisine: "italian",
      tags: ["italian"],
      isVegan: false,
      rating: 4.2,
    };

    vi.mocked(api.searchRestaurants).mockResolvedValue([
      candidateVeganItalian,
      candidateVeganAsian,
      candidateNonVeganItalian,
    ]);

    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole("textbox", { name: /search for a restaurant/i });
    fireEvent.change(searchInput, { target: { value: "Barcelona" } });
    const searchButton = screen.getByRole("button", { name: /search restaurants/i });
    fireEvent.click(searchButton);

    expect(await screen.findAllByText("Vegan Italian Pasta")).toBeDefined();
    expect(screen.getAllByText("Vegan Ramen Bar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Classic Italian Trattoria").length).toBeGreaterThan(0);

    // 1. Filter by 100% Vegan (Flag: AND constraint)
    const veganPill = screen.getByRole("button", { name: /100% vegà|100% vegan/i });
    fireEvent.click(veganPill);

    const resultsList = document.querySelector(".restaurant-results") as HTMLElement;

    // Only the 2 vegan places remain in the results list
    expect(resultsList.textContent).toContain("Vegan Italian Pasta");
    expect(resultsList.textContent).toContain("Vegan Ramen Bar");
    expect(resultsList.textContent).not.toContain("Classic Italian Trattoria");

    // 2. Open Filters dropdown to select Italian (Category: OR)
    const filtersBtn = screen.getByRole("button", { name: /filtres|filters/i });
    fireEvent.click(filtersBtn);

    const italianPill = screen.getByRole("button", { name: /italià|italian/i });
    fireEvent.click(italianPill);

    // Now matches Vegan AND Italian -> only Vegan Italian Pasta
    expect(resultsList.textContent).toContain("Vegan Italian Pasta");
    expect(resultsList.textContent).not.toContain("Vegan Ramen Bar");

    // 3. Also select Asian (Category OR: matches Vegan AND (Italian OR Asian))
    const asianPill = screen.getByRole("button", { name: /asiàtic|asian/i });
    fireEvent.click(asianPill);

    // Both vegan italian and vegan asian match!
    expect(resultsList.textContent).toContain("Vegan Italian Pasta");
    expect(resultsList.textContent).toContain("Vegan Ramen Bar");
    expect(resultsList.textContent).not.toContain("Classic Italian Trattoria");
  });

  it("filters strictly by 4+ leaves rating and hides unrated places", async () => {
    const ratedTop: RestaurantCandidate = {
      id: "r1",
      name: "Top Rated Vegan",
      address: "Carrer de Balmes, 1",
      latitude: 41.38,
      longitude: 2.16,
      mapUrl: "https://example.com/1",
      provider: "curated",
      isVegan: true,
      rating: 4.8,
    };
    const unratedPlace: RestaurantCandidate = {
      id: "r2",
      name: "Unrated New Spot",
      address: "Carrer d'Aragó, 10",
      latitude: 41.39,
      longitude: 2.15,
      mapUrl: "https://example.com/2",
      provider: "openstreetmap",
      isVegan: true,
    };

    vi.mocked(api.searchRestaurants).mockResolvedValue([ratedTop, unratedPlace]);

    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole("textbox", { name: /search for a restaurant/i });
    fireEvent.change(searchInput, { target: { value: "Barcelona" } });
    const searchButton = screen.getByRole("button", { name: /search restaurants/i });
    fireEvent.click(searchButton);

    expect(await screen.findAllByText("Top Rated Vegan")).toBeDefined();
    expect(screen.getAllByText("Unrated New Spot").length).toBeGreaterThan(0);

    // Toggle 4+ leaves filter pill
    const leavesPill = screen.getByRole("button", { name: /4\+ fulles|4\+ leaves/i });
    fireEvent.click(leavesPill);

    const resultsList = document.querySelector(".restaurant-results") as HTMLElement;

    // Only rated place remains; unrated place is filtered out
    expect(resultsList.textContent).toContain("Top Rated Vegan");
    expect(resultsList.textContent).not.toContain("Unrated New Spot");
  });

  it("expands category filters drawer when clicking the Filters funnel button", async () => {
    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const filtersBtn = screen.getByRole("button", { name: /filtres|filters/i });
    expect(filtersBtn).toBeDefined();

    fireEvent.click(filtersBtn);

    // Category filters should now be visible
    expect(screen.getByRole("button", { name: /^restaurant$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /mediterrani|mediterranean/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /gelats|ice cream/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sense gluten|gluten-free/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cuina catalana|catalan cuisine/i })).toBeDefined();
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
      id: "menu-draft-mixed",
      editToken: "token-mixed",
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

  it("handles discovering a menu by pasting a website URL", async () => {
    const mockDraft: MenuDraft = {
      id: "menu-draft-greta",
      editToken: "token-greta",
      status: "processing",
      restaurantName: "Greta",
      sourceLabel: "Website menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "ca",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    vi.mocked(api.discoverMenuByUrl).mockResolvedValueOnce(mockDraft);

    render(
      <MemoryRouter>
        <MenuReaderPage />
      </MemoryRouter>
    );

    const urlInput = screen.getByRole("textbox", { name: /website or menu link|enllaç de la carta o web/i });
    fireEvent.change(urlInput, {
      target: { value: "https://www.restaurantgreta.com/cat/catala-carta-restaurant-greta" },
    });

    const submitUrlBtn = screen.getByRole("button", { name: /find menu|cerca la carta/i });
    fireEvent.click(submitUrlBtn);

    await waitFor(() => {
      expect(api.discoverMenuByUrl).toHaveBeenCalledWith(
        "https://www.restaurantgreta.com/cat/catala-carta-restaurant-greta",
        undefined,
      );
    });
  });
});
