/**
 * @file diary.ts
 * @description Letterboxd-style restaurant visit diary and favorites system.
 * Features:
 * - Local-first visit logging with offline resilience and reactive event dispatch.
 * - Enforces maximum 1 log per restaurant per calendar date (YYYY-MM-DD), allowing reviews and ratings to evolve over time.
 * - Star rating distribution histogram computation (0.5 to 5.0 in 10 half-star bins).
 * - "Top 4 Favorite Restaurants" pinned showcase.
 */

import { useState, useEffect } from "react";

export interface RestaurantVisitLog {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  cuisine?: string;
  visitDate: string; // YYYY-MM-DD
  rating: number; // 0.5 to 5.0
  notes?: string;
  dishesTried?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RatingHistogramBin {
  score: number; // 0.5, 1.0, 1.5, ..., 5.0
  count: number;
  percentage: number;
}

const STORAGE_DIARY_KEY = "vegan_tools_diary_logs_v1";
const STORAGE_TOP4_KEY = "vegan_tools_top4_restaurants_v1";

const DIARY_UPDATED_EVENT = "vegan_tools_diary_updated";
const TOP4_UPDATED_EVENT = "vegan_tools_top4_updated";

export function getDiaryLogs(): RestaurantVisitLog[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_DIARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function getLogsForRestaurant(restaurantId: string): RestaurantVisitLog[] {
  return getDiaryLogs().filter((l) => l.restaurantId === restaurantId);
}

export interface SaveVisitLogInput {
  id?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  cuisine?: string;
  visitDate?: string; // YYYY-MM-DD, defaults to today
  rating: number; // 0.5 to 5.0
  notes?: string;
  dishesTried?: string[];
}

export function saveVisitLog(input: SaveVisitLogInput): RestaurantVisitLog {
  const logs = getDiaryLogs();
  const dateStr = input.visitDate?.trim() || new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Clamp rating between 0.5 and 5.0
  const rating = Math.min(Math.max(Number(input.rating) || 5, 0.5), 5);

  // Enforce 1 log per restaurant per calendar day
  const existingIndex = logs.findIndex(
    (l) =>
      (input.id && l.id === input.id) ||
      (l.restaurantId === input.restaurantId && l.visitDate === dateStr),
  );

  let updatedLog: RestaurantVisitLog;

  if (existingIndex >= 0) {
    const existing = logs[existingIndex]!;
    updatedLog = {
      ...existing,
      restaurantName: input.restaurantName || existing.restaurantName,
      restaurantAddress: input.restaurantAddress ?? existing.restaurantAddress,
      restaurantImage: input.restaurantImage ?? existing.restaurantImage,
      cuisine: input.cuisine ?? existing.cuisine,
      visitDate: dateStr,
      rating,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      dishesTried: input.dishesTried !== undefined ? input.dishesTried : existing.dishesTried,
      updatedAt: now,
    };
    logs[existingIndex] = updatedLog;
  } else {
    updatedLog = {
      id: input.id || `visit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      restaurantAddress: input.restaurantAddress,
      restaurantImage: input.restaurantImage,
      cuisine: input.cuisine,
      visitDate: dateStr,
      rating,
      notes: input.notes,
      dishesTried: input.dishesTried,
      createdAt: now,
      updatedAt: now,
    };
    logs.unshift(updatedLog);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_DIARY_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent(DIARY_UPDATED_EVENT, { detail: updatedLog }));
  }

  return updatedLog;
}

export function deleteVisitLog(id: string): void {
  const logs = getDiaryLogs().filter((l) => l.id !== id);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_DIARY_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent(DIARY_UPDATED_EVENT));
  }
}

export function getRatingHistogram(logs: RestaurantVisitLog[]): RatingHistogramBin[] {
  // 10 half-star bins: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
  const scores = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const counts: Record<number, number> = {};
  for (const s of scores) {
    counts[s] = 0;
  }

  for (const log of logs) {
    // Snap to closest half-star
    const rounded = Math.round(log.rating * 2) / 2;
    const clamped = Math.min(Math.max(rounded, 0.5), 5.0);
    counts[clamped] = (counts[clamped] || 0) + 1;
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  return scores.map((score) => {
    const count = counts[score] || 0;
    return {
      score,
      count,
      percentage: Math.round((count / maxCount) * 100),
    };
  });
}

export function getUserTop4(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_TOP4_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function setUserTop4(ids: string[]): void {
  const clean = ids.filter(Boolean).slice(0, 4);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_TOP4_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent(TOP4_UPDATED_EVENT, { detail: clean }));
  }
}

export function useDiaryLogs() {
  const [logs, setLogs] = useState<RestaurantVisitLog[]>(() => getDiaryLogs());

  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getDiaryLogs());
    };

    window.addEventListener(DIARY_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(DIARY_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return logs;
}

export function useUserTop4() {
  const [top4, setTop4State] = useState<string[]>(() => getUserTop4());

  useEffect(() => {
    const handleUpdate = () => {
      setTop4State(getUserTop4());
    };

    window.addEventListener(TOP4_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TOP4_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateTop4 = (ids: string[]) => {
    setUserTop4(ids);
    setTop4State(ids.slice(0, 4));
  };

  return { top4, updateTop4 };
}
