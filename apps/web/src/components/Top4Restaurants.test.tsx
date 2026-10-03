// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Top4Restaurants } from "./Top4Restaurants";
import * as apiModule from "../api";
import * as authModule from "../auth";
import type { RestaurantCandidate } from "@vegan-tools/domain";

describe("Top4Restaurants component with universal restaurant discovery", () => {
  const mockUser = {
    id: "user-top4-test",
    username: "top4_tester",
    name: "top4_tester",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: mockUser,
      session: null,
      token: "test-token",
      loading: false,
      signInWithGoogle: vi.fn(),
      signInWithApple: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
      loginWithUsername: vi.fn(),
      updateUsername: vi.fn(),
      loginAsDemoUser: vi.fn(),
    });
    vi.spyOn(apiModule, "fetchUserTop4").mockResolvedValue([]);
    vi.spyOn(apiModule, "saveUserTop4Api").mockResolvedValue([]);
  });

  it("allows searching for any uncurated restaurant and adding it to Top 4", async () => {
    const uncuratedRestaurant: RestaurantCandidate = {
      id: "node-55555",
      name: "Super Tacos Veganos",
      address: "Carrer del Sol, 10, Barcelona",
      latitude: 41.39,
      longitude: 2.16,
      mapUrl: "https://www.openstreetmap.org/node/55555",
      provider: "openstreetmap",
      cuisine: "mexican",
      isVegan: true,
    };

    vi.spyOn(apiModule, "searchRestaurants").mockResolvedValue([uncuratedRestaurant]);

    render(
      <MemoryRouter>
        <Top4Restaurants />
      </MemoryRouter>,
    );

    // Click Edit button
    const editBtn = screen.getByRole("button", { name: /Edit|Edita/i });
    fireEvent.click(editBtn);

    // Search input should appear
    const input = screen.getByPlaceholderText(/Search restaurant name/i);
    fireEvent.change(input, { target: { value: "Super Tacos" } });

    // Wait for debounced search results to show
    await waitFor(() => {
      expect(screen.getByText("Super Tacos Veganos")).toBeDefined();
    });

    // Click candidate to add it
    const candidateBtn = screen.getByRole("button", { name: /Super Tacos Veganos/i });
    fireEvent.click(candidateBtn);

    // Candidate should now be pinned in the Top 4 grid
    expect(await screen.findByText("Super Tacos Veganos")).toBeDefined();
  });
});
