/**
 * @file visits.ts
 * @description API endpoints for personal restaurant visits diary and Top 4 favorites.
 * Enforces authenticated user checks matching the userId path parameter.
 */

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  saveVisitLogInputSchema,
  type RestaurantCandidate,
  type RestaurantVisitLog,
} from "@vegan-tools/domain";
import type { RestaurantVisitStore } from "../restaurant-visit-store.js";
import { extractUserFromAuthHeader } from "./reviews.js";

export interface VisitRoutesOptions {
  visitStore: RestaurantVisitStore;
}

export async function visitRoutes(app: FastifyInstance, options: VisitRoutesOptions) {
  const { visitStore } = options;

  // 1. Get user visits: GET /v1/users/:userId/visits
  app.get<{ Params: { userId: string } }>(
    "/v1/users/:userId/visits",
    async (request, reply) => {
      const { userId } = request.params;
      if (!userId) {
        return reply.code(400).send({ message: "User ID is required." });
      }

      const visits = await visitStore.getUserVisits(userId);
      return reply.send({ visits });
    }
  );

  // 2. Save user visit: POST /v1/users/:userId/visits
  app.post<{ Params: { userId: string }; Body: unknown }>(
    "/v1/users/:userId/visits",
    async (request, reply) => {
      const { userId } = request.params;
      const user = extractUserFromAuthHeader(request.headers.authorization);

      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "You must be authenticated to save visit logs.",
        });
      }

      if (user.id !== userId) {
        return reply.code(403).send({
          code: "FORBIDDEN",
          message: "You cannot manage visit logs for another user.",
        });
      }

      const parsed = saveVisitLogInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "Invalid visit log data.",
          errors: parsed.error.format(),
        });
      }

      const input = parsed.data;
      const now = new Date().toISOString();
      const visit: RestaurantVisitLog = {
        id: input.id || randomUUID(),
        userId,
        restaurantId: input.restaurantId,
        restaurantName: input.restaurantName,
        restaurantAddress: input.restaurantAddress,
        restaurantImage: input.restaurantImage,
        cuisine: input.cuisine,
        visitDate: input.visitDate,
        rating: input.rating,
        notes: input.notes || "",
        dishesTried: input.dishesTried || [],
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      const saved = await visitStore.saveVisit(visit);
      return reply.code(201).send({ ok: true, visit: saved });
    }
  );

  // 3. Delete user visit: DELETE /v1/users/:userId/visits/:visitId
  app.delete<{ Params: { userId: string; visitId: string } }>(
    "/v1/users/:userId/visits/:visitId",
    async (request, reply) => {
      const { userId, visitId } = request.params;
      const user = extractUserFromAuthHeader(request.headers.authorization);

      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "You must be authenticated to delete visit logs.",
        });
      }

      if (user.id !== userId) {
        return reply.code(403).send({
          code: "FORBIDDEN",
          message: "You cannot manage visit logs for another user.",
        });
      }

      const deleted = await visitStore.deleteVisit(visitId, userId);
      return reply.code(200).send({ ok: true, success: deleted });
    }
  );

  // 4. Get user top 4: GET /v1/users/:userId/top4
  app.get<{ Params: { userId: string } }>(
    "/v1/users/:userId/top4",
    async (request, reply) => {
      const { userId } = request.params;
      const restaurants = await visitStore.getUserTop4(userId);
      return reply.send({ restaurants });
    }
  );

  // 5. Save user top 4: PUT /v1/users/:userId/top4
  app.put<{ Params: { userId: string }; Body: { restaurants?: RestaurantCandidate[] } }>(
    "/v1/users/:userId/top4",
    async (request, reply) => {
      const { userId } = request.params;
      const user = extractUserFromAuthHeader(request.headers.authorization);

      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "You must be authenticated to update top 4 favorites.",
        });
      }

      if (user.id !== userId) {
        return reply.code(403).send({
          code: "FORBIDDEN",
          message: "You cannot update top 4 favorites for another user.",
        });
      }

      const restaurants = Array.isArray(request.body?.restaurants) ? request.body.restaurants : [];
      if (restaurants.length > 4) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "Top 4 favorites cannot exceed 4 restaurants.",
        });
      }

      await visitStore.saveUserTop4(userId, restaurants);
      return reply.code(200).send({ ok: true, restaurants: restaurants.slice(0, 4) });
    }
  );
}
