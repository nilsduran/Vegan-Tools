// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  getCachedRestaurant,
  getCachedRestaurantsMap,
  saveCachedRestaurant,
  saveCachedRestaurants,
} from "./restaurantCache";
import type { RestaurantCandidate } from "@vegan-tools/domain";

describe("restaurantCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockCandidate: RestaurantCandidate = {
    id: "node-12345",
    name: "Bar Celona Vegan",
    address: "Carrer del Vegà, 12, Barcelona",
    latitude: 41.3879,
    longitude: 2.1699,
    mapUrl: "https://www.openstreetmap.org/node/12345",
    provider: "openstreetmap",
    cuisine: "tapas",
    isVegan: true,
  };

  it("stores and retrieves a restaurant candidate from cache", () => {
    expect(getCachedRestaurant("node-12345")).toBeUndefined();

    saveCachedRestaurant(mockCandidate);

    const retrieved = getCachedRestaurant("node-12345");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Bar Celona Vegan");
    expect(retrieved?.cuisine).toBe("tapas");
  });

  it("stores multiple restaurant candidates and prunes when exceeding max limit", () => {
    const list: RestaurantCandidate[] = Array.from({ length: 110 }, (_, i) => ({
      ...mockCandidate,
      id: `place-${i}`,
      name: `Place ${i}`,
    }));

    saveCachedRestaurants(list);

    const map = getCachedRestaurantsMap();
    const keys = Object.keys(map);
    expect(keys.length).toBeLessThanOrEqual(100);
    // Recent items should be retained
    expect(getCachedRestaurant("place-109")).toBeDefined();
  });
});
