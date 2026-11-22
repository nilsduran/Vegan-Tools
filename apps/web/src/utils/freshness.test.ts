import { describe, expect, it } from "vitest";
import { menuFreshness, STALE_MENU_DAYS } from "./freshness";

const now = new Date("2026-11-22T12:00:00Z");

describe("menuFreshness", () => {
  it("returns null without a valid date", () => {
    expect(menuFreshness(undefined, "en", now)).toBeNull();
    expect(menuFreshness("not a date", "en", now)).toBeNull();
  });

  it("describes recent menus in days and is not stale", () => {
    const result = menuFreshness("2026-11-15T12:00:00Z", "en", now);
    expect(result).toMatchObject({ ageDays: 7, stale: false, relative: "7 days ago" });
  });

  it("uses months in Catalan", () => {
    expect(menuFreshness("2026-03-01T12:00:00Z", "ca", now)?.relative).toBe("fa 8 mesos");
  });

  it("flags menus older than the threshold", () => {
    const old = new Date(now.getTime() - STALE_MENU_DAYS * 24 * 60 * 60 * 1000).toISOString();
    expect(menuFreshness(old, "en", now)?.stale).toBe(true);
  });
});
