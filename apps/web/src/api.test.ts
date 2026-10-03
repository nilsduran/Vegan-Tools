import { describe, expect, it } from "vitest";
import { clearRestaurantSearchCache, sourcePdfPageUrl } from "./api.js";

describe("menu source links", () => {
  it("targets a specific PDF page without a conflicting text-search fragment", () => {
    expect(sourcePdfPageUrl("https://example.com/menu.pdf", 4)).toBe(
      "https://example.com/menu.pdf#page=4&zoom=page-width",
    );
  });
});

describe("searchRestaurants client cache", () => {
  it("clears cached restaurant entries", () => {
    expect(typeof clearRestaurantSearchCache).toBe("function");
    expect(() => clearRestaurantSearchCache()).not.toThrow();
  });
});
