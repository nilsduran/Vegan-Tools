// @vitest-environment jsdom
/**
 * @file theme.test.ts
 * @description Unit tests for Theme management (dark/light/system, persistence, document attributes).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getEffectiveTheme, setTheme, toggleTheme } from "./theme";

describe("Theme management", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("sets theme to dark and applies data-theme attribute", () => {
    setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("vegan-tools-theme")).toBe("dark");
    expect(getEffectiveTheme("dark")).toBe("dark");
  });

  it("sets theme to light and applies data-theme attribute", () => {
    setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("vegan-tools-theme")).toBe("light");
    expect(getEffectiveTheme("light")).toBe("light");
  });

  it("toggles theme between light and dark", () => {
    setTheme("light");
    expect(getEffectiveTheme()).toBe("light");

    toggleTheme();
    expect(getEffectiveTheme()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    toggleTheme();
    expect(getEffectiveTheme()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
