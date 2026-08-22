import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";
import type { MenuAnalyzer } from "./menu-analyzer.js";
import type { IngredientExtractor } from "./ingredient-extractor.js";
import type { MenuDiscoverer } from "./menu-discovery.js";
import type { RestaurantWebsiteFinder } from "./restaurant-website-finder.js";
import { MemoryRestaurantMenuCache } from "./restaurant-menu-cache.js";

describe("API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("allows local web origins across loopback hostnames", async () => {
    vi.stubEnv("WEB_ORIGIN", "http://localhost:5173");
    const app = await buildApp(new MemoryRepository());
    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://[::1]:5173",
    ]) {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/health",
        headers: {
          origin,
          "access-control-request-method": "GET",
        },
      });
      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
    }
    await app.close();
  }, 15_000);

  it("adds CORS headers for the production web origin on actual API responses", async () => {
    vi.stubEnv("WEB_ORIGIN", "\"https://vegan-tools.onrender.com/\"");
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/menus/recent",
      headers: { origin: "https://vegan-tools.onrender.com" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://vegan-tools.onrender.com",
    );
    await app.close();
  });

  it("rejects an invalid GTIN before external lookup", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({ method: "GET", url: "/v1/products/3017620422004" });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("requires authentication for product evidence", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/products/3017620422003/evidence",
      payload: { ingredientsText: "milk" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("finds restaurant candidates by name and area", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      {
        osm_id: 42,
        osm_type: "node",
        name: "Green Kitchen",
        display_name: "Green Kitchen, Eixample, Barcelona",
        lat: "41.39",
        lon: "2.16",
        type: "restaurant",
        category: "amenity",
        extratags: { website: "https://example.com/menu" },
      },
    ]), { status: 200, headers: { "Content-Type": "application/json" } })));
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/restaurants/search?q=Green%20Kitchen&near=Barcelona",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({
      name: "Green Kitchen",
      websiteUrl: "https://example.com/menu",
    });
    await app.close();
  });

  it("does not use public Nominatim for live autocomplete", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/restaurants/search?q=Green&autocomplete=true",
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("AUTOCOMPLETE_PROVIDER_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it("searches restaurants from Geoapify when configured", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [{
        properties: {
          place_id: "geo-42",
          name: "El Pa Torrat",
          formatted: "Barcelona",
          website: "https://example.com/",
        },
        geometry: {
          type: "Point",
          coordinates: [2.16, 41.39],
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/restaurants/search?q=El%20Pa%20Torrat&near=Barcelona",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({
      name: "El Pa Torrat",
      provider: "geoapify",
      websiteUrl: "https://example.com/",
    });
    await app.close();
  });

  it("restricts Geoapify suggestions to dining venues near the chosen area", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    const fetchMock = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [{
        properties: {
          place_id: "geo-42",
          name: "El Pa Torrat",
          formatted: "Carrer de Santaló, Barcelona",
        },
        geometry: {
          type: "Point",
          coordinates: [2.16, 41.39],
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const app = await buildApp(new MemoryRepository());
    const sessionToken = "12345678123441238123123456789012";
    const response = await app.inject({
      method: "GET",
      url:
        `/v1/restaurants/search?q=El%20Pa&autocomplete=true&sessionToken=${sessionToken}` +
        "&near=Barcelona",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({
      id: "geoapify-geo-42",
      name: "El Pa Torrat",
      provider: "geoapify",
    });
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe("/v2/places");
    expect(requestedUrl.searchParams.get("categories")).toContain("catering.restaurant");
    expect(requestedUrl.searchParams.get("text")).toBe("El Pa Barcelona");
    await app.close();
  });

  it("infers a typed city from the same restaurant query", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === "nominatim.openstreetmap.org") {
        return new Response(
          JSON.stringify([{ addresstype: "city", type: "city" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({
        type: "FeatureCollection",
        features: [{
          properties: {
            place_id: "geo-ny",
            name: "Cafe Example",
            formatted: "New York, NY",
          },
          geometry: {
            type: "Point",
            coordinates: [-74, 40.71],
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/restaurants/search?q=Cafe%20Example%20New%20York",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]?.name).toBe("Cafe Example");
    const geoapifyCall = fetchMock.mock.calls.find(([input]) =>
      new URL(String(input)).hostname === "api.geoapify.com"
    );
    const requestedUrl = new URL(String(geoapifyCall?.[0]));
    expect(requestedUrl.searchParams.get("text")).toBe("Cafe Example New York");
    await app.close();
  });

  it("resolves a Geoapify place details when website is missing", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === "api.geoapify.com") {
        return new Response(JSON.stringify({
          features: [{
            properties: {
              website: "https://example.com/menu",
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/restaurants/resolve",
      payload: {
        id: "geoapify-geo-42",
        name: "El Pa Torrat",
        address: "Barcelona",
        latitude: 41.39,
        longitude: 2.16,
        mapUrl: "https://www.openstreetmap.org/#map=17/41.39/2.16",
        provider: "geoapify",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      websiteUrl: "https://example.com/menu",
      provider: "geoapify",
    });
    await app.close();
  });

  it("returns approximate location from IP or geo headers", async () => {
    const app = await buildApp(new MemoryRepository());
    // Test with geo headers
    const responseWithHeaders = await app.inject({
      method: "GET",
      url: "/v1/location/approximate",
      headers: {
        "cf-iplatitude": "41.9390",
        "cf-iplongitude": "2.2454",
        "cf-ipcity": "Vic",
        "cf-ipcountry": "ES",
      },
    });
    expect(responseWithHeaders.statusCode).toBe(200);
    expect(responseWithHeaders.json()).toMatchObject({
      latitude: 41.939,
      longitude: 2.2454,
      city: "Vic",
      country: "ES",
    });

    // Test fallback without headers
    const responseFallback = await app.inject({
      method: "GET",
      url: "/v1/location/approximate",
    });
    expect(responseFallback.statusCode).toBe(200);
    const body = responseFallback.json();
    expect(typeof body.latitude).toBe("number");
    expect(typeof body.longitude).toBe("number");
    await app.close();
  });

  it("searches restaurants by coordinates without forced territorial bias", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname === "api.geoapify.com") {
        return new Response(JSON.stringify({
          type: "FeatureCollection",
          features: [{
            properties: {
              place_id: "geo-london-1",
              name: "Purezza Camden",
              formatted: "43 Parkway, London NW1 7PN",
            },
            geometry: {
              type: "Point",
              coordinates: [-0.144, 51.538],
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "GET",
      url: "/v1/restaurants/search?q=vegan&latitude=51.538&longitude=-0.144",
    });
    expect(response.statusCode).toBe(200);
    const results = response.json();
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Purezza Camden");

    const geoapifyCall = fetchMock.mock.calls.find(([input]) =>
      new URL(String(input)).hostname === "api.geoapify.com"
    );
    const requestedUrl = new URL(String(geoapifyCall?.[0]));
    // Strictly coordinates-based; uses circle filter
    expect(requestedUrl.searchParams.get("filter")).toBe("circle:-0.144,51.538,5000");
    expect(requestedUrl.searchParams.get("text")).toBeNull();
    await app.close();
  });

  it("uses verified web search when place providers omit the official website", async () => {
    const websiteFinder: RestaurantWebsiteFinder = {
      async find(restaurant) {
        expect(restaurant.name).toBe("Green Kitchen");
        return "https://greenkitchen.example/";
      },
    };
    const app = await buildApp(
      new MemoryRepository(),
      undefined,
      undefined,
      undefined,
      websiteFinder,
    );
    const response = await app.inject({
      method: "POST",
      url: "/v1/restaurants/resolve",
      payload: {
        id: "node-42",
        name: "Green Kitchen",
        address: "Eixample, Barcelona",
        latitude: 41.39,
        longitude: 2.16,
        mapUrl: "https://www.openstreetmap.org/node/42",
        provider: "openstreetmap",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().websiteUrl).toBe("https://greenkitchen.example/");
    await app.close();
  });

  it("classifies a pasted ingredient list without authentication", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/ingredients/classify",
      payload: { ingredientsText: "Sugar, cocoa butter, milk powder" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verdict).toBe("vegetarian");
    expect(response.json().findings[0].id).toBe("milk");
    await app.close();
  });

  it("veganizes a recipe with deterministic substitutions", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/recipes/veganize",
      payload: { recipeText: "2 eggs\n100 ml milk" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().substitutions).toHaveLength(2);
    await app.close();
  });

  it("extracts editable ingredient text from a photo", async () => {
    const extractor: IngredientExtractor = {
      async extract() {
        return "Cocoa, sugar, milk powder";
      },
    };
    const app = await buildApp(new MemoryRepository(), undefined, extractor);
    const boundary = "ingredient-photo-boundary";
    const multipartBody = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="label.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      `fake-image\r\n` +
      `--${boundary}--\r\n`,
    );
    const response = await app.inject({
      method: "POST",
      url: "/v1/ingredients/extract",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ingredientsText).toContain("milk powder");
    await app.close();
  });

  it("downloads and extracts an Open Food Facts ingredient image on demand", async () => {
    const repo = new MemoryRepository();
    await repo.saveProduct({
      gtin: "3017620422003",
      productName: "Breadsticks",
      ingredientsImageUrl: "https://images.openfoodfacts.org/images/products/label.jpg",
      verdict: "probably_vegan",
      assurance: "external",
      definitive: false,
      reason: "Plant-based category.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: "test",
      traces: [],
      revision: 1,
      evidence: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      new Uint8Array([1, 2, 3]),
      { status: 200, headers: { "Content-Type": "image/jpeg" } },
    )));
    const extractor: IngredientExtractor = {
      async extract() {
        return "Wheat flour, olive oil, salt";
      },
    };
    const app = await buildApp(repo, undefined, extractor);
    const response = await app.inject({
      method: "POST",
      url: "/v1/products/3017620422003/ingredients/extract",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ingredientsText).toContain("Wheat flour");
    await app.close();
  });

  it("creates, reviews, publishes, and reads a public menu without leaking its token", async () => {
    const analyzer: MenuAnalyzer = {
      async analyze(menu) {
        return {
          ...menu,
          status: "ready",
          restaurantName: "Test Kitchen",
          sections: [
            {
              id: "section-1",
              name: "Mains",
              items: [
                {
                  id: "item-1",
                  originalName: "Amanida",
                  name: "Salad",
                  description: "",
                  price: "9 €",
                  verdict: "unknown",
                  reason: "Ingredients are incomplete.",
                  modifications: [],
                },
              ],
            },
          ],
        };
      },
    };
    const app = await buildApp(new MemoryRepository(), analyzer);
    const boundary = "vegan-tools-test-boundary";
    const multipartBody = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="restaurantName"\r\n\r\n` +
      `Chosen Kitchen\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="sourceUrl"\r\n\r\n` +
      `https://example.com/menu\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="files"; filename="menu.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `Sample menu\r\n` +
      `--${boundary}--\r\n`,
    );
    const created = await app.inject({
      method: "POST",
      url: "/v1/menus/analyses",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody,
    });
    expect(created.statusCode).toBe(202);
    const draft = created.json();
    await new Promise((resolve) => setImmediate(resolve));

    const reviewed = await app.inject({
      method: "GET",
      url: `/v1/menus/analyses/${draft.id}?token=${encodeURIComponent(draft.editToken)}`,
    });
    expect(reviewed.json().status).toBe("ready");
    expect(reviewed.json().sourceFiles).toHaveLength(1);
    const savedSource = await app.inject({
      method: "GET",
      url: reviewed.json().sourceFiles[0].url,
    });
    expect(savedSource.statusCode).toBe(200);
    expect(savedSource.body).toContain("Sample menu");

    const published = await app.inject({
      method: "POST",
      url: `/v1/menus/${draft.id}/publish?token=${encodeURIComponent(draft.editToken)}`,
    });
    expect(published.statusCode).toBe(200);
    const slug = published.json().publicSlug;

    const publicMenu = await app.inject({
      method: "GET",
      url: `/v1/public/menus/${slug}`,
    });
    expect(publicMenu.statusCode).toBe(200);
    expect(publicMenu.json().restaurantName).toBe("Chosen Kitchen");
    expect(publicMenu.json().sourceUrl).toBe("https://example.com/menu");
    expect(publicMenu.json()).not.toHaveProperty("editToken");
    await app.close();
  });

  it("discovers and analyzes a menu from a selected restaurant website", async () => {
    const analyzer: MenuAnalyzer = {
      async analyze(menu) {
        return {
          ...menu,
          status: "ready",
          restaurantName: "Name inferred from page",
          sections: [{
            id: "section",
            name: "Mains",
            items: [{
              id: "dish",
              originalName: "Amanida",
              name: "Salad",
              description: "",
              price: "",
              verdict: "vegan",
              reason: "Plant ingredients only.",
              modifications: [],
            }],
          }],
        };
      },
    };
    const discoverer: MenuDiscoverer = {
      async discover() {
        return {
          sourceUrl: "https://example.com/menu.pdf",
          upload: {
            filename: "menu.pdf",
            mimetype: "application/pdf",
            buffer: Buffer.from("menu"),
          },
        };
      },
    };
    const app = await buildApp(
      new MemoryRepository(),
      analyzer,
      undefined,
      discoverer,
    );
    const created = await app.inject({
      method: "POST",
      url: "/v1/menus/discover",
      payload: {
        restaurantName: "Chosen Kitchen",
        websiteUrl: "https://example.com/",
      },
    });
    expect(created.statusCode).toBe(202);
    const draft = created.json();
    await new Promise((resolve) => setImmediate(resolve));
    const reviewed = await app.inject({
      method: "GET",
      url: `/v1/menus/analyses/${draft.id}?token=${encodeURIComponent(draft.editToken)}`,
    });
    expect(reviewed.json()).toMatchObject({
      status: "ready",
      restaurantName: "Chosen Kitchen",
      sourceUrl: "https://example.com/menu.pdf",
    });
    await app.close();
  });

  it("retries a broken listed website and shares the completed menu", async () => {
    const attemptedWebsites: string[] = [];
    const analyzer: MenuAnalyzer = {
      async analyze(menu) {
        return {
          ...menu,
          status: "ready",
          restaurantName: "Il Mulino",
          sections: [{
            id: "section",
            name: "Pizzas",
            items: [{
              id: "dish",
              originalName: "Margherita",
              name: "Margherita",
              description: "",
              price: "",
              verdict: "vegetarian",
              reason: "Contains cheese.",
              modifications: [],
            }],
          }],
        };
      },
    };
    const discoverer: MenuDiscoverer = {
      async discover(websiteUrl) {
        attemptedWebsites.push(websiteUrl);
        if (websiteUrl.includes("ilmulinopizzabakery.com")) {
          throw new Error("That website address could not be reached.");
        }
        return {
          sourceUrl: "https://www.ilmulinobcn.com/ca/carta",
          upload: {
            filename: "carta.txt",
            mimetype: "text/plain",
            buffer: Buffer.from("menu"),
          },
        };
      },
    };
    const websiteFinder: RestaurantWebsiteFinder = {
      async find(_restaurant, excludedWebsiteUrl) {
        expect(excludedWebsiteUrl).toContain("ilmulinopizzabakery.com");
        return "https://www.ilmulinobcn.com/";
      },
    };
    const sharedCache = new MemoryRestaurantMenuCache();
    const app = await buildApp(
      new MemoryRepository(),
      analyzer,
      undefined,
      discoverer,
      websiteFinder,
      sharedCache,
    );
    const restaurant = {
      id: "geoapify-il-mulino",
      name: "Il Mulino",
      address: "Barcelona",
      latitude: 41.39,
      longitude: 2.16,
      websiteUrl: "https://www.ilmulinopizzabakery.com/",
      mapUrl: "https://www.openstreetmap.org/#map=17/41.39/2.16",
      provider: "geoapify",
    };
    const created = await app.inject({
      method: "POST",
      url: "/v1/menus/discover",
      payload: {
        restaurantName: restaurant.name,
        websiteUrl: restaurant.websiteUrl,
        restaurant,
      },
    });
    expect(created.statusCode).toBe(202);
    await new Promise((resolve) => setImmediate(resolve));
    expect(attemptedWebsites).toEqual([
      "https://www.ilmulinopizzabakery.com/",
      "https://www.ilmulinobcn.com/",
    ]);

    const recent = await app.inject({ method: "GET", url: "/v1/menus/recent" });
    expect(recent.statusCode).toBe(200);
    expect(recent.json()[0]).toMatchObject({
      restaurant: { name: "Il Mulino" },
      menu: {
        restaurantName: "Il Mulino",
        sourceUrl: "https://www.ilmulinobcn.com/ca/carta",
        editToken: "cached",
      },
    });
    await app.close();
  });

  it("submits dish feedback, polishes text and updates the menu", async () => {
    const memoryRepo = new MemoryRepository();
    const draft = await memoryRepo.createMenu();
    const dishId = "dish-123";
    const initialMenu = {
      ...draft,
      status: "ready" as const,
      restaurantName: "Test Restaurant",
      sections: [
        {
          id: "sec-1",
          name: "Main Courses",
          items: [
            {
              id: dishId,
              originalName: "Pasta Fresca al Pesto",
              name: "Fresh Pasta with Pesto",
              description: "Handmade pasta with basil pesto",
              price: "12,50 €",
              verdict: "vegan" as const,
              reason: "Plant-based ingredients",
              modifications: [],
            },
          ],
        },
      ],
    };
    await memoryRepo.setMenu(initialMenu);

    const mockPolisher = {
      polishDishFeedback: vi.fn().mockResolvedValue({
        reason: "Contains egg (fresh pasta is prepared with eggs)",
        reasonCa: "Conté ou (la pasta fresca s'elabora amb ou)",
        modificationNote: "Ask for dried durum wheat pasta instead",
        modificationNoteCa: "Demanar pasta seca de blat dur",
        modifications: [
          {
            target: "vegan" as const,
            note: "Ask for dried durum wheat pasta instead",
            noteCa: "Demanar pasta seca de blat dur",
          },
        ],
      }),
      polishRestaurantNotes: vi.fn().mockResolvedValue({
        communityNotes: "Shared fryer used for all fried items",
        communityNotesCa: "Fregidora compartida per a tots els fregits",
      }),
    };

    const app = await buildApp(
      memoryRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockPolisher,
    );

    const feedbackRes = await app.inject({
      method: "POST",
      url: `/v1/menus/${draft.id}/dishes/${dishId}/feedback?token=${draft.editToken}`,
      payload: {
        verdict: "non_vegetarian",
        rawNote: "pasta port ous",
        targetModification: "vegan",
      },
    });

    expect(feedbackRes.statusCode).toBe(200);
    const feedbackPayload = feedbackRes.json();
    expect(feedbackPayload.updatedDish).toMatchObject({
      id: dishId,
      verdict: "non_vegetarian",
      reason: "Contains egg (fresh pasta is prepared with eggs)",
      reasonCa: "Conté ou (la pasta fresca s'elabora amb ou)",
      modifiableTo: "vegan",
      modifications: [
        {
          target: "vegan",
          note: "Ask for dried durum wheat pasta instead",
          noteCa: "Demanar pasta seca de blat dur",
        },
      ],
    });

    // Test restaurant notes endpoint
    const notesRes = await app.inject({
      method: "POST",
      url: `/v1/menus/${draft.id}/notes?token=${draft.editToken}`,
      payload: {
        rawNotes: "fregidora compartida",
      },
    });

    expect(notesRes.statusCode).toBe(200);
    const notesPayload = notesRes.json();
    expect(notesPayload).toMatchObject({
      communityNotes: "Shared fryer used for all fried items",
      communityNotesCa: "Fregidora compartida per a tots els fregits",
    });

    await app.close();
  });

  it("handles restaurant reviews lifecycle: public get, authenticated post, and deletion", async () => {
    const app = await buildApp(new MemoryRepository());
    const restaurantId = "rest-testing-123";

    // 1. Initial GET reviews should return empty list and zero stats
    const initialGet = await app.inject({
      method: "GET",
      url: `/v1/restaurants/${restaurantId}/reviews`,
    });
    expect(initialGet.statusCode).toBe(200);
    expect(initialGet.json()).toEqual({
      reviews: [],
      stats: {
        averageLeaves: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    // 2. POST without Auth header should return 401
    const unauthPost = await app.inject({
      method: "POST",
      url: `/v1/restaurants/${restaurantId}/reviews`,
      payload: {
        leavesScore: 5,
        comment: "Amazing food",
      },
    });
    expect(unauthPost.statusCode).toBe(401);

    // 3. POST with invalid score should return 400
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
      JSON.stringify({
        sub: "user-uuid-1",
        email: "nils@example.com",
        user_metadata: { full_name: "Nils D." },
      }),
    ).toString("base64url")}.fake_sig`;

    const invalidPost = await app.inject({
      method: "POST",
      url: `/v1/restaurants/${restaurantId}/reviews`,
      headers: {
        authorization: `Bearer ${fakeToken}`,
      },
      payload: {
        leavesScore: 6, // max is 5
      },
    });
    expect(invalidPost.statusCode).toBe(400);

    // 4. POST with valid score (5 leaves) and comment
    const validPost = await app.inject({
      method: "POST",
      url: `/v1/restaurants/${restaurantId}/reviews`,
      headers: {
        authorization: `Bearer ${fakeToken}`,
      },
      payload: {
        leavesScore: 5,
        comment: "Tot 100% vegà i deliciós!",
      },
    });
    expect(validPost.statusCode).toBe(200);
    const postPayload = validPost.json();
    expect(postPayload.review).toMatchObject({
      restaurantId,
      userId: "user-uuid-1",
      userName: "Nils D.",
      leavesScore: 5,
      comment: "Tot 100% vegà i deliciós!",
    });
    expect(postPayload.stats).toEqual({
      averageLeaves: 5,
      totalReviews: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    });

    // 5. GET reviews should now show the newly added review
    const afterPostGet = await app.inject({
      method: "GET",
      url: `/v1/restaurants/${restaurantId}/reviews`,
    });
    expect(afterPostGet.statusCode).toBe(200);
    expect(afterPostGet.json().reviews).toHaveLength(1);

    // 6. DELETE review by the author
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/v1/restaurants/${restaurantId}/reviews`,
      headers: {
        authorization: `Bearer ${fakeToken}`,
      },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json()).toMatchObject({
      deleted: true,
      stats: {
        averageLeaves: 0,
        totalReviews: 0,
      },
    });

    await app.close();
  });
});

