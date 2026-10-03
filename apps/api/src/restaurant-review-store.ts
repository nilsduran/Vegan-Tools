import type { RestaurantReview, RestaurantReviewStats } from "@vegan-tools/domain";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseCredentialsFromEnvironment } from "./environment.js";
import { getSupabaseClient } from "./supabase.js";

export interface RestaurantReviewsResult {
  reviews: RestaurantReview[];
  stats: RestaurantReviewStats;
}

export interface RestaurantReviewStore {
  getReviews(restaurantId: string): Promise<RestaurantReviewsResult>;
  getUserReviews(userId: string): Promise<RestaurantReview[]>;
  saveReview(review: RestaurantReview): Promise<RestaurantReview>;
  deleteReview(restaurantId: string, userId: string): Promise<boolean>;
  updateAuthorUsername(userId: string, newUsername: string): Promise<number>;
}

export function calculateReviewStats(reviews: RestaurantReview[]): RestaurantReviewStats {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (reviews.length === 0) {
    return {
      averageLeaves: 0,
      totalReviews: 0,
      distribution,
    };
  }

  let totalScore = 0;
  for (const review of reviews) {
    const score = Math.max(1, Math.min(5, Math.round(review.leavesScore))) as 1 | 2 | 3 | 4 | 5;
    distribution[score] = (distribution[score] || 0) + 1;
    totalScore += review.leavesScore;
  }

  const averageLeaves = Math.round((totalScore / reviews.length) * 10) / 10;

  return {
    averageLeaves,
    totalReviews: reviews.length,
    distribution,
  };
}

export class MemoryRestaurantReviewStore implements RestaurantReviewStore {
  // Map of restaurantId -> Map of userId -> RestaurantReview
  private readonly store = new Map<string, Map<string, RestaurantReview>>();

  async getReviews(restaurantId: string): Promise<RestaurantReviewsResult> {
    const userMap = this.store.get(restaurantId);
    const reviews = userMap
      ? [...userMap.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
    return {
      reviews,
      stats: calculateReviewStats(reviews),
    };
  }

  async getUserReviews(userId: string): Promise<RestaurantReview[]> {
    const userReviews: RestaurantReview[] = [];
    for (const userMap of this.store.values()) {
      const review = userMap.get(userId);
      if (review) {
        userReviews.push(review);
      }
    }
    return userReviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveReview(review: RestaurantReview): Promise<RestaurantReview> {
    let userMap = this.store.get(review.restaurantId);
    if (!userMap) {
      userMap = new Map();
      this.store.set(review.restaurantId, userMap);
    }
    userMap.set(review.userId, review);
    return review;
  }

  async deleteReview(restaurantId: string, userId: string): Promise<boolean> {
    const userMap = this.store.get(restaurantId);
    if (!userMap) return false;
    return userMap.delete(userId);
  }

  async updateAuthorUsername(userId: string, newUsername: string): Promise<number> {
    let count = 0;
    const formattedName = newUsername.startsWith("@") ? newUsername : `@${newUsername}`;
    for (const userMap of this.store.values()) {
      const review = userMap.get(userId);
      if (review) {
        review.userName = formattedName;
        review.updatedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }
}

interface SupabaseReviewRow {
  id: string;
  restaurant_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  leaves_score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseRestaurantReviewStore implements RestaurantReviewStore {
  private readonly client: SupabaseClient;
  private readonly memoryFallback = new MemoryRestaurantReviewStore();

  constructor(clientOrUrl: SupabaseClient | string, secretKey?: string) {
    if (typeof clientOrUrl === "string") {
      this.client = createClient(clientOrUrl, secretKey || "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.client = clientOrUrl;
    }
  }

  private rowToReview(row: SupabaseReviewRow): RestaurantReview {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatarUrl: row.user_avatar_url || undefined,
      leavesScore: row.leaves_score,
      comment: row.comment || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getReviews(restaurantId: string): Promise<RestaurantReviewsResult> {
    try {
      const { data, error } = await this.client
        .from("restaurant_reviews")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return this.memoryFallback.getReviews(restaurantId);
      }

      const reviews = (data as SupabaseReviewRow[]).map((r) => this.rowToReview(r));
      return {
        reviews,
        stats: calculateReviewStats(reviews),
      };
    } catch {
      return this.memoryFallback.getReviews(restaurantId);
    }
  }

  async getUserReviews(userId: string): Promise<RestaurantReview[]> {
    try {
      const { data, error } = await this.client
        .from("restaurant_reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return this.memoryFallback.getUserReviews(userId);
      }

      return (data as SupabaseReviewRow[]).map((r) => this.rowToReview(r));
    } catch {
      return this.memoryFallback.getUserReviews(userId);
    }
  }

  async saveReview(review: RestaurantReview): Promise<RestaurantReview> {
    const payload: SupabaseReviewRow = {
      id: review.id,
      restaurant_id: review.restaurantId,
      user_id: review.userId,
      user_name: review.userName,
      user_avatar_url: review.userAvatarUrl || null,
      leaves_score: review.leavesScore,
      comment: review.comment || "",
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    };

    try {
      const { data, error } = await this.client
        .from("restaurant_reviews")
        .upsert(payload, { onConflict: "restaurant_id,user_id" })
        .select()
        .single();

      if (error || !data) {
        console.warn(
          `[SupabaseRestaurantReviewStore] Supabase error (${error?.message}). Using in-memory fallback.`,
        );
        return this.memoryFallback.saveReview(review);
      }

      return this.rowToReview(data as SupabaseReviewRow);
    } catch (error) {
      console.warn(
        `[SupabaseRestaurantReviewStore] Network error connecting to Supabase (${error instanceof Error ? error.message : String(error)}). Using in-memory fallback.`,
      );
      return this.memoryFallback.saveReview(review);
    }
  }

  async deleteReview(restaurantId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from("restaurant_reviews")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("user_id", userId)
        .select();

      const deletedFromSupabase = !error && Array.isArray(data) && data.length > 0;
      const deletedFromMemory = await this.memoryFallback.deleteReview(restaurantId, userId);
      return deletedFromSupabase || deletedFromMemory;
    } catch {
      return this.memoryFallback.deleteReview(restaurantId, userId);
    }
  }

  async updateAuthorUsername(userId: string, newUsername: string): Promise<number> {
    const formattedName = newUsername.startsWith("@") ? newUsername : `@${newUsername}`;
    try {
      const { data, error } = await this.client
        .from("restaurant_reviews")
        .update({ user_name: formattedName, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select();

      const memoryCount = await this.memoryFallback.updateAuthorUsername(userId, newUsername);
      if (!error && Array.isArray(data)) {
        return Math.max(data.length, memoryCount);
      }
      return memoryCount;
    } catch {
      return this.memoryFallback.updateAuthorUsername(userId, newUsername);
    }
  }
}

export function createRestaurantReviewStore(): RestaurantReviewStore {
  const client = getSupabaseClient();
  if (client) {
    return new SupabaseRestaurantReviewStore(client);
  }
  return new MemoryRestaurantReviewStore();
}
