/**
 * @file reviews.ts
 * @description API endpoints for community restaurant reviews, ratings, and ethical moderation.
 * Handles review creation, updates, helpfulness voting, and summary metric aggregation.
 */

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  createReviewRequestSchema,
  type RestaurantReview,
} from "@vegan-tools/domain";
import type { RestaurantReviewStore } from "../restaurant-review-store.js";
import { authenticateRequest, createTokenVerifier, type TokenVerifier } from "../auth.js";

export interface ReviewRoutesOptions {
  reviewStore: RestaurantReviewStore;
  verifyToken?: TokenVerifier;
}

export async function reviewRoutes(app: FastifyInstance, options: ReviewRoutesOptions) {
  const { reviewStore } = options;
  const verifyToken = options.verifyToken ?? createTokenVerifier();

  // 1. Get Reviews and Stats for a Restaurant (Public)
  app.get<{ Params: { id: string } }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const restaurantId = request.params.id;
      if (!restaurantId) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "Restaurant ID is required.",
        });
      }
      try {
        const result = await reviewStore.getReviews(restaurantId);
        return result;
      } catch (error) {
        request.log.error({ error, restaurantId }, "Failed to fetch restaurant reviews");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to load reviews.",
        });
      }
    },
  );

  // 2. Submit / Update Review for a Restaurant (Authenticated)
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const user = await authenticateRequest(request, verifyToken);
      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required to submit a review.",
        });
      }

      const restaurantId = request.params.id;
      const parsed = createReviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          code: "INVALID_REVIEW",
          message: "Invalid review content. Leaves score must be 1 to 5.",
          errors: parsed.error.format(),
        });
      }

      const { leavesScore, comment, userName, tags, photos, userLifestyle } = parsed.data;
      const now = new Date().toISOString();

      const review: RestaurantReview = {
        id: randomUUID(),
        restaurantId,
        userId: user.id,
        userName: userName?.trim() || user.name,
        userAvatarUrl: user.avatarUrl,
        userLifestyle: userLifestyle || user.lifestyle,
        leavesScore,
        comment: comment?.trim() || "",
        tags: tags || [],
        photos: photos || [],
        createdAt: now,
        updatedAt: now,
      };

      try {
        const saved = await reviewStore.saveReview(review);
        const all = await reviewStore.getReviews(restaurantId);
        return {
          review: saved,
          stats: all.stats,
        };
      } catch (error) {
        request.log.error({ error, restaurantId, userId: user.id }, "Failed to save restaurant review");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to save review.",
        });
      }
    },
  );

  // 3. Delete Review for a Restaurant (Authenticated)
  app.delete<{ Params: { id: string } }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const user = await authenticateRequest(request, verifyToken);
      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required to delete a review.",
        });
      }

      const restaurantId = request.params.id;
      try {
        const deleted = await reviewStore.deleteReview(restaurantId, user.id);
        const all = await reviewStore.getReviews(restaurantId);
        return {
          deleted,
          stats: all.stats,
        };
      } catch (error) {
        request.log.error({ error, restaurantId, userId: user.id }, "Failed to delete restaurant review");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to delete review.",
        });
      }
    },
  );

  // 4. Get Current User's Reviews (Authenticated)
  app.get("/v1/users/me/reviews", async (request, reply) => {
    const user = await authenticateRequest(request, verifyToken);
    if (!user) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Authentication required to view your reviews.",
      });
    }

    try {
      const reviews = await reviewStore.getUserReviews(user.id);
      return { reviews };
    } catch (error) {
      request.log.error({ error, userId: user.id }, "Failed to fetch user reviews");
      return reply.code(500).send({
        code: "STORE_ERROR",
        message: "Failed to load user reviews.",
      });
    }
  });
}
