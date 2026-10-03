// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadUserLists,
  isLiked,
  toggleLiked,
  isWantToGo,
  toggleWantToGo,
  createCustomList,
  deleteCustomList,
  toggleRestaurantInList,
  isRestaurantInList,
} from "./userLists.js";

describe("userLists utility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default lists (liked & want_to_go)", () => {
    const lists = loadUserLists();
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists.some((l) => l.id === "liked")).toBe(true);
    expect(lists.some((l) => l.id === "want_to_go")).toBe(true);
  });

  it("toggles liked status independently", () => {
    expect(isLiked("rest-123")).toBe(false);
    const nowLiked = toggleLiked("rest-123");
    expect(nowLiked).toBe(true);
    expect(isLiked("rest-123")).toBe(true);
    const unliked = toggleLiked("rest-123");
    expect(unliked).toBe(false);
    expect(isLiked("rest-123")).toBe(false);
  });

  it("toggles want to go (watchlist) status", () => {
    expect(isWantToGo("rest-456")).toBe(false);
    toggleWantToGo("rest-456");
    expect(isWantToGo("rest-456")).toBe(true);
    toggleWantToGo("rest-456");
    expect(isWantToGo("rest-456")).toBe(false);
  });

  it("creates and manages custom lists", () => {
    const custom = createCustomList("Brunch Spots", "The best vegan spots", true);
    expect(custom.id).toBeDefined();
    expect(custom.title).toBe("Brunch Spots");
    expect(custom.isPublic).toBe(true);

    toggleRestaurantInList(custom.id, "spot-1");
    expect(isRestaurantInList(custom.id, "spot-1")).toBe(true);

    const deleted = deleteCustomList(custom.id);
    expect(deleted).toBe(true);
    expect(isRestaurantInList(custom.id, "spot-1")).toBe(false);
  });

  it("prevents deleting default liked/want_to_go lists", () => {
    expect(deleteCustomList("liked")).toBe(false);
    expect(deleteCustomList("want_to_go")).toBe(false);
  });
});
