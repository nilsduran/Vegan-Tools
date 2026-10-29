// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ALL_FILTERS, CATEGORY_FILTERS, filterRestaurants } from "./FilterPills";
import type { RestaurantCandidate } from "@vegan-tools/domain";

describe("FilterPills consolidation and matching logic", () => {
  it("does not have standalone 'ramen' or 'fish_and_chips' filter pills", () => {
    const hasRamen = CATEGORY_FILTERS.some((f) => f.id === "ramen");
    const hasFishChips = CATEGORY_FILTERS.some((f) => f.id === "fish_and_chips");
    expect(hasRamen).toBe(false);
    expect(hasFishChips).toBe(false);
  });

  it("separates 'cafe' and 'bakery_pastry' without confusing 'cafe_bakery' overlap", () => {
    const hasCafeBakery = CATEGORY_FILTERS.some((f) => f.id === "cafe_bakery");
    expect(hasCafeBakery).toBe(false);

    const cafeFilter = CATEGORY_FILTERS.find((f) => f.id === "cafe");
    expect(cafeFilter).toBeDefined();
    expect(cafeFilter?.labelKey).toBe("Cafe");

    const bakeryPastryFilter = CATEGORY_FILTERS.find((f) => f.id === "bakery_pastry");
    expect(bakeryPastryFilter).toBeDefined();
    expect(bakeryPastryFilter?.labelKey).toBe("Bakery & Pastry");
  });

  it("has consolidated 'bakery_pastry' filter pill", () => {
    const bakeryPastry = CATEGORY_FILTERS.find((f) => f.id === "bakery_pastry");
    expect(bakeryPastry).toBeDefined();
    expect(bakeryPastry?.labelKey).toBe("Bakery & Pastry");

    // Matches both bakery/forn and pastry/croissant
    const fornPlace: RestaurantCandidate = {
      id: "forn-1",
      name: "Forn Sant Jordi",
      address: "Carrer Major 1",
      latitude: 41.38,
      longitude: 2.16,
      mapUrl: "https://example.com",
      provider: "openstreetmap",
      tags: ["bakery", "forn"],
    };
    const pastryPlace: RestaurantCandidate = {
      id: "pastry-1",
      name: "La Besneta",
      address: "Carrer de Torrijos 37",
      latitude: 41.40,
      longitude: 2.15,
      mapUrl: "https://example.com",
      provider: "openstreetmap",
      tags: ["pastisseria", "croissant"],
    };

    expect(bakeryPastry?.match(fornPlace)).toBe(true);
    expect(bakeryPastry?.match(pastryPlace)).toBe(true);
  });

  it("matches ramen, noodles, udon, pho, and Asian cuisine with 'asian' filter", () => {
    const asianFilter = ALL_FILTERS.find((f) => f.id === "asian");
    expect(asianFilter).toBeDefined();

    const ramenShop: RestaurantCandidate = {
      id: "ramen-1",
      name: "Vegan Ramen House",
      address: "Carrer d'Aragó 100",
      latitude: 41.39,
      longitude: 2.16,
      mapUrl: "https://example.com",
      provider: "openstreetmap",
      cuisine: "ramen",
      tags: ["japanese", "noodles"],
    };
    const udonShop: RestaurantCandidate = {
      id: "udon-1",
      name: "Tokyo Udon & Soba",
      address: "Carrer de Balmes 50",
      latitude: 41.39,
      longitude: 2.16,
      mapUrl: "https://example.com",
      provider: "openstreetmap",
      tags: ["udon", "soba"],
    };
    const generalAsian: RestaurantCandidate = {
      id: "asian-1",
      name: "Desoriente Asian Tapas",
      address: "Carrer de Ramon Turró 209",
      latitude: 41.40,
      longitude: 2.20,
      mapUrl: "https://example.com",
      provider: "openstreetmap",
      tags: ["asian", "thai", "vietnamese"],
    };

    expect(asianFilter?.match(ramenShop)).toBe(true);
    expect(asianFilter?.match(udonShop)).toBe(true);
    expect(asianFilter?.match(generalAsian)).toBe(true);

    const candidates = [ramenShop, udonShop, generalAsian];
    const filtered = filterRestaurants(candidates, ["asian"]);
    expect(filtered).toHaveLength(3);
  });
});
