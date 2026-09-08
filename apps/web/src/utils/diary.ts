/**
 * @file diary.ts
 * @description Letterboxd-style restaurant visit diary and favorites system.
 * Features:
 * - Strictly requires an authenticated user account (no anonymous local logs).
 * - User-scoped storage for visit logs and Top 4 favorites.
 * - Optional visit date: defaults to current date (YYYY-MM-DD), but can be unset for dateless visits.
 * - If a date is provided, enforces maximum 1 log per restaurant per calendar date.
 * - Star rating distribution histogram computation (0.5 to 5.0 in 10 half-star bins).
 * - "Top 4 Favorite Restaurants" pinned showcase.
 */

import { useState, useEffect } from "react";

export interface RestaurantVisitLog {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  cuisine?: string;
  visitDate?: string; // Optional YYYY-MM-DD
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

const STORAGE_DIARY_PREFIX = "vegan_tools_diary_";
const STORAGE_TOP4_PREFIX = "vegan_tools_top4_";

const DIARY_UPDATED_EVENT = "vegan_tools_diary_updated";
const TOP4_UPDATED_EVENT = "vegan_tools_top4_updated";

function getDiaryKey(userId: string): string {
  return `${STORAGE_DIARY_PREFIX}${userId}_v1`;
}

function getTop4Key(userId: string): string {
  return `${STORAGE_TOP4_PREFIX}${userId}_v1`;
}

export function getDiaryLogs(userId?: string): RestaurantVisitLog[] {
  if (!userId || typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(getDiaryKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => {
        // Entries with dates first, sorted descending
        if (a.visitDate && b.visitDate) {
          return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
        }
        if (a.visitDate) return -1;
        if (b.visitDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return [];
  } catch {
    return [];
  }
}

export function getLogsForRestaurant(restaurantId: string, userId?: string): RestaurantVisitLog[] {
  if (!userId) return [];
  return getDiaryLogs(userId).filter((l) => l.restaurantId === restaurantId);
}

export interface SaveVisitLogInput {
  id?: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  cuisine?: string;
  visitDate?: string; // Optional YYYY-MM-DD
  rating: number; // 0.5 to 5.0
  notes?: string;
  dishesTried?: string[];
}

export function saveVisitLog(input: SaveVisitLogInput): RestaurantVisitLog {
  if (!input.userId) {
    throw new Error("Authentication required to save visit logs");
  }

  const logs = getDiaryLogs(input.userId);
  const dateStr = input.visitDate?.trim() ? input.visitDate.trim() : undefined;
  const now = new Date().toISOString();

  // Clamp rating between 0.5 and 5.0
  const rating = Math.min(Math.max(Number(input.rating) || 5, 0.5), 5);

  // If date is provided, enforce 1 log per restaurant per calendar day
  // If no date, match strictly by id
  const existingIndex = logs.findIndex((l) => {
    if (input.id && l.id === input.id) return true;
    if (dateStr && l.restaurantId === input.restaurantId && l.visitDate === dateStr) return true;
    return false;
  });

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
      userId: input.userId,
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
    localStorage.setItem(getDiaryKey(input.userId), JSON.stringify(logs));
    window.dispatchEvent(
      new CustomEvent(DIARY_UPDATED_EVENT, { detail: { userId: input.userId, log: updatedLog } }),
    );
  }

  return updatedLog;
}

export function deleteVisitLog(id: string, userId: string): void {
  if (!userId) return;
  const logs = getDiaryLogs(userId).filter((l) => l.id !== id);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(getDiaryKey(userId), JSON.stringify(logs));
    window.dispatchEvent(
      new CustomEvent(DIARY_UPDATED_EVENT, { detail: { userId, deletedId: id } }),
    );
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

export function getUserTop4(userId?: string): string[] {
  if (!userId || typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(getTop4Key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function setUserTop4(ids: string[], userId: string): void {
  if (!userId) return;
  const clean = ids.filter(Boolean).slice(0, 4);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(getTop4Key(userId), JSON.stringify(clean));
    window.dispatchEvent(
      new CustomEvent(TOP4_UPDATED_EVENT, { detail: { userId, top4: clean } }),
    );
  }
}

export function useDiaryLogs(userId?: string) {
  const [logs, setLogs] = useState<RestaurantVisitLog[]>(() => getDiaryLogs(userId));

  useEffect(() => {
    setLogs(getDiaryLogs(userId));

    const handleUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }> | undefined;
      if (!customEvent?.detail?.userId || customEvent.detail.userId === userId) {
        setLogs(getDiaryLogs(userId));
      }
    };

    window.addEventListener(DIARY_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(DIARY_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [userId]);

  return logs;
}

export function useUserTop4(userId?: string) {
  const [top4, setTop4State] = useState<string[]>(() => getUserTop4(userId));

  useEffect(() => {
    setTop4State(getUserTop4(userId));

    const handleUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }> | undefined;
      if (!customEvent?.detail?.userId || customEvent.detail.userId === userId) {
        setTop4State(getUserTop4(userId));
      }
    };

    window.addEventListener(TOP4_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TOP4_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [userId]);

  const updateTop4 = (ids: string[]) => {
    if (!userId) return;
    setUserTop4(ids, userId);
    setTop4State(ids.slice(0, 4));
  };

  return { top4, updateTop4 };
}
