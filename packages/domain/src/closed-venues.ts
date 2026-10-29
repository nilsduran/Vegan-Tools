/**
 * @file closed-venues.ts
 * @description Centralized registry and heuristics for permanently closed venues.
 * Prevents phantom closed restaurants from appearing on the map or in search results.
 */

import type { RestaurantCandidate } from "./schemas.js";

/**
 * Normalized names of known permanently closed restaurants that should never appear on the map.
 */
export const KNOWN_CLOSED_VENUE_NAMES: readonly string[] = [
  "chez kessler",
  "chez ressler",
  "santoni",
  "cactuscat bar",
  "cactuscat",
  "cactus cat",
  "roots vegan",
  "la besneta",
  "quinoa bar",
  "quinoa bar vegetal",
  "breathe restaurant",
  "breathe",
  "hank burger",
  "la nyamera",
  "la nyàmera",
  "el taller - espai vega",
  "el taller espai vega",
  "el taller - espai vegà",
  "el taller espai vegà",
  "espai organic",
  "espai orgànic",
  "rasoterra",
  "vegan junkies",
  "vegan junk food bar",
  "la trocateca",
];

export const KNOWN_CLOSED_VENUE_IDS: readonly string[] = [
  "breathe-restaurant-paris",
  "par-breathe",
  "hank-burger-paris",
  "par-hank-burger",
  "featured-vic-nyamera",
  "featured-vic-el-taller",
  "featured-manresa-espai-organic",
  "rasoterra-bcn",
  "veganjunkies-bcn",
  "trocateca-bcn",
];

const CLOSED_NAME_REGEX = /\b(?:closed|tancat|tancada|cerrado|cerrada|permanently closed|permanently_closed|definitivament tancat)\b/i;
const CLOSED_BRACKET_REGEX = /[\(\[]\s*(?:closed|tancat|cerrado)\s*[\)\]]/i;

/**
 * Determines whether a restaurant is permanently closed based on its id, name, tags, or operational status.
 */
export function isPermanentlyClosedVenue(
  venue: Partial<RestaurantCandidate> & { permanentlyClosed?: boolean; operational_status?: string },
): boolean {
  if (venue.permanentlyClosed) return true;

  if (venue.id && KNOWN_CLOSED_VENUE_IDS.includes(venue.id)) {
    return true;
  }

  const name = (venue.name || "").toLowerCase().trim();
  if (name) {
    if (CLOSED_NAME_REGEX.test(name) || CLOSED_BRACKET_REGEX.test(name)) {
      return true;
    }

    const normName = name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    for (const closedName of KNOWN_CLOSED_VENUE_NAMES) {
      const normClosed = closedName
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (normName === normClosed || normName.startsWith(`${normClosed} `) || normName.endsWith(` ${normClosed}`)) {
        return true;
      }
    }
  }

  const tags = venue.tags || [];
  if (
    tags.includes("closed") ||
    tags.includes("permanently_closed") ||
    tags.includes("disused") ||
    tags.includes("abandoned")
  ) {
    return true;
  }

  if (
    venue.operational_status === "CLOSED_PERMANENTLY" ||
    venue.operational_status === "closed"
  ) {
    return true;
  }

  return false;
}
