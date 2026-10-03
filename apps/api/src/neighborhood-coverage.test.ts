/**
 * @file neighborhood-coverage.test.ts
 * @description Benchmark & coverage test for neighborhood restaurant discovery.
 * Measures POI discovery density, bounding box containment, curated venue inclusion,
 * and compares results against OpenStreetMap/Geoapify ground truth in Vila de Gràcia (Barcelona).
 */

import { describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";
import type { RestaurantCandidate } from "@vegan-tools/domain";

describe("Neighborhood Restaurant Coverage (Vila de Gràcia, Barcelona)", () => {
  // Vila de Gràcia bounding box: [minLon, minLat, maxLon, maxLat]
  const GRACIA_BBOX: [number, number, number, number] = [2.152, 41.399, 2.162, 41.408];
  const GRACIA_CENTER = {
    lat: 41.4035,
    lon: 2.157,
  };

  it("discovers high-density restaurant coverage within the neighborhood bounding box", async () => {
    // Hermetic mock simulating 45 restaurants in Vila de Gràcia (nodes & ways from Overpass + Geoapify)
    const mockOsmElements = Array.from({ length: 42 }, (_, i) => ({
      type: "node" as const,
      id: 50000 + i,
      lat: 41.400 + (i * 0.00018),
      lon: 2.153 + (i * 0.0002),
      tags: {
        amenity: i % 3 === 0 ? "restaurant" : i % 3 === 1 ? "cafe" : "bar",
        name: `Restaurant Gràcia ${i + 1}`,
        "addr:street": i % 2 === 0 ? "Carrer de Verdi" : "Carrer de Torrent de l'Olla",
        "addr:housenumber": String(10 + i),
        "addr:city": "Barcelona",
        cuisine: i === 0 ? "vegan" : i % 5 === 0 ? "italian" : "tapas",
        "diet:vegan": i === 0 ? "only" : i % 4 === 0 ? "yes" : undefined,
      },
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input.toString();

        if (urlStr.includes("overpass-api.de") || urlStr.includes("overpass")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ elements: mockOsmElements }),
          } as Response;
        }

        if (urlStr.includes("api.geoapify.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              features: mockOsmElements.slice(0, 20).map((elem) => ({
                properties: {
                  place_id: `geo-${elem.id}`,
                  name: elem.tags.name,
                  formatted: `${elem.tags["addr:street"]} ${elem.tags["addr:housenumber"]}, Barcelona`,
                  street: elem.tags["addr:street"],
                  housenumber: elem.tags["addr:housenumber"],
                  city: "Barcelona",
                  lat: elem.lat,
                  lon: elem.lon,
                  categories: ["catering.restaurant"],
                },
              })),
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ features: [] }),
        } as Response;
      }),
    );

    const app = await buildApp(new MemoryRepository());

    const response = await app.inject({
      method: "GET",
      url: `/v1/restaurants/search?q=restaurant&latitude=${GRACIA_CENTER.lat}&longitude=${GRACIA_CENTER.lon}&bbox=${GRACIA_BBOX.join(",")}&radius=800`,
    });

    expect(response.statusCode).toBe(200);
    const results = response.json() as RestaurantCandidate[];

    // 1. Density: Should discover at least 35 unique places in this compact neighborhood
    expect(results.length).toBeGreaterThanOrEqual(35);

    // 2. Curated Inclusion: Asante (Carrer de Verdi, 67 in Gràcia) should be included and prioritized
    const asante = results.find((r) => r.name.toLowerCase().includes("asante"));
    expect(asante).toBeDefined();
    expect(asante?.isVegan).toBe(true);

    // 3. Coordinate bounds check: All returned venues must be strictly within neighborhood reach
    for (const r of results) {
      expect(r.latitude).toBeGreaterThanOrEqual(GRACIA_BBOX[1] - 0.005);
      expect(r.latitude).toBeLessThanOrEqual(GRACIA_BBOX[3] + 0.005);
      expect(r.longitude).toBeGreaterThanOrEqual(GRACIA_BBOX[0] - 0.005);
      expect(r.longitude).toBeLessThanOrEqual(GRACIA_BBOX[2] + 0.005);
    }

    // 4. Verification of deduplication: IDs must be unique
    const idSet = new Set(results.map((r) => r.id));
    expect(idSet.size).toBe(results.length);
  });

  it("preserves authentic opening hours and tags from OSM metadata", async () => {
    const prevKey = process.env.GEOAPIFY_API_KEY;
    process.env.GEOAPIFY_API_KEY = "test-geoapify-key";
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const urlStr = typeof input === "string" ? input : input.toString();
          if (urlStr.includes("api.geoapify.com")) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                features: [
                  {
                    properties: {
                      place_id: "geo-99001",
                      name: "Pizzeria Gràcia Bio",
                      formatted: "Carrer de Verdi, 22, Barcelona",
                      street: "Carrer de Verdi",
                      housenumber: "22",
                      city: "Barcelona",
                      lat: 41.404,
                      lon: 2.156,
                      opening_hours: "Mo-Su 13:00-16:00, 20:00-23:30",
                      categories: ["catering.restaurant", "catering.restaurant.pizza", "diet.vegan", "diet.vegetarian"],
                      catering: {
                        cuisine: "pizza;italian",
                        diet: { vegan: true, vegetarian: true },
                        opening_hours: "Mo-Su 13:00-16:00, 20:00-23:30",
                      },
                    },
                    geometry: {
                      type: "Point",
                      coordinates: [2.156, 41.404],
                    },
                  },
                ],
              }),
            } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ features: [] }),
          } as Response;
        }),
      );

      const app = await buildApp(new MemoryRepository());
      const response = await app.inject({
        method: "GET",
        url: `/v1/restaurants/search?q=pizza&latitude=${GRACIA_CENTER.lat}&longitude=${GRACIA_CENTER.lon}&bbox=${GRACIA_BBOX.join(",")}`,
      });

      expect(response.statusCode).toBe(200);
      const results = response.json() as RestaurantCandidate[];
      const pizzaPlace = results.find((r) => r.name === "Pizzeria Gràcia Bio");
      expect(pizzaPlace).toBeDefined();
      expect(pizzaPlace?.openingHours).toBe("Mo-Su 13:00-16:00, 20:00-23:30");
      expect(pizzaPlace?.tags).toContain("vegan");
      expect(pizzaPlace?.tags).toContain("vegetarian");
      expect(pizzaPlace?.tags).toContain("italian");
    } finally {
      if (prevKey !== undefined) {
        process.env.GEOAPIFY_API_KEY = prevKey;
      } else {
        delete process.env.GEOAPIFY_API_KEY;
      }
    }
  });
});
