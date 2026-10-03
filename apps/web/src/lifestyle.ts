/**
 * @file lifestyle.ts
 * @description Manages user lifestyle / dietary identity preference (Vegan, Vegetarian, Non Veg).
 * Persists choice in localStorage and synchronizes across components using useSyncExternalStore.
 */

import { useSyncExternalStore } from "react";

export type LifestyleIdentity = "vegan" | "vegetarian" | "non-veg";

const LIFESTYLE_STORAGE_KEY = "vegan_tools_lifestyle_identity";

function getStoredLifestyle(): LifestyleIdentity {
  if (typeof localStorage === "undefined") return "vegan";
  try {
    const stored = localStorage.getItem(LIFESTYLE_STORAGE_KEY);
    if (stored === "vegan" || stored === "vegetarian" || stored === "non-veg") {
      return stored;
    }
  } catch {
    return "vegan";
  }
  return "vegan";
}

let currentLifestyle: LifestyleIdentity = getStoredLifestyle();
const lifestyleListeners = new Set<() => void>();

export function setLifestyle(next: LifestyleIdentity) {
  currentLifestyle = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LIFESTYLE_STORAGE_KEY, next);
  }
  lifestyleListeners.forEach((listener) => listener());
}

export function useLifestyle(): {
  lifestyle: LifestyleIdentity;
  setLifestyle: (identity: LifestyleIdentity) => void;
} {
  const lifestyle = useSyncExternalStore(
    (listener) => {
      lifestyleListeners.add(listener);
      return () => lifestyleListeners.delete(listener);
    },
    () => currentLifestyle,
    () => "vegan" as LifestyleIdentity,
  );

  return { lifestyle, setLifestyle };
}
