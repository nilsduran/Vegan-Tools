import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";

describe("Universal Restaurant Search across multiple cities", () => {
  const getApp = async () => buildApp(new MemoryRepository());

  // Coordinates of user located in Barcelona center
  const USER_BCN_LAT = "41.3879";
  const USER_BCN_LNG = "2.1699";

  describe("Barcelona restaurants", () => {
    it("finds Desoriente by exact name and with city hint", async () => {
      const app = await getApp();
      // 1. By name only with user location bias
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Desoriente&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string; address: string }>;
      expect(results1.length).toBeGreaterThan(0);
      expect(results1.some((r) => r.name.toLowerCase().includes("desoriente"))).toBe(true);

      // 2. By name with city hint
      const resWithCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Desoriente, Barcelona&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string; address: string }>;
      expect(results2.length).toBeGreaterThan(0);
      expect(results2.some((r) => r.name.toLowerCase().includes("desoriente"))).toBe(true);
    });

    it("finds Teresa Carles by name and with city hint", async () => {
      const app = await getApp();
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Teresa Carles&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string }>;
      expect(results1.some((r) => r.name.toLowerCase().includes("teresa carles"))).toBe(true);

      const resWithCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Teresa Carles, Barcelona&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(results2.some((r) => r.name.toLowerCase().includes("teresa carles"))).toBe(true);
    });

    it("finds Roots Vegan by name and with city hint", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Roots Vegan&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("roots"))).toBe(true);
    });
  });

  describe("Sant Joan Despí restaurants", () => {
    it("finds restaurants in Sant Joan Despí from Barcelona coords", async () => {
      const app = await getApp();
      const resCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=restaurants, Sant Joan Despí&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resCity.statusCode).toBe(200);
      const results = resCity.json() as Array<{ name: string; address: string }>;
      expect(results.length).toBeGreaterThan(0);
    });

    it("finds Foment in Sant Joan Despí with city hint", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Foment, Sant Joan Despí&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Girona restaurants (queried while user is in Barcelona)", () => {
    it("finds Bionèctar with accent and with city hint while located in Barcelona", async () => {
      const app = await getApp();
      // Name only with accent (Bionèctar) from Barcelona coordinates
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Bionèctar&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string }>;
      expect(results1.some((r) => r.name.toLowerCase().includes("bionectar"))).toBe(true);

      // Name with city hint from Barcelona coordinates
      const resWithCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Bionèctar, Girona&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(results2.some((r) => r.name.toLowerCase().includes("bionectar"))).toBe(true);
    });

    it("finds Restaurant Integral in Girona with city hint from Barcelona", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Integral, Girona&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("integral"))).toBe(true);
    });
  });

  describe("London restaurants (queried while user is in Barcelona)", () => {
    it("finds Purezza in London while user coords are set to Barcelona", async () => {
      const app = await getApp();
      // 1. By query with city hint while browser sends Barcelona GPS coords
      const resWithCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Purezza, London&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resWithCity.statusCode).toBe(200);
      const results1 = resWithCity.json() as Array<{ name: string }>;
      expect(results1.length).toBeGreaterThan(0);
      expect(results1.some((r) => r.name.toLowerCase().includes("purezza"))).toBe(true);
    });

    it("finds Mildreds in London while user coords are set to Barcelona", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Mildreds, London&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("mildreds"))).toBe(true);
    });
  });
});
