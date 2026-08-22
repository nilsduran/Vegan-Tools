import type { RestaurantReview, RestaurantReviewStats } from "@vegan-tools/domain";
import { supabaseCredentialsFromEnvironment } from "./environment.js";

export interface RestaurantReviewsResult {
  reviews: RestaurantReview[];
  stats: RestaurantReviewStats;
}

export interface RestaurantReviewStore {
  getReviews(restaurantId: string): Promise<RestaurantReviewsResult>;
  saveReview(review: RestaurantReview): Promise<RestaurantReview>;
  deleteReview(restaurantId: string, userId: string): Promise<boolean>;
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
  private readonly memoryFallback = new MemoryRestaurantReviewStore();

  constructor(
    private readonly url: string,
    private readonly secretKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.secretKey,
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
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
      const queryUrl = `${this.url}/rest/v1/restaurant_reviews?restaurant_id=eq.${encodeURIComponent(
        restaurantId,
      )}&order=created_at.desc`;

      const response = await fetch(queryUrl, {
        method: "GET",
        headers: this.headers(),
      });

      if (!response.ok) {
        return this.memoryFallback.getReviews(restaurantId);
      }

      const rows = (await response.json()) as SupabaseReviewRow[];
      const reviews = Array.isArray(rows) ? rows.map((r) => this.rowToReview(r)) : [];

      if (reviews.length === 0) {
        return this.memoryFallback.getReviews(restaurantId);
      }

      return {
        reviews,
        stats: calculateReviewStats(reviews),
      };
    } catch {
      return this.memoryFallback.getReviews(restaurantId);
    }
  }

  async saveReview(review: RestaurantReview): Promise<RestaurantReview> {
    const upsertUrl = `${this.url}/rest/v1/restaurant_reviews?on_conflict=restaurant_id,user_id`;

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
      const response = await fetch(upsertUrl, {
        method: "POST",
        headers: this.headers({
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(
          `[SupabaseRestaurantReviewStore] Supabase returned status ${response.status}. Using in-memory fallback. Ensure the 'restaurant_reviews' table exists in Supabase.`,
        );
        return this.memoryFallback.saveReview(review);
      }

      const result = (await response.json()) as SupabaseReviewRow[];
      if (Array.isArray(result) && result[0]) {
        return this.rowToReview(result[0]);
      }
      return review;
    } catch (error) {
      console.warn(
        `[SupabaseRestaurantReviewStore] Network error connecting to Supabase (${error instanceof Error ? error.message : String(error)}). Using in-memory fallback.`,
      );
      return this.memoryFallback.saveReview(review);
    }
  }

  async deleteReview(restaurantId: string, userId: string): Promise<boolean> {
    try {
      const deleteUrl = `${this.url}/rest/v1/restaurant_reviews?restaurant_id=eq.${encodeURIComponent(
        restaurantId,
      )}&user_id=eq.${encodeURIComponent(userId)}`;

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: this.headers({
          Prefer: "return=representation",
        }),
      });

      if (!response.ok) {
        return this.memoryFallback.deleteReview(restaurantId, userId);
      }

      const result = (await response.json()) as SupabaseReviewRow[];
      const deletedFromSupabase = Array.isArray(result) && result.length > 0;
      const deletedFromMemory = await this.memoryFallback.deleteReview(restaurantId, userId);
      return deletedFromSupabase || deletedFromMemory;
    } catch {
      return this.memoryFallback.deleteReview(restaurantId, userId);
    }
  }
}

export function createRestaurantReviewStore(): RestaurantReviewStore {
  const credentials = supabaseCredentialsFromEnvironment();
  if (credentials) {
    return new SupabaseRestaurantReviewStore(credentials.url, credentials.secretKey);
  }
  return new MemoryRestaurantReviewStore();
}
