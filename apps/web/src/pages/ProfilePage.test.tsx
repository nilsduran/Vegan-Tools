// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import { saveVisitLog, setUserTop4 } from "../utils/diary";

vi.mock("../api", () => ({
  getUserReviews: vi.fn().mockResolvedValue([]),
  deleteRestaurantReview: vi.fn().mockResolvedValue(undefined),
}));

describe("ProfilePage with Letterboxd Diary & Top 4", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders profile header and Top 4 section", () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /My Profile/i })).toBeDefined();
    expect(screen.getByText(/Top 4 Restaurants/i)).toBeDefined();
    expect(screen.getByText(/My Visit Diary/i)).toBeDefined();
  });

  it("displays rating histogram and visit logs when entries exist", () => {
    saveVisitLog({
      restaurantId: "featured-roots-bcn",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.5,
      notes: "Phenomenal brunch and burgers!",
      dishesTried: ["Roots Burger"],
    });

    setUserTop4(["featured-roots-bcn"]);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Rating distribution/i)).toBeDefined();
    expect(screen.getByText(/Phenomenal brunch and burgers!/i)).toBeDefined();
    expect(screen.getByText(/Roots Burger/i)).toBeDefined();
  });
});
