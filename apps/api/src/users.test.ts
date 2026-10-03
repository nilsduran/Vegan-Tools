import { describe, expect, it } from "vitest";
import {
  MemoryUserStore,
  normalizeUsername,
  verifyPassword,
} from "./user-store.js";
import { MemoryRestaurantReviewStore } from "./restaurant-review-store.js";
import type { RestaurantReview } from "@vegan-tools/domain";

describe("UserStore & Security", () => {

  describe("MemoryUserStore User Management", () => {
    it("creates a user successfully and verifies hashed password", async () => {
      const store = new MemoryUserStore();
      const user = await store.createUser({
        email: "carla@exemple.cat",
        username: "carla_bcn",
        password: "securePassword123!",
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("carla@exemple.cat");
      expect(user.username).toBe("carla_bcn");
      expect(user.name).toBe("carla_bcn");
      expect(user.passwordHash).toBeDefined();
      expect(verifyPassword("securePassword123!", user.passwordHash!)).toBe(true);
      expect(verifyPassword("wrongPassword", user.passwordHash!)).toBe(false);
    });

    it("allows uppercase letters in username and preserves them", async () => {
      const store = new MemoryUserStore();
      const user = await store.createUser({
        email: "nils@exemple.cat",
        username: "Nils",
      });

      expect(user.username).toBe("Nils");
      expect(user.name).toBe("Nils");
    });

    it("rejects usernames that impersonate the official project with vegan and tools/tool", async () => {
      const store = new MemoryUserStore();
      await expect(
        store.createUser({
          email: "bad1@exemple.cat",
          username: "vegantools",
        }),
      ).rejects.toThrow(/cannot combine 'vegan' and 'tool'/i);

      await expect(
        store.createUser({
          email: "bad2@exemple.cat",
          username: "Vegan-Tools",
        }),
      ).rejects.toThrow(/cannot combine 'vegan' and 'tool'/i);

      await expect(
        store.createUser({
          email: "bad3@exemple.cat",
          username: "my_vegantool",
        }),
      ).rejects.toThrow(/cannot combine 'vegan' and 'tool'/i);
    });

    it("rejects duplicate email addresses case-insensitively", async () => {
      const store = new MemoryUserStore();
      await store.createUser({
        email: "jordi@vegan.cat",
        username: "jordi_v",
      });

      await expect(
        store.createUser({
          email: "JORDI@vegan.cat",
          username: "jordi_2",
        }),
      ).rejects.toThrow("Email is already registered.");
    });

    it("rejects duplicate usernames case-insensitively", async () => {
      const store = new MemoryUserStore();
      await store.createUser({
        email: "user1@vegan.cat",
        username: "mireia_plants",
      });

      await expect(
        store.createUser({
          email: "user2@vegan.cat",
          username: "MIREIA_PLANTS",
        }),
      ).rejects.toThrow("Username is already taken.");
    });

    it("handles password reset token workflow", async () => {
      const store = new MemoryUserStore();
      const user = await store.createUser({
        email: "reset@exemple.cat",
        username: "reset_user",
        password: "oldPassword123",
      });

      // Request reset
      const reset = await store.requestPasswordReset("reset@exemple.cat");
      expect(reset).not.toBeNull();
      expect(reset?.token).toHaveLength(48); // 24 hex bytes = 48 chars
      expect(reset?.expiresAt).toBeGreaterThan(Date.now());

      // Reset password with token
      const updated = await store.resetPasswordWithToken(reset!.token, "newPassword456!");
      expect(verifyPassword("newPassword456!", updated.passwordHash!)).toBe(true);
      expect(verifyPassword("oldPassword123", updated.passwordHash!)).toBe(false);

      // Token cannot be reused
      await expect(
        store.resetPasswordWithToken(reset!.token, "anotherPassword"),
      ).rejects.toThrow("Invalid or expired password reset token.");
    });

    it("enforces rate-limiting of maximum 2 username changes per 30 days", async () => {
      const store = new MemoryUserStore();
      const user = await store.createUser({
        email: "pol@exemple.cat",
        username: "pol_initial",
      });

      // 1st change: allowed
      const change1 = await store.updateUsername(user.id, "pol_first");
      expect(change1.user.username).toBe("pol_first");
      expect(change1.user.usernameChanges).toHaveLength(1);

      // 2nd change: allowed
      const change2 = await store.updateUsername(user.id, "pol_second");
      expect(change2.user.username).toBe("pol_second");
      expect(change2.user.usernameChanges).toHaveLength(2);

      // 3rd change within 30 days: rejected!
      await expect(store.updateUsername(user.id, "pol_third")).rejects.toThrow(
        "Rate limit exceeded: maximum 2 username changes per 30 days.",
      );
    });

    it("cascades username changes to previous restaurant reviews in RestaurantReviewStore", async () => {
      const userStore = new MemoryUserStore();
      const reviewStore = new MemoryRestaurantReviewStore();

      const user = await userStore.createUser({
        email: "reviewer@exemple.cat",
        username: "paula_vegi",
      });

      // Add two reviews by this user
      const review1: RestaurantReview = {
        id: "rev-1",
        restaurantId: "rest-a",
        userId: user.id,
        userName: "@paula_vegi",
        leavesScore: 5,
        comment: "Excel·lent lloc 100% vegà!",
        createdAt: "2026-08-01T12:00:00Z",
        updatedAt: "2026-08-01T12:00:00Z",
      };
      const review2: RestaurantReview = {
        id: "rev-2",
        restaurantId: "rest-b",
        userId: user.id,
        userName: "@paula_vegi",
        leavesScore: 4.5,
        comment: "Molt bones opcions!",
        createdAt: "2026-08-05T14:00:00Z",
        updatedAt: "2026-08-05T14:00:00Z",
      };

      await reviewStore.saveReview(review1);
      await reviewStore.saveReview(review2);

      // Verify reviews initial state
      const initialReviews = await reviewStore.getUserReviews(user.id);
      expect(initialReviews).toHaveLength(2);
      expect(initialReviews[0]?.userName).toBe("@paula_vegi");
      expect(initialReviews[1]?.userName).toBe("@paula_vegi");

      // Update username in userStore with cascade
      const result = await userStore.updateUsername(user.id, "paula_barcelona", reviewStore);
      expect(result.user.username).toBe("paula_barcelona");
      expect(result.cascadedReviews).toBe(2);

      // Check that reviewStore now reflects the updated author handle
      const updatedReviews = await reviewStore.getUserReviews(user.id);
      expect(updatedReviews).toHaveLength(2);
      expect(updatedReviews[0]?.userName).toBe("@paula_barcelona");
      expect(updatedReviews[1]?.userName).toBe("@paula_barcelona");

      const restAReviews = await reviewStore.getReviews("rest-a");
      expect(restAReviews.reviews[0]?.userName).toBe("@paula_barcelona");
    });
  });
});
