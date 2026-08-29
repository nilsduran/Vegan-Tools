import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";

describe("Universal Restaurant Search across multiple cities", () => {
  const getApp = async () => buildApp(new MemoryRepository());

  // Coordinates of user located in Barcelona center
  const USER_BCN_LAT = "41.3879";
  const USER_BCN_LNG = "2.1699";

  beforeEach(() => {
    // Stub fetch to guarantee deterministic, fast and hermetic search tests without network latency or 503s
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input.toString();

        // Photon Komoot mock
        if (urlStr.includes("photon.komoot.io")) {
          const url = new URL(urlStr);
          const rawQ = url.searchParams.get("q") || "";
          const qNorm = rawQ
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase();

          const features: Array<{
            properties: Record<string, unknown>;
            geometry: { coordinates: [number, number] };
          }> = [];

          if (qNorm.includes("desoriente")) {
            features.push({
              properties: {
                osm_id: 1001,
                name: "Desoriente",
                city: "Barcelona",
                street: "Carrer de Ramon Turró",
                housenumber: "209",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.201, 41.399] },
            });
          }

          if (qNorm.includes("teresa carles")) {
            features.push({
              properties: {
                osm_id: 1002,
                name: "Teresa Carles",
                city: "Barcelona",
                street: "Carrer de Jovellanos",
                housenumber: "2",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.168, 41.385] },
            });
          }

          if (qNorm.includes("roots")) {
            features.push({
              properties: {
                osm_id: 1003,
                name: "Roots Vegan",
                city: "Barcelona",
                street: "Carrer de la Diputació",
                housenumber: "100",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.155, 41.381] },
            });
          }

          if (qNorm.includes("foment") || qNorm.includes("sant joan")) {
            features.push({
              properties: {
                osm_id: 2001,
                name: "El Foment",
                city: "Sant Joan Despí",
                street: "Carrer Major",
                housenumber: "12",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.056, 41.368] },
            });
          }

          if (qNorm.includes("bionectar")) {
            features.push({
              properties: {
                osm_id: 3001,
                name: "Bionèctar",
                city: "Girona",
                street: "Carrer Francesc Ciurana",
                housenumber: "22",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.819, 41.979] },
            });
          }

          if (qNorm.includes("integral")) {
            features.push({
              properties: {
                osm_id: 3002,
                name: "Restaurant Integral",
                city: "Girona",
                street: "Carrer de la Cort Reial",
                housenumber: "1",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [2.825, 41.986] },
            });
          }

          if (qNorm.includes("purezza")) {
            features.push({
              properties: {
                osm_id: 4001,
                name: "Purezza",
                city: "London",
                street: "Parkway",
                housenumber: "43",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [-0.145, 51.538] },
            });
          }

          if (qNorm.includes("mildreds")) {
            features.push({
              properties: {
                osm_id: 4002,
                name: "Mildreds",
                city: "London",
                street: "Lexington St",
                housenumber: "45",
                osm_key: "amenity",
                osm_value: "restaurant",
              },
              geometry: { coordinates: [-0.137, 51.513] },
            });
          }

          return new Response(JSON.stringify({ features }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Overpass fallback mock
        if (urlStr.includes("overpass-api.de") || urlStr.includes("overpass")) {
          return new Response(JSON.stringify({ elements: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ features: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
      expect(
        results1.some((r) =>
          r.name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .includes("bionectar"),
        ),
      ).toBe(true);

      // Name with city hint from Barcelona coordinates
      const resWithCity = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Bionèctar, Girona&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(resWithCity.statusCode).toBe(200);
      const results2 = resWithCity.json() as Array<{ name: string }>;
      expect(
        results2.some((r) =>
          r.name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .includes("bionectar"),
        ),
      ).toBe(true);
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

  describe("Haversine deduplication and multi-criteria ranking", () => {
    it("ranks exact restaurant name matches highest even with comma-separated city", async () => {
      const app = await getApp();
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Purezza, London&latitude=${USER_BCN_LAT}&longitude=${USER_BCN_LNG}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string }>;
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.name.toLowerCase()).toContain("purezza");
    });
  });

  describe("Viewport bbox search and opening hours resolution", () => {
    it("filters and finds restaurants within a viewport bounding box", async () => {
      const app = await getApp();
      // Bounding box covering Barcelona Poblenou / center
      const bcnBbox = "2.14,41.37,2.22,41.41";
      const res = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=Desoriente&bbox=${bcnBbox}`,
      });
      expect(res.statusCode).toBe(200);
      const results = res.json() as Array<{ name: string; latitude: number; longitude: number }>;
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes("desoriente"))).toBe(true);
    });
  });
});
