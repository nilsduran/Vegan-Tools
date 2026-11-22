/**
 * @file account.ts
 * @description The signed-in user's own account: export everything we hold about them
 * (GDPR portability) and delete it for good (right to erasure).
 *
 * Deletion removes reviews, diary visits and the Top 4, then the Supabase Auth user.
 * If any step fails the request fails, so the app never tells someone their data is
 * gone while it is still stored.
 */

import type { FastifyInstance } from "fastify";
import type { RestaurantReviewStore } from "../restaurant-review-store.js";
import type { RestaurantVisitStore } from "../restaurant-visit-store.js";
import { authenticateRequest, createTokenVerifier, type TokenVerifier } from "../auth.js";
import { getSupabaseClient } from "../supabase.js";

/** Removes the identity itself from the auth provider. */
export type AuthUserDeleter = (userId: string) => Promise<void>;

export interface AccountRoutesOptions {
  reviewStore: RestaurantReviewStore;
  visitStore: RestaurantVisitStore;
  verifyToken?: TokenVerifier;
  deleteAuthUser?: AuthUserDeleter;
}

/** Deletes the Supabase Auth user; without Supabase there is no stored identity to remove. */
export function createAuthUserDeleter(): AuthUserDeleter {
  return async (userId) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error && error.status !== 404) {
      throw new Error(`Failed to delete auth user: ${error.message}`);
    }
  };
}

export async function accountRoutes(app: FastifyInstance, options: AccountRoutesOptions) {
  const { reviewStore, visitStore } = options;
  const verifyToken = options.verifyToken ?? createTokenVerifier();
  const deleteAuthUser = options.deleteAuthUser ?? createAuthUserDeleter();

  app.get("/v1/users/me/export", async (request, reply) => {
    const user = await authenticateRequest(request, verifyToken);
    if (!user) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Authentication required." });
    }
    try {
      const [reviews, visits, top4] = await Promise.all([
        reviewStore.getUserReviews(user.id),
        visitStore.getUserVisits(user.id),
        visitStore.getUserTop4(user.id),
      ]);
      return {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, name: user.name, lifestyle: user.lifestyle },
        reviews,
        visits,
        top4,
      };
    } catch (error) {
      request.log.error({ error }, "Failed to export account data");
      return reply.code(500).send({ code: "STORE_ERROR", message: "Failed to export account data." });
    }
  });

  app.delete("/v1/users/me", async (request, reply) => {
    const user = await authenticateRequest(request, verifyToken);
    if (!user) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Authentication required." });
    }
    try {
      const deletedReviews = await reviewStore.deleteUserReviews(user.id);
      const deletedVisits = await visitStore.deleteUserData(user.id);
      await deleteAuthUser(user.id);
      return { ok: true, deletedReviews, deletedVisits };
    } catch (error) {
      request.log.error({ error }, "Failed to delete account");
      return reply.code(500).send({
        code: "ACCOUNT_DELETE_FAILED",
        message: "Your account could not be fully deleted. Nothing was reported as deleted; please try again.",
      });
    }
  });
}
