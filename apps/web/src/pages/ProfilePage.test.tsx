// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import { saveVisitLog, setUserTop4 } from "../utils/diary";
import * as authModule from "../auth";

vi.mock("../api", () => ({
  getUserReviews: vi.fn().mockResolvedValue([]),
  deleteRestaurantReview: vi.fn().mockResolvedValue(undefined),
}));

describe("ProfilePage with Letterboxd Diary & Top 4", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders auth required callout when not logged in", () => {
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
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /My Profile/i })).toBeDefined();
    expect(screen.getByText(/Sign in to manage your reviews/i)).toBeDefined();
  });

  it("displays Top 4, rating histogram and visit logs when logged in", () => {
    const mockUser = {
      id: "user-123",
      username: "vegi_chef",
      name: "@vegi_chef",
    };

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
      rating: 4.5,
      notes: "Phenomenal brunch and burgers!",
      dishesTried: ["Roots Burger"],
    });

    setUserTop4(["featured-roots-bcn"], mockUser.id);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /@vegi_chef/i })).toBeDefined();
    expect(screen.getByText(/Top 4 Restaurants/i)).toBeDefined();
    expect(screen.getByText(/Rating distribution/i)).toBeDefined();
    expect(screen.getByText(/Phenomenal brunch and burgers!/i)).toBeDefined();
    expect(screen.getByText(/Roots Burger/i)).toBeDefined();
  });
});
