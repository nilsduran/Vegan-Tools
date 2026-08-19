import type { MenuDraft, RestaurantCandidate } from "@vegan-tools/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRestaurantMenuCache,
  SupabaseRestaurantMenuCache,
} from "./restaurant-menu-cache.js";

function fakeSupabase() {
  const cacheMap = new Map<string, { restaurant: RestaurantCandidate; menu: MenuDraft; updated_at: string }>();
  const fetchMock = vi.fn(async (
    input: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = input instanceof URL
      ? input
      : new URL(typeof input === "string" ? input : input.url);
    const method = init.method ?? "GET";

    if (method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        restaurant_key: string;
        restaurant: RestaurantCandidate;
        menu: MenuDraft;
        updated_at: string;
      };
      cacheMap.set(body.restaurant_key, {
        restaurant: body.restaurant,
        menu: body.menu,
        updated_at: body.updated_at,
      });
      return new Response(null, { status: 204 });
    }

    const rows = [...cacheMap.values()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return Response.json(rows);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, cacheMap };
}

describe("RestaurantMenuCache database persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and retrieves cached restaurant menus in MemoryRestaurantMenuCache", async () => {
    const cache = new MemoryRestaurantMenuCache();
    const restaurant: RestaurantCandidate = {
      id: "rest-1",
      name: "Vegan Garden",
      address: "Carrer Nou, 10",
      latitude: 41.38,
      longitude: 2.17,
      mapUrl: "https://foursquare.com/v/rest-1",
      provider: "foursquare",
    };
    const menu: MenuDraft = {
      id: "menu-1",
      editToken: "private-token",
      status: "ready",
      restaurantName: "Vegan Garden",
      sourceLabel: "Uploaded menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "ca",
      sections: [
        {
          id: "sec-1",
          name: "Starters",
          nameCa: "Entrants",
          items: [
            {
              id: "item-1",
              name: "Hummus",
              nameCa: "Hummus",
              originalName: "Hummus casolà",
              description: "Chickpea dip with pita",
              descriptionCa: "Cigrons amb pa de pita",
              price: "6.50",
              verdict: "vegan",
              reason: "Plant-based",
              modifications: [],
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    await cache.save(restaurant, menu);
    const listed = await cache.list();

    expect(listed).toHaveLength(1);
    expect(listed[0]?.restaurant.name).toBe("Vegan Garden");
    expect(listed[0]?.menu.editToken).toBe("cached");
    expect(listed[0]?.menu.sections[0]?.nameCa).toBe("Entrants");
    expect(listed[0]?.menu.sections[0]?.items[0]?.descriptionCa).toBe("Cigrons amb pa de pita");
  });

  it("persists and lists cached menus using SupabaseRestaurantMenuCache", async () => {
    const { fetchMock } = fakeSupabase();
    const cache = new SupabaseRestaurantMenuCache(
      "https://project.supabase.co",
      "sb_secret_test_key",
    );

    const restaurant: RestaurantCandidate = {
      id: "rest-2",
      name: "Green Bite",
      address: "Gran Via, 500",
      latitude: 41.39,
      longitude: 2.16,
      mapUrl: "https://www.openstreetmap.org/node/rest-2",
      provider: "openstreetmap",
    };
    const menu: MenuDraft = {
      id: "menu-2",
      editToken: "private-token-2",
      status: "ready",
      restaurantName: "Green Bite",
      sourceLabel: "Website menu",
      sourceFiles: [],
      sourceCapturedAt: new Date().toISOString(),
      originalLanguage: "en",
      sections: [],
      createdAt: new Date().toISOString(),
      originalDeleteAt: new Date().toISOString(),
    };

    await cache.save(restaurant, menu);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const results = await cache.list();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0]?.restaurant.name).toBe("Green Bite");
    expect(results[0]?.menu.editToken).toBe("cached");
  });
});
