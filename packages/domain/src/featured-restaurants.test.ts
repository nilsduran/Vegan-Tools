import { describe, expect, it } from "vitest";
import { FEATURED_RESTAURANTS } from "./featured-restaurants.js";
import { restaurantCandidateSchema } from "./schemas.js";

describe("Featured / Curated Top Picks Quality & Ethics Guarantee", () => {
  it("contains at least 15 verified restaurants across cities", () => {
    expect(FEATURED_RESTAURANTS.length).toBeGreaterThanOrEqual(15);
  });

  it("strictly enforces 100% vegan compliance (isVegan === true)", () => {
    for (const restaurant of FEATURED_RESTAURANTS) {
      expect(restaurant.isVegan, `${restaurant.name} must be strictly 100% vegan`).toBe(true);
    }
  });

  it("strictly enforces isFeatured === true on all top picks", () => {
    for (const restaurant of FEATURED_RESTAURANTS) {
      expect(restaurant.isFeatured, `${restaurant.name} must have isFeatured flag`).toBe(true);
    }
  });

  it("has unique IDs for all featured venues", () => {
    const ids = FEATURED_RESTAURANTS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("passes restaurantCandidateSchema validation for every entry", () => {
    for (const restaurant of FEATURED_RESTAURANTS) {
      const parsed = restaurantCandidateSchema.safeParse(restaurant);
      expect(parsed.success, `Schema validation failed for ${restaurant.name}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    }
  });
});
