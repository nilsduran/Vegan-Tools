/**
 * @file userLists.ts
 * @description Letterboxd-inspired restaurant lists manager:
 * - Default "Liked" list (💖 independent from 1-5 leaf rating).
 * - Default "Want to go" / Watchlist (🔖).
 * - User-created custom lists (public or private).
 * Persists instantaneously to localStorage with cloud sync capabilities.
 */

export interface UserRestaurantList {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  isDefault?: boolean;
  restaurantIds: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "vt_restaurant_lists";

function getInitialLists(): UserRestaurantList[] {
  const now = new Date().toISOString();
  return [
    {
      id: "liked",
      title: "Liked",
      description: "Restaurants que t'encanten",
      isPublic: false,
      isDefault: true,
      restaurantIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "want_to_go",
      title: "Want to go",
      description: "Llocs pendents de provar (Watchlist)",
      isPublic: false,
      isDefault: true,
      restaurantIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadUserLists(): UserRestaurantList[] {
  if (typeof window === "undefined") return getInitialLists();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = getInitialLists();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as UserRestaurantList[];
    // Ensure default lists always exist
    const hasLiked = parsed.some((l) => l.id === "liked");
    const hasWantToGo = parsed.some((l) => l.id === "want_to_go");
    if (!hasLiked || !hasWantToGo) {
      const defaults = getInitialLists();
      if (!hasLiked) parsed.unshift(defaults[0]!);
      if (!hasWantToGo) parsed.splice(1, 0, defaults[1]!);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return getInitialLists();
  }
}

export function saveUserLists(lists: UserRestaurantList[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    window.dispatchEvent(new Event("vt-user-lists-updated"));
  } catch (err) {
    console.warn("Failed to persist user lists:", err);
  }
}

export function isRestaurantInList(listId: string, restaurantId: string): boolean {
  const lists = loadUserLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) return false;
  return list.restaurantIds.includes(restaurantId);
}

export function toggleRestaurantInList(listId: string, restaurantId: string): boolean {
  const lists = loadUserLists();
  const index = lists.findIndex((l) => l.id === listId);
  if (index === -1) return false;

  const list = lists[index]!;
  const existingIdx = list.restaurantIds.indexOf(restaurantId);

  let isNowInList = false;
  if (existingIdx >= 0) {
    list.restaurantIds.splice(existingIdx, 1);
    isNowInList = false;
  } else {
    list.restaurantIds.push(restaurantId);
    isNowInList = true;
  }

  list.updatedAt = new Date().toISOString();
  saveUserLists(lists);
  return isNowInList;
}

export function isLiked(restaurantId: string): boolean {
  return isRestaurantInList("liked", restaurantId);
}

export function toggleLiked(restaurantId: string): boolean {
  return toggleRestaurantInList("liked", restaurantId);
}

export function isWantToGo(restaurantId: string): boolean {
  return isRestaurantInList("want_to_go", restaurantId);
}

export function toggleWantToGo(restaurantId: string): boolean {
  return toggleRestaurantInList("want_to_go", restaurantId);
}

export function createCustomList(title: string, description = "", isPublic = false): UserRestaurantList {
  const lists = loadUserLists();
  const now = new Date().toISOString();
  const newList: UserRestaurantList = {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    description: description.trim(),
    isPublic,
    isDefault: false,
    restaurantIds: [],
    createdAt: now,
    updatedAt: now,
  };
  lists.push(newList);
  saveUserLists(lists);
  return newList;
}

export function deleteCustomList(listId: string): boolean {
  if (listId === "liked" || listId === "want_to_go") return false;
  const lists = loadUserLists();
  const filtered = lists.filter((l) => l.id !== listId);
  if (filtered.length !== lists.length) {
    saveUserLists(filtered);
    return true;
  }
  return false;
}
