// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RestaurantDetailPage } from "./RestaurantDetailPage";
import { saveVisitLog } from "../utils/diary";
import * as authModule from "../auth";
import * as apiModule from "../api";

describe("RestaurantDetailPage", () => {
  const mockUser = {
    id: "user-test-detail",
    username: "foodie_vegi",
    name: "@foodie_vegi",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(apiModule, "getRecentRestaurantMenus").mockResolvedValue([]);
    vi.spyOn(apiModule, "getRestaurantReviews").mockResolvedValue({
      reviews: [],
      stats: { averageLeaves: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders curated restaurant details and back link", async () => {
    render(
      <MemoryRouter initialEntries={["/restaurant/featured-roots-bcn"]}>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Roots Vegan")).toBeDefined();
    expect(screen.getAllByText(/Vegan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Directions/i)).toBeDefined();
    expect(screen.getAllByText(/Log a visit/i).length).toBeGreaterThan(0);
  });

  it("displays logged visits in the diary section when user is logged in", async () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: mockUser,
      session: null,
      token: "mock-token",
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

    saveVisitLog({
      userId: mockUser.id,
      restaurantId: "featured-roots-bcn",
      restaurantName: "Roots Vegan",
      visitDate: "2026-09-08",
      rating: 4.8,
      notes: "The beyond burger was super juicy!",
      dishesTried: ["Burger", "Fries"],
    });

    render(
      <MemoryRouter initialEntries={["/restaurant/featured-roots-bcn"]}>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const titles = await screen.findAllByText("Roots Vegan");
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/The beyond burger was super juicy!/i)).toBeDefined();
    expect(screen.getByText(/Burger, Fries/i)).toBeDefined();
    expect(screen.getByText(/★ 4.8/i)).toBeDefined();
  });

  it("opens log visit modal when clicking Log a visit button while logged in", async () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: mockUser,
      session: null,
      token: "mock-token",
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

    render(
      <MemoryRouter initialEntries={["/restaurant/featured-roots-bcn"]}>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const logBtns = await screen.findAllByRole("button", { name: /Log a visit/i });
    fireEvent.click(logBtns[0]!);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Log a restaurant visit/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Save visit/i })).toBeDefined();
  });

  it("opens auth modal when clicking Log a visit button while logged out", async () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      token: null,
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

    render(
      <MemoryRouter initialEntries={["/restaurant/featured-roots-bcn"]}>
        <Routes>
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const logBtns = await screen.findAllByRole("button", { name: /Log a visit/i });
    fireEvent.click(logBtns[0]!);

    // Should render AuthDialog modal
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Sign in \/ Create account/i)).toBeDefined();
  });
});
