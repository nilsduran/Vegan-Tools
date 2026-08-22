// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { RestaurantReviews } from "./RestaurantReviews";
import { AuthProvider } from "../auth";
import { setLanguage } from "../i18n";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import * as api from "../api";

const mockRestaurant: RestaurantCandidate = {
  id: "rest-test-1",
  name: "Veggie Garden",
  address: "Carrer dels Àngels 3, Barcelona",
  latitude: 41.383,
  longitude: 2.168,
  mapUrl: "https://maps.example.com",
  provider: "openstreetmap",
};

describe("RestaurantReviews Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLanguage("ca");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty state when there are no reviews", async () => {
    vi.spyOn(api, "getRestaurantReviews").mockResolvedValue({
      reviews: [],
      stats: {
        averageLeaves: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    render(
      <AuthProvider>
        <RestaurantReviews restaurant={mockRestaurant} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Sense valoracions encara|No ratings yet/i)
      ).toBeDefined();
    });

    expect(
      screen.getByText(/Aquest restaurant encara no té valoracions|This restaurant does not have community reviews/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Valorar amb fulles|Rate with leaves/i })).toBeDefined();
  });

  it("displays community reviews and leaves score badge", async () => {
    vi.spyOn(api, "getRestaurantReviews").mockResolvedValue({
      reviews: [
        {
          id: "r-1",
          restaurantId: "rest-test-1",
          userId: "u-1",
          userName: "Clara",
          leavesScore: 5,
          comment: "Menjar increïble i 100% vegetal!",
          createdAt: "2026-08-20T12:00:00Z",
          updatedAt: "2026-08-20T12:00:00Z",
        },
      ],
      stats: {
        averageLeaves: 5.0,
        totalReviews: 1,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      },
    });

    render(
      <AuthProvider>
        <RestaurantReviews restaurant={mockRestaurant} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Clara")).toBeDefined();
      expect(screen.getByText("Menjar increïble i 100% vegetal!")).toBeDefined();
      expect(screen.getByText(/1 valoració de la comunitat/i)).toBeDefined();
    });
  });

  it("opens auth modal when clicking review trigger while unauthenticated", async () => {
    vi.spyOn(api, "getRestaurantReviews").mockResolvedValue({
      reviews: [],
      stats: {
        averageLeaves: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    render(
      <AuthProvider>
        <RestaurantReviews restaurant={mockRestaurant} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Valorar amb fulles/i })).toBeDefined();
    });

    const triggerBtn = screen.getByRole("button", { name: /Valorar amb fulles/i });
    fireEvent.click(triggerBtn);

    // Modal should now be open in Catalan
    expect(screen.getByRole("dialog", { name: /Inicia sessió per valorar/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continua amb Google/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continua amb Apple/i })).toBeDefined();
  });

  it("renders in English when language is switched to en", async () => {
    setLanguage("en");
    vi.spyOn(api, "getRestaurantReviews").mockResolvedValue({
      reviews: [],
      stats: {
        averageLeaves: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    render(
      <AuthProvider>
        <RestaurantReviews restaurant={mockRestaurant} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("No ratings yet")).toBeDefined();
      expect(screen.getByText("This place has no community reviews yet.")).toBeDefined();
      expect(screen.getByRole("button", { name: "Rate with leaves" })).toBeDefined();
    });

    // Open modal in English
    fireEvent.click(screen.getByRole("button", { name: "Rate with leaves" }));
    expect(screen.getByRole("dialog", { name: "Sign in to rate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue with Apple" })).toBeDefined();
  });
});
