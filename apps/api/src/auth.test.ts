import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { createTokenVerifier, type TokenVerifier } from "./auth.js";
import { MemoryRestaurantReviewStore } from "./restaurant-review-store.js";
import { MemoryRestaurantVisitStore } from "./restaurant-visit-store.js";
import { MemoryRepository } from "./store.js";

function forgedToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString("base64url");
  return `${header}.${payload}.forged-signature`;
}

/** Simulates Supabase Auth: only one known token is valid. */
const strictVerifier: TokenVerifier = async (token) =>
  token === "valid-token" ? { id: "user-1", name: "Real User" } : undefined;

async function buildStrictApp() {
  return buildApp({
    repo: new MemoryRepository(),
    reviewStore: new MemoryRestaurantReviewStore(),
    visitStore: new MemoryRestaurantVisitStore(),
    verifyToken: strictVerifier,
  });
}

describe("verified authentication", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects forged tokens on reviews, visits and evidence", async () => {
    const app = await buildStrictApp();
    const authorization = `Bearer ${forgedToken("user-1")}`;

    const review = await app.inject({
      method: "POST",
      url: "/v1/restaurants/rest-1/reviews",
      headers: { authorization },
      payload: { leavesScore: 5 },
    });
    expect(review.statusCode).toBe(401);

    const visit = await app.inject({
      method: "POST",
      url: "/v1/users/user-1/visits",
      headers: { authorization },
      payload: { restaurantId: "rest-1", restaurantName: "Vegan Oasis", visitDate: "2026-09-08" },
    });
    expect(visit.statusCode).toBe(401);

    const evidence = await app.inject({
      method: "POST",
      url: "/v1/products/4006381333931/evidence",
      headers: { authorization },
      payload: { ingredientsText: "water, sugar" },
    });
    expect(evidence.statusCode).toBe(401);

    await app.close();
  });

  it("accepts tokens the verifier confirms", async () => {
    const app = await buildStrictApp();
    const review = await app.inject({
      method: "POST",
      url: "/v1/restaurants/rest-1/reviews",
      headers: { authorization: "Bearer valid-token" },
      payload: { leavesScore: 5 },
    });
    expect(review.statusCode).toBe(200);
    expect(review.json().review).toMatchObject({ userId: "user-1", userName: "Real User" });
    await app.close();
  });

  it("requires a verified account and https URLs for restaurant edits", async () => {
    const app = await buildStrictApp();

    const anonymous = await app.inject({
      method: "POST",
      url: "/v1/restaurants/rest-1/edit",
      payload: { permanentlyClosed: true },
    });
    expect(anonymous.statusCode).toBe(401);

    const forged = await app.inject({
      method: "POST",
      url: "/v1/restaurants/rest-1/edit",
      headers: { authorization: `Bearer ${forgedToken("user-1")}` },
      payload: { permanentlyClosed: true },
    });
    expect(forged.statusCode).toBe(401);

    for (const websiteUrl of ["javascript:alert(1)", "http://example.com", "not a url"]) {
      const badUrl = await app.inject({
        method: "POST",
        url: "/v1/restaurants/rest-1/edit",
        headers: { authorization: "Bearer valid-token" },
        payload: { websiteUrl },
      });
      expect(badUrl.statusCode).toBe(400);
    }

    const ok = await app.inject({
      method: "POST",
      url: "/v1/restaurants/rest-1/edit",
      headers: { authorization: "Bearer valid-token" },
      payload: { websiteUrl: "https://example.com" },
    });
    expect(ok.statusCode).toBe(200);

    await app.close();
  });

  it("requires a verified account to reanalyze a published menu without its edit token", async () => {
    const app = await buildStrictApp();
    const res = await app.inject({ method: "POST", url: "/v1/menus/some-public-menu/reanalyze" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("fails closed without Supabase outside tests unless explicitly allowed", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOW_UNVERIFIED_TOKENS", "");
    const { resetSupabaseClient } = await import("./supabase.js");
    resetSupabaseClient();

    expect(await createTokenVerifier()(forgedToken("user-1"))).toBeUndefined();

    vi.stubEnv("AUTH_ALLOW_UNVERIFIED_TOKENS", "true");
    expect(await createTokenVerifier()(forgedToken("user-1"))).toMatchObject({ id: "user-1" });

    resetSupabaseClient();
  });
});
