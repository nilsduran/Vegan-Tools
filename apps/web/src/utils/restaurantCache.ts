/**
 * @file restaurantCache.ts
 * @description Lightweight client-side cache for dynamically discovered restaurant candidates.
 * Stores venue details (name, address, coordinates, hours, cuisine, image) in localStorage,
 * allowing any restaurant across the city to be pinned in Top 4 and viewed on /restaurant/:id
 * with zero network delay and negligible memory footprint (<50 KB).
 */

import type { RestaurantCandidate } from "@vegan-tools/domain";

const RESTAURANT_CACHE_KEY = "vegan-tools-restaurant-cache";
const MAX_CACHED_ITEMS = 100;

export function getCachedRestaurantsMap(): Record<string, RestaurantCandidate> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(RESTAURANT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RestaurantCandidate>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getCachedRestaurant(id: string): RestaurantCandidate | undefined {
  if (!id) return undefined;
  const map = getCachedRestaurantsMap();
  return map[id];
}

export function saveCachedRestaurant(restaurant: RestaurantCandidate): void {
  if (!restaurant?.id || typeof window === "undefined" || !window.localStorage) return;
  try {
    const map = getCachedRestaurantsMap();
    map[restaurant.id] = restaurant;

    // Prune oldest entries if exceeding MAX_CACHED_ITEMS
    const keys = Object.keys(map);
    if (keys.length > MAX_CACHED_ITEMS) {
      const keysToDelete = keys.slice(0, keys.length - MAX_CACHED_ITEMS);
      for (const k of keysToDelete) {
        delete map[k];
      }
    }

    localStorage.setItem(RESTAURANT_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota limits silently
  }
}

export function saveCachedRestaurants(restaurants: RestaurantCandidate[]): void {
  if (!Array.isArray(restaurants) || restaurants.length === 0) return;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const map = getCachedRestaurantsMap();
    for (const r of restaurants) {
      if (r?.id) {
        map[r.id] = r;
      }
    }

    const keys = Object.keys(map);
    if (keys.length > MAX_CACHED_ITEMS) {
      const keysToDelete = keys.slice(0, keys.length - MAX_CACHED_ITEMS);
      for (const k of keysToDelete) {
        delete map[k];
      }
    }

    localStorage.setItem(RESTAURANT_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota limits silently
  }
}
