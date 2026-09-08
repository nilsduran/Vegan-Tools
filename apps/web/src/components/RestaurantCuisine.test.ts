// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { getCuisineIcon } from "./RestaurantMap";
import { getCuisineTags } from "./RestaurantDetailPane";

const baseRestaurant: RestaurantCandidate = {
  id: "test",
  name: "Test",
  address: "Test",
  latitude: 41.38,
  longitude: 2.16,
  mapUrl: "https://example.com",
  provider: "curated",
};

describe("Restaurant Cuisine and Badges Classification", () => {
  it("returns single cuisine icon for brunch with sandwich icon (🥪)", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-brunch",
      name: "Asante Vegan Brunch",
      address: "Carrer del Brunch 1",
      tags: ["brunch", "breakfast"],
    };
    expect(getCuisineIcon(r)).toBe("🥪");
  });

  it("returns single cuisine icon for coffee / cafeteria (☕)", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-cafe",
      name: "Specialty Coffee Bar",
      address: "Carrer del Cafè 2",
      tags: ["coffee", "matcha"],
    };
    expect(getCuisineIcon(r)).toBe("☕");
  });

  it("returns single cuisine icon for fleca / bakery (🥖)", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-fleca",
      name: "Forn Artesà de Pa",
      address: "Carrer de la Fleca 3",
      tags: ["bakery", "panaderia"],
    };
    expect(getCuisineIcon(r)).toBe("🥖");
  });

  it("returns single cuisine icon for pastisseria / pastry (🥐)", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-pastisseria",
      name: "La Besneta Pastisseria Vegana",
      address: "Carrer Dolç 4",
      tags: ["pastisseria", "croissant", "cake"],
    };
    expect(getCuisineIcon(r)).toBe("🥐");
  });

  it("returns cutlery (🍽️) for venues without specific cuisine classification", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-unclassified",
      name: "General Dining Place",
      address: "Carrer General 5",
      tags: [],
    };
    expect(getCuisineIcon(r)).toBe("🍽️");
  });

  it("separates Brunch and Cafeteria into distinct tags in RestaurantDetailPane", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-brunch-cafe",
      name: "Asante Brunch & Coffee",
      address: "Carrer 6",
      tags: ["brunch", "coffee"],
    };
    const tags = getCuisineTags(r);
    expect(tags).toEqual(
      expect.arrayContaining([
        { icon: "🥪", label: "Brunch" },
        { icon: "☕", label: "Cafeteria" },
      ]),
    );
  });

  it("separates Fleca and Pastisseria into distinct tags", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-fleca-pastisseria",
      name: "Forn i Pastisseria Hanai",
      address: "Carrer 7",
      tags: ["forn", "bakery", "croissant", "pastry"],
    };
    const tags = getCuisineTags(r);
    expect(tags).toEqual(
      expect.arrayContaining([
        { icon: "🥖", label: "Fleca" },
        { icon: "🥐", label: "Pastisseria" },
      ]),
    );
  });

  it("returns olive (🫒) for tapas and pinchos", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-tapas",
      name: "La Perra Verde Tapas",
      address: "Carrer 8",
      tags: ["tapas", "pinchos"],
    };
    expect(getCuisineIcon(r)).toBe("🫒");
    const tags = getCuisineTags(r);
    expect(tags).toEqual(
      expect.arrayContaining([{ icon: "🫒", label: "Tapas" }]),
    );
  });

  it("returns grill flame (🔥) for steakhouse, BBQ, or brasa (never meat icon)", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-bbq",
      name: "Vegan BBQ & Grill Smokehouse",
      address: "Carrer 9",
      tags: ["bbq", "grill"],
    };
    expect(getCuisineIcon(r)).toBe("🔥");
    const tags = getCuisineTags(r);
    expect(tags).toEqual(
      expect.arrayContaining([{ icon: "🔥", label: "Grill & BBQ" }]),
    );
  });

  it("returns salad bowl (🥗) for poke bowls and healthy raw food", () => {
    const r: RestaurantCandidate = {
      ...baseRestaurant,
      id: "test-poke",
      name: "Green Poke Bowl Bar",
      address: "Carrer 10",
      tags: ["poke", "bowl", "healthy"],
    };
    expect(getCuisineIcon(r)).toBe("🥗");
  });
});
