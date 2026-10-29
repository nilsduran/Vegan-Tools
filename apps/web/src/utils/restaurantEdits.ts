/**
 * @file restaurantEdits.ts
 * @description Manages user-contributed restaurant corrections, permanent closure reporting,
 * and weekly editing rate limits (max 50 edits/week per authenticated user to prevent automated abuse).
 */

import {
  isPermanentlyClosedVenue,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import { saveCachedRestaurant, getCachedRestaurant } from "./restaurantCache";

export interface RestaurantEditSubmission {
  restaurantId: string;
  name: string;
  address: string;
  websiteUrl?: string;
  openingHours?: string;
  isVegan: boolean;
  isVegetarian: boolean;
  permanentlyClosed: boolean;
  notes?: string;
}

const WEEKLY_MAX_EDITS = 50;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const USER_EDITS_PREFIX = "vegan-tools-user-edits-";
const COMMUNITY_EDITS_KEY = "vegan-tools-community-edits";
const COMMUNITY_CLOSED_KEY = "vegan-tools-community-closed";

export interface EditQuotaStatus {
  used: number;
  max: number;
  remaining: number;
  canEdit: boolean;
}

/**
 * Returns the weekly edit quota status for a specific user.
 */
export function getWeeklyEditQuota(userId?: string): EditQuotaStatus {
  if (!userId || typeof window === "undefined" || !window.localStorage) {
    return {
      used: 0,
      max: WEEKLY_MAX_EDITS,
      remaining: 0,
      canEdit: false,
    };
  }

  try {
    const raw = localStorage.getItem(`${USER_EDITS_PREFIX}${userId}`);
    const now = Date.now();
    const history: number[] = raw ? JSON.parse(raw) : [];

    // Filter events within the 7-day rolling window
    const recent = history.filter((timestamp) => now - timestamp < WEEK_MS);

    return {
      used: recent.length,
      max: WEEKLY_MAX_EDITS,
      remaining: Math.max(0, WEEKLY_MAX_EDITS - recent.length),
      canEdit: recent.length < WEEKLY_MAX_EDITS,
    };
  } catch {
    return {
      used: 0,
      max: WEEKLY_MAX_EDITS,
      remaining: WEEKLY_MAX_EDITS,
      canEdit: true,
    };
  }
}

/**
 * Records an edit action against the user's weekly quota.
 */
export function recordUserEditAction(userId: string): void {
  if (!userId || typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${USER_EDITS_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const history: number[] = raw ? JSON.parse(raw) : [];
    const recent = history.filter((timestamp) => now - timestamp < WEEK_MS);
    recent.push(now);
    localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    // Ignore quota storage failures silently
  }
}

/**
 * Gets all restaurant IDs reported by the community or user as permanently closed.
 */
export function getReportedClosedIds(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(COMMUNITY_CLOSED_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

/**
 * Marks a restaurant as permanently closed.
 */
export function markRestaurantAsClosed(restaurantId: string, name?: string): void {
  if (!restaurantId || typeof window === "undefined" || !window.localStorage) return;
  try {
    const set = getReportedClosedIds();
    set.add(restaurantId);
    if (name) {
      set.add(name.toLowerCase().trim());
    }
    localStorage.setItem(COMMUNITY_CLOSED_KEY, JSON.stringify([...set]));

    // Dispatch event so map canvas and results update immediately
    window.dispatchEvent(
      new CustomEvent("vegan-tools-restaurant-closed", {
        detail: { restaurantId, name },
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks whether a restaurant is permanently closed (combines domain blacklist and community reports).
 */
export function isRestaurantClosed(venue: Partial<RestaurantCandidate>): boolean {
  if (isPermanentlyClosedVenue(venue)) {
    return true;
  }

  if (venue.id) {
    const closedIds = getReportedClosedIds();
    if (closedIds.has(venue.id)) {
      return true;
    }
  }

  if (venue.name) {
    const closedIds = getReportedClosedIds();
    if (closedIds.has(venue.name.toLowerCase().trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Returns all community edits applied to restaurants.
 */
export function getCommunityEditsMap(): Record<string, Partial<RestaurantCandidate>> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(COMMUNITY_EDITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Applies saved community edits on top of a restaurant candidate.
 */
export function applyCommunityEdits(candidate: RestaurantCandidate): RestaurantCandidate {
  const map = getCommunityEditsMap();
  const edit = map[candidate.id];
  if (!edit) return candidate;

  return {
    ...candidate,
    ...edit,
    id: candidate.id, // Immutable ID
  };
}

/**
 * Saves a user-submitted edit for a restaurant.
 */
export function saveRestaurantEdit(edit: RestaurantEditSubmission, userId: string): RestaurantCandidate {
  recordUserEditAction(userId);

  if (edit.permanentlyClosed) {
    markRestaurantAsClosed(edit.restaurantId, edit.name);
  }

  const overrides: Partial<RestaurantCandidate> = {
    name: edit.name.trim(),
    address: edit.address.trim(),
    websiteUrl: edit.websiteUrl?.trim() || undefined,
    openingHours: edit.openingHours?.trim() || undefined,
    isVegan: edit.isVegan,
    isVegetarian: edit.isVegetarian,
  };

  try {
    const map = getCommunityEditsMap();
    map[edit.restaurantId] = overrides;
    localStorage.setItem(COMMUNITY_EDITS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota
  }

  // Update in cached restaurants map
  const existing = getCachedRestaurant(edit.restaurantId);
  const updated: RestaurantCandidate = existing
    ? { ...existing, ...overrides }
    : {
        id: edit.restaurantId,
        name: edit.name.trim(),
        address: edit.address.trim(),
        latitude: 41.3851, // Fallback if newly created
        longitude: 2.1734,
        websiteUrl: edit.websiteUrl?.trim() || undefined,
        openingHours: edit.openingHours?.trim() || undefined,
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(edit.name)}`,
        provider: "curated",
        isVegan: edit.isVegan,
        isVegetarian: edit.isVegetarian,
      };

  saveCachedRestaurant(updated);

  // Notify components in real time
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vegan-tools-restaurant-edited", {
        detail: { restaurant: updated },
      }),
    );
  }

  return updated;
}
