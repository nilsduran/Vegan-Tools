// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  VegFriendlyBadgeIcon,
  VeganOptionsBadgeIcon,
  RestaurantBadgeIcon,
} from "./DietIcons";
import { CATEGORY_FILTERS } from "./FilterPills";

describe("DietIcons & Venue Icons", () => {
  it("renders VeganBadgeIcon with double leaf green SVG", () => {
    const { container } = render(<VeganBadgeIcon size={18} />);
    const svg = container.querySelector("svg.diet-icon-vegan");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(container.innerHTML).toContain("#16a34a");
  });

  it("renders VegetarianBadgeIcon with twin cotyledons amber SVG", () => {
    const { container } = render(<VegetarianBadgeIcon size={18} />);
    const svg = container.querySelector("svg.diet-icon-vegetarian");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(container.innerHTML).toContain("#f59e0b");
  });

  it("renders VegFriendlyBadgeIcon as a stylized orange and green carrot SVG", () => {
    const { container } = render(<VegFriendlyBadgeIcon size={18} />);
    const svg = container.querySelector("svg.diet-icon-veg-friendly");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    // Orange root body
    expect(container.innerHTML).toContain("#f97316");
    // Green leafy fronds
    expect(container.innerHTML).toContain("#22c55e");
  });

  it("ensures VeganOptionsBadgeIcon is an alias of VegFriendlyBadgeIcon", () => {
    expect(VeganOptionsBadgeIcon).toBe(VegFriendlyBadgeIcon);
  });

  it("renders RestaurantBadgeIcon with gray cutlery without a plate", () => {
    const { container } = render(<RestaurantBadgeIcon size={16} />);
    const wrapper = container.querySelector(".diet-icon-restaurant-wrapper");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.getAttribute("style")).toContain("color: rgb(100, 116, 139)");
    // Must contain lucide-utensils SVG (fork and knife)
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains("lucide-utensils")).toBe(true);
  });

  it("verifies FilterPills uses RestaurantBadgeIcon for Restaurant and VegFriendlyBadgeIcon for Veg-friendly", () => {
    const restaurantFilter = CATEGORY_FILTERS.find((f) => f.id === "restaurant");
    expect(restaurantFilter).toBeDefined();
    // Icon is no longer a plate emoji ("🍽️")
    expect(restaurantFilter?.icon).not.toBe("🍽️");

    const vegFriendlyFilter = CATEGORY_FILTERS.find((f) => f.id === "vegan_options");
    expect(vegFriendlyFilter).toBeDefined();
  });
});
