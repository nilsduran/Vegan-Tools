// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LogVisitModal } from "./LogVisitModal";
import * as authModule from "../auth";
import * as diaryModule from "../utils/diary";

describe("LogVisitModal", () => {
  const mockUser = {
    id: "user-test-modal",
    username: "vegi_reviewer",
    name: "@vegi_reviewer",
  };

  const sampleRestaurant = {
    id: "rest-roots",
    name: "Roots Vegan",
    address: "Carrer de Girona, 116",
    cuisine: "Burger",
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
  });

  afterEach(() => {
    cleanup();
  });

  it("supports quick adding menu dish suggestions and custom off-menu dishes", () => {
    const saveSpy = vi.spyOn(diaryModule, "saveVisitLog").mockReturnValue({
      id: "log-1",
      userId: mockUser.id,
      restaurantId: sampleRestaurant.id,
      restaurantName: sampleRestaurant.name,
      rating: 4.5,
      createdAt: "",
      updatedAt: "",
    });

    render(
      <LogVisitModal
        restaurant={sampleRestaurant}
        isOpen={true}
        onClose={vi.fn()}
        menuDishes={["Roots Classic Burger", "Truffle Fries"]}
      />,
    );

    // 1. Click menu suggestion chip
    const burgerChip = screen.getByRole("button", { name: /Roots Classic Burger/i });
    fireEvent.click(burgerChip);

    // Should appear in tags
    expect(screen.getByText("Roots Classic Burger")).toBeDefined();

    // 2. Add custom off-menu dish
    const customInput = screen.getByPlaceholderText(/Type a dish name/i);
    fireEvent.change(customInput, { target: { value: "Postre especial de la casa (fora de carta)" } });
    const addBtn = screen.getByRole("button", { name: /Add/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Postre especial de la casa (fora de carta)")).toBeDefined();

    // 3. Submit form
    const submitBtn = screen.getByRole("button", { name: /Save visit/i });
    fireEvent.click(submitBtn);

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        restaurantId: sampleRestaurant.id,
        dishesTried: ["Roots Classic Burger", "Postre especial de la casa (fora de carta)"],
      }),
    );
  });

  it("allows deselecting date to save dateless visit", () => {
    const saveSpy = vi.spyOn(diaryModule, "saveVisitLog").mockReturnValue({
      id: "log-2",
      userId: mockUser.id,
      restaurantId: sampleRestaurant.id,
      restaurantName: sampleRestaurant.name,
      rating: 5.0,
      createdAt: "",
      updatedAt: "",
    });

    render(
      <LogVisitModal
        restaurant={sampleRestaurant}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Toggle off visit date
    const dateCheckbox = screen.getByRole("checkbox", { name: /Include visit date/i });
    fireEvent.click(dateCheckbox);

    expect(screen.getByText(/Without specific date/i)).toBeDefined();

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Save visit/i });
    fireEvent.click(submitBtn);

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        visitDate: undefined,
      }),
    );
  });
});
