// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RestaurantDetailPage } from "./RestaurantDetailPage";
import { saveVisitLog } from "../utils/diary";

describe("RestaurantDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
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
    expect(screen.getByText(/100% Vegan/i)).toBeDefined();
    expect(screen.getByText(/Directions/i)).toBeDefined();
    expect(screen.getAllByText(/Log a visit/i).length).toBeGreaterThan(0);
  });

  it("displays logged visits in the diary section", async () => {
    saveVisitLog({
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

  it("opens log visit modal when clicking Log a visit button", async () => {
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
});
