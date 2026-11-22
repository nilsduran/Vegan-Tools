/**
 * @file freshness.ts
 * @description How old an analysed menu is, in words people use ("8 months ago").
 * Restaurants change their menus, so an old analysis is flagged instead of shown as current.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** From this age on, a menu is shown with an "may be out of date" warning. */
export const STALE_MENU_DAYS = 180;

export interface MenuFreshness {
  ageDays: number;
  stale: boolean;
  /** Localised relative time, e.g. "fa 8 mesos" / "8 months ago". */
  relative: string;
}

export function menuFreshness(capturedAt: string | undefined, language: "ca" | "en", now = new Date()): MenuFreshness | null {
  if (!capturedAt) return null;
  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) return null;

  const ageDays = Math.max(0, Math.floor((now.getTime() - captured.getTime()) / DAY_MS));
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  let relative: string;
  if (ageDays < 1) relative = rtf.format(0, "day");
  else if (ageDays < 30) relative = rtf.format(-ageDays, "day");
  else if (ageDays < 365) relative = rtf.format(-Math.floor(ageDays / 30), "month");
  else relative = rtf.format(-Math.floor(ageDays / 365), "year");

  return { ageDays, stale: ageDays >= STALE_MENU_DAYS, relative };
}
