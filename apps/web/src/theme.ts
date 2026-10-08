/**
 * @file theme.ts
 * @description Theme management system supporting light, dark, and system modes.
 * Detects system preference, persists user choice in localStorage, and applies
 * the `data-theme` attribute to the document root element.
 */

import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

const THEME_STORAGE_KEY = "vegan-tools-theme";

function getSystemTheme(): EffectiveTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function hasUserProfile(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const session = localStorage.getItem("vegan_tools_auth_session");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.user?.id) return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed?.user?.id || parsed?.access_token) return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

function getStoredTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    return "light";
  }
  return "light";
}

let currentTheme: ThemeMode = getStoredTheme();
const themeListeners = new Set<() => void>();

export function getEffectiveTheme(theme: ThemeMode = currentTheme): EffectiveTheme {
  // Without a user profile, default strictly to light mode and never infer dark mode from OS
  if (!hasUserProfile()) {
    if (theme === "dark") return "dark";
    return "light";
  }

  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const effective = getEffectiveTheme(theme);
  document.documentElement.setAttribute("data-theme", effective);
  if (document.documentElement.style) {
    document.documentElement.style.colorScheme = effective;
  }
}

export function refreshTheme() {
  applyThemeToDocument(currentTheme);
  themeListeners.forEach((listener) => listener());
}

// Initial application
if (typeof window !== "undefined") {
  applyThemeToDocument(currentTheme);

  // Listen to OS system color scheme changes if supported
  if (typeof window.matchMedia === "function") {
    try {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      if (media && typeof media.addEventListener === "function") {
        media.addEventListener("change", () => {
          if (currentTheme === "system") {
            applyThemeToDocument("system");
            themeListeners.forEach((listener) => listener());
          }
        });
      }
    } catch {
      // Fallback for jsdom or environments without addEventListener
    }
  }
}

export function setTheme(nextTheme: ThemeMode) {
  currentTheme = nextTheme;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }
  applyThemeToDocument(nextTheme);
  themeListeners.forEach((listener) => listener());
}

export function toggleTheme() {
  const effective = getEffectiveTheme(currentTheme);
  const next: ThemeMode = effective === "dark" ? "light" : "dark";
  setTheme(next);
}

export function useTheme(): {
  theme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
} {
  const theme = useSyncExternalStore(
    (listener) => {
      themeListeners.add(listener);
      return () => themeListeners.delete(listener);
    },
    () => currentTheme,
    () => "light" as ThemeMode,
  );

  const effectiveTheme = getEffectiveTheme(theme);

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  };
}
