import { describe, expect, it } from "vitest";
import {
  calculateReviewStats,
  MemoryRestaurantReviewStore,
  type RestaurantReviewStore,
} from "./restaurant-review-store.js";
import type { RestaurantReview } from "@vegan-tools/domain";

describe("RestaurantReviewStore", () => {
  it("calculates stats correctly for reviews", () => {
    expect(calculateReviewStats([])).toEqual({
      averageLeaves: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    const reviews: RestaurantReview[] = [
      {
        id: "r1",
        restaurantId: "place-1",
        userId: "user-1",
        userName: "Alice",
        leavesScore: 5,
        comment: "Great food!",
        createdAt: "2026-08-20T10:00:00Z",
        updatedAt: "2026-08-20T10:00:00Z",
      },
      {
        id: "r2",
        restaurantId: "place-1",
        userId: "user-2",
        userName: "Bob",
        leavesScore: 4,
        comment: "Good vegan options",
        createdAt: "2026-08-21T10:00:00Z",
        updatedAt: "2026-08-21T10:00:00Z",
      },
      {
        id: "r3",
        restaurantId: "place-1",
        userId: "user-3",
        userName: "Charlie",
        leavesScore: 4,
        comment: "Decent",
        createdAt: "2026-08-22T10:00:00Z",
        updatedAt: "2026-08-22T10:00:00Z",
      },
    ];

    const stats = calculateReviewStats(reviews);
    expect(stats.totalReviews).toBe(3);
    expect(stats.averageLeaves).toBe(4.3);
    expect(stats.distribution).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 2,
      5: 1,
    });
  });

  it("saves, lists, updates and deletes reviews in memory store", async () => {
    const store: RestaurantReviewStore = new MemoryRestaurantReviewStore();

    // 1. Initial get should be empty
    const initial = await store.getReviews("rest-123");
    expect(initial.reviews).toHaveLength(0);
    expect(initial.stats.totalReviews).toBe(0);

    // 2. Save a review
    const review1: RestaurantReview = {
      id: "rev-1",
      restaurantId: "rest-123",
      userId: "user-abc",
      userName: "Nils",
      leavesScore: 5,
      comment: "Incredible vegan dishes!",
      createdAt: "2026-08-22T10:00:00Z",
      updatedAt: "2026-08-22T10:00:00Z",
    };
    await store.saveReview(review1);

    const fetched = await store.getReviews("rest-123");
    expect(fetched.reviews).toHaveLength(1);
    expect(fetched.reviews[0]?.userName).toBe("Nils");
    expect(fetched.stats.averageLeaves).toBe(5);

    // 3. Update existing review (same user and restaurant)
    const updatedReview: RestaurantReview = {
      ...review1,
      leavesScore: 4,
      comment: "Updated comment: still great but changed menu slightly.",
      updatedAt: "2026-08-22T12:00:00Z",
    };
    await store.saveReview(updatedReview);

    const fetchedUpdated = await store.getReviews("rest-123");
    expect(fetchedUpdated.reviews).toHaveLength(1);
    expect(fetchedUpdated.reviews[0]?.leavesScore).toBe(4);
    expect(fetchedUpdated.reviews[0]?.comment).toBe(
      "Updated comment: still great but changed menu slightly."
    );

    // 4. Delete review
    const deleted = await store.deleteReview("rest-123", "user-abc");
    expect(deleted).toBe(true);

    const fetchedAfterDelete = await store.getReviews("rest-123");
    expect(fetchedAfterDelete.reviews).toHaveLength(0);
  });
});
