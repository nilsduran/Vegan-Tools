/**
 * @file restaurant-visit-store.ts
 * @description Storage layer for user restaurant visits diary and Top 4 favorites.
 * Provides in-memory implementation for tests/offline and Supabase SDK implementation for cloud sync.
 */

import type { RestaurantCandidate, RestaurantVisitLog } from "@vegan-tools/domain";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase.js";

export interface RestaurantVisitStore {
  getUserVisits(userId: string): Promise<RestaurantVisitLog[]>;
  saveVisit(visit: RestaurantVisitLog): Promise<RestaurantVisitLog>;
  deleteVisit(visitId: string, userId: string): Promise<boolean>;
  getUserTop4(userId: string): Promise<RestaurantCandidate[]>;
  saveUserTop4(userId: string, restaurants: RestaurantCandidate[]): Promise<void>;
}

export class MemoryRestaurantVisitStore implements RestaurantVisitStore {
  // Map of userId -> RestaurantVisitLog[]
  private readonly visits = new Map<string, RestaurantVisitLog[]>();
  // Map of userId -> RestaurantCandidate[]
  private readonly top4 = new Map<string, RestaurantCandidate[]>();

  async getUserVisits(userId: string): Promise<RestaurantVisitLog[]> {
    const list = this.visits.get(userId) || [];
    return [...list].sort((a, b) => {
      const dateA = a.visitDate || a.createdAt;
      const dateB = b.visitDate || b.createdAt;
      return dateB.localeCompare(dateA);
    });
  }

  async saveVisit(visit: RestaurantVisitLog): Promise<RestaurantVisitLog> {
    const list = this.visits.get(visit.userId) || [];
    const existingIndex = list.findIndex(
      (v) =>
        v.id === visit.id ||
        (visit.visitDate && v.restaurantId === visit.restaurantId && v.visitDate === visit.visitDate),
    );

    const now = new Date().toISOString();
    const toSave: RestaurantVisitLog = {
      ...visit,
      createdAt: existingIndex >= 0 ? list[existingIndex]!.createdAt : (visit.createdAt || now),
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = toSave;
    } else {
      list.unshift(toSave);
    }

    this.visits.set(visit.userId, list);
    return toSave;
  }

  async deleteVisit(visitId: string, userId: string): Promise<boolean> {
    const list = this.visits.get(userId);
    if (!list) return false;

    const initialLength = list.length;
    const filtered = list.filter((v) => v.id !== visitId);
    this.visits.set(userId, filtered);
    return filtered.length < initialLength;
  }

  async getUserTop4(userId: string): Promise<RestaurantCandidate[]> {
    return this.top4.get(userId) || [];
  }

  async saveUserTop4(userId: string, restaurants: RestaurantCandidate[]): Promise<void> {
    this.top4.set(userId, restaurants.slice(0, 4));
  }
}

interface SupabaseVisitRow {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_image: string | null;
  cuisine: string | null;
  visit_date: string | null;
  rating: number;
  notes: string | null;
  dishes_tried: string[] | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseRestaurantVisitStore implements RestaurantVisitStore {
  private readonly client: SupabaseClient;
  private readonly memoryFallback = new MemoryRestaurantVisitStore();

  constructor(clientOrUrl: SupabaseClient | string, secretKey?: string) {
    if (typeof clientOrUrl === "string") {
      this.client = createClient(clientOrUrl, secretKey || "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.client = clientOrUrl;
    }
  }

  private rowToVisit(row: SupabaseVisitRow): RestaurantVisitLog {
    return {
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      restaurantAddress: row.restaurant_address || undefined,
      restaurantImage: row.restaurant_image || undefined,
      cuisine: row.cuisine || undefined,
      visitDate: row.visit_date || undefined,
      rating: Number(row.rating),
      notes: row.notes || "",
      dishesTried: Array.isArray(row.dishes_tried) ? row.dishes_tried : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getUserVisits(userId: string): Promise<RestaurantVisitLog[]> {
    try {
      const { data, error } = await this.client
        .from("restaurant_visits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return this.memoryFallback.getUserVisits(userId);
      }

      return (data as SupabaseVisitRow[]).map((r) => this.rowToVisit(r));
    } catch {
      return this.memoryFallback.getUserVisits(userId);
    }
  }

  async saveVisit(visit: RestaurantVisitLog): Promise<RestaurantVisitLog> {
    const payload: Partial<SupabaseVisitRow> = {
      id: visit.id,
      user_id: visit.userId,
      restaurant_id: visit.restaurantId,
      restaurant_name: visit.restaurantName,
      restaurant_address: visit.restaurantAddress || null,
      restaurant_image: visit.restaurantImage || null,
      cuisine: visit.cuisine || null,
      visit_date: visit.visitDate || null,
      rating: visit.rating,
      notes: visit.notes || "",
      dishes_tried: visit.dishesTried || [],
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.client
        .from("restaurant_visits")
        .upsert(payload)
        .select()
        .single();

      if (error || !data) {
        console.warn(
          `[SupabaseRestaurantVisitStore] Supabase error (${error?.message}). Using in-memory fallback.`,
        );
        return this.memoryFallback.saveVisit(visit);
      }

      return this.rowToVisit(data as SupabaseVisitRow);
    } catch (error) {
      console.warn(
        `[SupabaseRestaurantVisitStore] Network error (${error instanceof Error ? error.message : String(error)}). Using in-memory fallback.`,
      );
      return this.memoryFallback.saveVisit(visit);
    }
  }

  async deleteVisit(visitId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from("restaurant_visits")
        .delete()
        .eq("id", visitId)
        .eq("user_id", userId)
        .select();

      const deletedFromSupabase = !error && Array.isArray(data) && data.length > 0;
      const deletedFromMemory = await this.memoryFallback.deleteVisit(visitId, userId);
      return deletedFromSupabase || deletedFromMemory;
    } catch {
      return this.memoryFallback.deleteVisit(visitId, userId);
    }
  }

  async getUserTop4(userId: string): Promise<RestaurantCandidate[]> {
    try {
      const { data, error } = await this.client
        .from("user_top4")
        .select("restaurants")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        return this.memoryFallback.getUserTop4(userId);
      }

      return Array.isArray(data.restaurants) ? (data.restaurants as RestaurantCandidate[]) : [];
    } catch {
      return this.memoryFallback.getUserTop4(userId);
    }
  }

  async saveUserTop4(userId: string, restaurants: RestaurantCandidate[]): Promise<void> {
    const list = restaurants.slice(0, 4);
    try {
      const { error } = await this.client
        .from("user_top4")
        .upsert({
          user_id: userId,
          restaurants: list,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        await this.memoryFallback.saveUserTop4(userId, list);
      }
    } catch {
      await this.memoryFallback.saveUserTop4(userId, list);
    }
  }
}

export function createRestaurantVisitStore(): RestaurantVisitStore {
  const client = getSupabaseClient();
  if (client) {
    return new SupabaseRestaurantVisitStore(client);
  }
  return new MemoryRestaurantVisitStore();
}
