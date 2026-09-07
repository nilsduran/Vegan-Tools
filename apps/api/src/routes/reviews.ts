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

interface AuthUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export function extractUserFromAuthHeader(authHeader?: string): AuthUser | undefined {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  if (!token) return undefined;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const payloadJson = Buffer.from(parts[1]!, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (!payload.sub) return undefined;

    const name =
      payload.user_metadata?.name ||
      payload.user_metadata?.full_name ||
      payload.user_metadata?.user_name ||
      (payload.email ? payload.email.split("@")[0] : undefined) ||
      "Anònim";

    const avatarUrl =
      payload.user_metadata?.avatar_url ||
      payload.user_metadata?.picture ||
      undefined;

    return {
      id: String(payload.sub),
      name: String(name),
      avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    };
  } catch {
    return undefined;
  }
}

export interface ReviewRoutesOptions {
  reviewStore: RestaurantReviewStore;
}

export async function reviewRoutes(app: FastifyInstance, options: ReviewRoutesOptions) {
  const { reviewStore } = options;

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
      const user = extractUserFromAuthHeader(request.headers.authorization);
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

      const { leavesScore, comment, userName } = parsed.data;
      const now = new Date().toISOString();

      const review: RestaurantReview = {
        id: randomUUID(),
        restaurantId,
        userId: user.id,
        userName: userName?.trim() || user.name,
        userAvatarUrl: user.avatarUrl,
        leavesScore,
        comment: comment?.trim() || "",
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
      const user = extractUserFromAuthHeader(request.headers.authorization);
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
    const user = extractUserFromAuthHeader(request.headers.authorization);
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
