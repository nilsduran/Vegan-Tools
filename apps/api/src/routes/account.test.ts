import { describe, expect, it, vi } from "vitest";
import type { RestaurantReview, RestaurantVisitLog } from "@vegan-tools/domain";
import { buildApp } from "../app.js";
import { MemoryRestaurantReviewStore } from "../restaurant-review-store.js";
import { MemoryRestaurantVisitStore } from "../restaurant-visit-store.js";
import { MemoryRepository } from "../store.js";

function bearer(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, email: `${userId}@example.com` })).toString("base64url");
  return `Bearer ${header}.${payload}.mock-sig`;
}

const now = "2026-11-22T10:00:00.000Z";

function review(userId: string, restaurantId: string): RestaurantReview {
  return {
    id: `${userId}-${restaurantId}`,
    restaurantId,
    userId,
    userName: `@${userId}`,
    leavesScore: 5,
    comment: "",
    createdAt: now,
    updatedAt: now,
  } as RestaurantReview;
}

function visit(userId: string, id: string): RestaurantVisitLog {
  return {
    id,
    userId,
    restaurantId: "rest-1",
    restaurantName: "Green Life",
    visitDate: "2026-11-20",
    createdAt: now,
    updatedAt: now,
  } as RestaurantVisitLog;
}

async function setup() {
  const reviewStore = new MemoryRestaurantReviewStore();
  const visitStore = new MemoryRestaurantVisitStore();
  await reviewStore.saveReview(review("alice", "rest-1"));
  await reviewStore.saveReview(review("alice", "rest-2"));
  await reviewStore.saveReview(review("bob", "rest-1"));
  await visitStore.saveVisit(visit("alice", "v1"));
  await visitStore.saveUserTop4("alice", []);
  await visitStore.saveVisit(visit("bob", "v2"));
  const deleteAuthUser = vi.fn().mockResolvedValue(undefined);
  const app = await buildApp({ repo: new MemoryRepository(), reviewStore, visitStore, deleteAuthUser });
  return { app, reviewStore, visitStore, deleteAuthUser };
}

describe("account routes", () => {
  it("requires authentication to export or delete", async () => {
    const { app, deleteAuthUser } = await setup();
    expect((await app.inject({ method: "GET", url: "/v1/users/me/export" })).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: "/v1/users/me" })).statusCode).toBe(401);
    expect(deleteAuthUser).not.toHaveBeenCalled();
    await app.close();
  });

  it("exports only the caller's reviews and visits", async () => {
    const { app } = await setup();
    const res = await app.inject({ method: "GET", url: "/v1/users/me/export", headers: { authorization: bearer("alice") } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { reviews: RestaurantReview[]; visits: RestaurantVisitLog[] };
    expect(body.reviews).toHaveLength(2);
    expect(body.visits.map((v) => v.id)).toEqual(["v1"]);
    await app.close();
  });

  it("deletes the caller's data and auth user, and nobody else's", async () => {
    const { app, reviewStore, visitStore, deleteAuthUser } = await setup();
    const res = await app.inject({ method: "DELETE", url: "/v1/users/me", headers: { authorization: bearer("alice") } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, deletedReviews: 2, deletedVisits: 1 });
    expect(deleteAuthUser).toHaveBeenCalledWith("alice");
    expect(await reviewStore.getUserReviews("alice")).toHaveLength(0);
    expect(await visitStore.getUserVisits("alice")).toHaveLength(0);
    expect(await reviewStore.getUserReviews("bob")).toHaveLength(1);
    expect(await visitStore.getUserVisits("bob")).toHaveLength(1);
    await app.close();
  });

  it("reports failure instead of success when a step fails", async () => {
    const { app, reviewStore, deleteAuthUser } = await setup();
    vi.spyOn(reviewStore, "deleteUserReviews").mockRejectedValue(new Error("db down"));
    const res = await app.inject({ method: "DELETE", url: "/v1/users/me", headers: { authorization: bearer("alice") } });
    expect(res.statusCode).toBe(500);
    expect(deleteAuthUser).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("diary privacy", () => {
  it("only lets the owner read their visits", async () => {
    const { app } = await setup();
    expect((await app.inject({ method: "GET", url: "/v1/users/alice/visits" })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: "GET", url: "/v1/users/alice/visits", headers: { authorization: bearer("bob") } })).statusCode,
    ).toBe(403);
    const own = await app.inject({ method: "GET", url: "/v1/users/alice/visits", headers: { authorization: bearer("alice") } });
    expect(own.statusCode).toBe(200);
    await app.close();
  });
});
