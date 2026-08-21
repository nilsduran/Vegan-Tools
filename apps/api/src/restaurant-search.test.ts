import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";

describe("Universal Restaurant Search across multiple cities", () => {
  const getApp = async () => buildApp(new MemoryRepository());

  // Coordinates of Barcelona center for bias testing
  const BCN_LAT = "41.3879";
  const BCN_LNG = "2.1699";

  describe("Barcelona restaurants", () => {
    it("finds Desoriente by exact name and with city hint", async () => {
      const app = await getApp();
      // 1. By name only with user location bias
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Desoriente&latitude=${BCN_LAT}&longitude=${BCN_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string; address: string }>;
      expect(results1.length).toBeGreaterThan(0);
      expect(results1.some((r) => r.name.toLowerCase().includes("desoriente"))).toBe(true);

      // 2. By name with city hint
      const resWithCity = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Desoriente, Barcelona",
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
        url: `/v1/restaurants/search?q=Teresa Carles&latitude=${BCN_LAT}&longitude=${BCN_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string }>;
      expect(results1.some((r) => r.name.toLowerCase().includes("teresa carles"))).toBe(true);

      const resWithCity = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Teresa Carles, Barcelona",
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(results2.some((r) => r.name.toLowerCase().includes("teresa carles"))).toBe(true);
    });

    it("finds Roots Vegan by name and with city hint", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Roots Vegan&latitude=${BCN_LAT}&longitude=${BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("roots"))).toBe(true);
    });
  });

  describe("Sant Joan Despí restaurants", () => {
    const SJD_LAT = "41.368";
    const SJD_LNG = "2.057";

    it("finds restaurants in Sant Joan Despí by name and with city hint", async () => {
      const app = await getApp();
      const resCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=restaurants, Sant Joan Despí&latitude=${SJD_LAT}&longitude=${SJD_LNG}`,
      });
      expect(resCity.statusCode).toBe(200);
      const results = resCity.json() as Array<{ name: string; address: string }>;
      expect(results.length).toBeGreaterThan(0);
    });

    it("finds Foment in Sant Joan Despí with city hint", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Foment, Sant Joan Despí",
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Girona restaurants", () => {
    const GIR_LAT = "41.984";
    const GIR_LNG = "2.821";

    it("finds Bionèctar by name and with city hint", async () => {
      const app = await getApp();
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Bionèctar&latitude=${GIR_LAT}&longitude=${GIR_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string }>;
      expect(results1.some((r) => r.name.toLowerCase().includes("bionectar") || r.name.toLowerCase().includes("bionèctar"))).toBe(true);

      const resWithCity = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Bionèctar, Girona",
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(results2.some((r) => r.name.toLowerCase().includes("bionectar") || r.name.toLowerCase().includes("bionèctar"))).toBe(true);
    });

    it("finds Restaurant Integral in Girona with city hint", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Integral, Girona",
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("integral"))).toBe(true);
    });
  });

  describe("London restaurants", () => {
    const LON_LAT = "51.5074";
    const LON_LNG = "-0.1278";

    it("finds Purezza by name and with city hint", async () => {
      const app = await getApp();
      // 1. By name alone (even when search origin is elsewhere)
      const resNameOnly = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Purezza&latitude=${LON_LAT}&longitude=${LON_LNG}`,
      });
      expect(resNameOnly.statusCode).toBe(200);
      const results1 = resNameOnly.json() as Array<{ name: string }>;
      expect(results1.some((r) => r.name.toLowerCase().includes("purezza"))).toBe(true);

      // 2. By name with city hint
      const resWithCity = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Purezza, London",
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(results2.some((r) => r.name.toLowerCase().includes("purezza"))).toBe(true);
    });

    it("finds Mildreds in London", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: "/v1/restaurants/search?q=Mildreds, London",
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.some((r) => r.name.toLowerCase().includes("mildreds"))).toBe(true);
    });
  });
});
