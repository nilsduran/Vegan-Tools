import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { MemoryRestaurantVisitStore } from "../restaurant-visit-store.js";
import { MemoryRepository } from "../store.js";

function makeAuthToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, email: `${userId}@example.com` })).toString("base64url");
  return `Bearer ${header}.${payload}.mock-sig`;
}

describe("Visit & Top4 routes (/v1/users/:userId/visits, /v1/users/:userId/top4)", () => {
  it("rejects unauthorized requests for visits", async () => {
    const visitStore = new MemoryRestaurantVisitStore();
    const app = await buildApp({ repo: new MemoryRepository(), visitStore });

    const postRes = await app.inject({
      method: "POST",
      url: "/v1/users/user-1/visits",
      payload: {
        restaurantId: "rest-1",
        restaurantName: "Vegan Oasis",
        visitDate: "2026-09-08",
      },
    });
    expect(postRes.statusCode).toBe(401);

    const wrongUserRes = await app.inject({
      method: "POST",
      url: "/v1/users/user-1/visits",
      headers: { authorization: makeAuthToken("user-2") },
      payload: {
        restaurantId: "rest-1",
        restaurantName: "Vegan Oasis",
        visitDate: "2026-09-08",
      },
    });
    expect(wrongUserRes.statusCode).toBe(403);

    await app.close();
  });

  it("creates, fetches, and deletes user visits", async () => {
    const visitStore = new MemoryRestaurantVisitStore();
    const app = await buildApp({ repo: new MemoryRepository(), visitStore });
    const authHeader = makeAuthToken("user-42");

    // 1. Create visit
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/users/user-42/visits",
      headers: { authorization: authHeader },
      payload: {
        restaurantId: "rest-green",
        restaurantName: "Green Life",
        visitDate: "2026-09-08",
        rating: 4.5,
        notes: "Dinar deliciós",
        dishesTried: [
          "Burger Vegana",
          "Tiramisú casolà (fora de carta)",
        ],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const createdBody = createRes.json();
    expect(createdBody.ok).toBe(true);
    expect(createdBody.visit.restaurantName).toBe("Green Life");
    expect(createdBody.visit.dishesTried).toHaveLength(2);
    expect(createdBody.visit.dishesTried[1]).toContain("(fora de carta)");
    const visitId = createdBody.visit.id;

    // 2. Fetch visits for user
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/users/user-42/visits",
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(listBody.visits).toHaveLength(1);
    expect(listBody.visits[0].id).toBe(visitId);

    // 3. Delete visit
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/v1/users/user-42/visits/${visitId}`,
      headers: { authorization: authHeader },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().ok).toBe(true);

    // 4. Verify list is now empty
    const listAfterRes = await app.inject({
      method: "GET",
      url: "/v1/users/user-42/visits",
    });
    expect(listAfterRes.json().visits).toHaveLength(0);

    await app.close();
  });

  it("manages user Top 4 favorite restaurants", async () => {
    const visitStore = new MemoryRestaurantVisitStore();
    const app = await buildApp({ repo: new MemoryRepository(), visitStore });
    const authHeader = makeAuthToken("user-top");

    // Initially empty
    const initRes = await app.inject({
      method: "GET",
      url: "/v1/users/user-top/top4",
    });
    expect(initRes.statusCode).toBe(200);
    expect(initRes.json()).toEqual({ restaurants: [] });

    // Save Top 4
    const topRestaurants = [
      { id: "r1", name: "Rest 1", address: "Carrer 1" },
      { id: "r2", name: "Rest 2" },
      { id: "r3", name: "Rest 3" },
      { id: "r4", name: "Rest 4" },
    ];
    const saveRes = await app.inject({
      method: "PUT",
      url: "/v1/users/user-top/top4",
      headers: { authorization: authHeader },
      payload: { restaurants: topRestaurants },
    });
    expect(saveRes.statusCode).toBe(200);
    expect(saveRes.json().ok).toBe(true);
    expect(saveRes.json().restaurants).toHaveLength(4);

    // Rejects more than 4 restaurants
    const overflowRes = await app.inject({
      method: "PUT",
      url: "/v1/users/user-top/top4",
      headers: { authorization: authHeader },
      payload: {
        restaurants: [
          ...topRestaurants,
          { id: "r5", name: "Rest 5" },
        ],
      },
    });
    expect(overflowRes.statusCode).toBe(400);

    // Fetch and check persisted Top 4
    const getRes = await app.inject({
      method: "GET",
      url: "/v1/users/user-top/top4",
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().restaurants).toHaveLength(4);
    expect(getRes.json().restaurants[0].id).toBe("r1");

    await app.close();
  });
});
