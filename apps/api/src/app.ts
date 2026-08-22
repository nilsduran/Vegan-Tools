import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  classifyIngredients,
  CLASSIFIER_VERSION,
  createReviewRequestSchema,
  dishFeedbackRequestSchema,
  restaurantNotesRequestSchema,
  isValidGtin,
  menuPatchSchema,
  normalizeGtin,
  veganizeRecipe,
  type Evidence,
  type ProductResult,
  type RestaurantCandidate,
  type RestaurantReview,
  restaurantCandidateSchema,
} from "@vegan-tools/domain";
import { CURATED_RESTAURANTS } from "./curated-restaurants.js";
import { randomUUID } from "node:crypto";
import { repository, type Repository } from "./store.js";
import { lookupOpenFoodFacts } from "./open-food-facts.js";
import { GeminiMenuAnalyzer, type MenuAnalyzer } from "./menu-analyzer.js";
import {
  GeminiIngredientExtractor,
  type IngredientExtractor,
} from "./ingredient-extractor.js";
import {
  WebsiteMenuDiscoverer,
  type MenuDiscoverer,
} from "./menu-discovery.js";
import {
  GoogleSearchRestaurantWebsiteFinder,
  type RestaurantWebsiteFinder,
} from "./restaurant-website-finder.js";
import {
  MemoryRestaurantMenuCache,
  type RestaurantMenuCache,
} from "./restaurant-menu-cache.js";
import {
  MemoryMenuSourceStore,
  type MenuSourceStore,
} from "./menu-source-store.js";
import {
  GeminiDishFeedbackPolisher,
  type DishFeedbackPolisher,
} from "./dish-feedback-polisher.js";
import {
  createRestaurantReviewStore,
  type RestaurantReviewStore,
} from "./restaurant-review-store.js";

const FOURSQUARE_RESTAURANT_CATEGORY = "4d4b7105d754a06374d81259";

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function friendlyMenuError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/quota|exhausted|429|resource/i.test(message)) {
    return "The menu service is busy right now. Please try again in a moment.";
  }
  if (/not configured|api key/i.test(message)) {
    return "Menu analysis is not configured on the API server.";
  }
  if (/model.*unavailable|not found/i.test(message)) {
    return "The configured Gemini model is unavailable. Check GEMINI_MODEL on the API server.";
  }
  if (/took too long|timeout/i.test(message)) {
    return "Menu analysis took too long. Please try again with a clear image.";
  }
  return "Menu analysis failed. Please try again or use a clearer image.";
}

export async function buildApp(
  repo: Repository = repository,
  menuAnalyzer: MenuAnalyzer = new GeminiMenuAnalyzer(),
  ingredientExtractor: IngredientExtractor = new GeminiIngredientExtractor(),
  menuDiscoverer: MenuDiscoverer = new WebsiteMenuDiscoverer(),
  restaurantWebsiteFinder: RestaurantWebsiteFinder =
    new GoogleSearchRestaurantWebsiteFinder(),
  restaurantMenuCache: RestaurantMenuCache = new MemoryRestaurantMenuCache(),
  menuSourceStore: MenuSourceStore = new MemoryMenuSourceStore(),
  dishFeedbackPolisher: DishFeedbackPolisher = new GeminiDishFeedbackPolisher(),
  restaurantReviewStore: RestaurantReviewStore = createRestaurantReviewStore(),
) {
  const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });
  const restaurantSearchCache = new Map<
    string,
    { expiresAt: number; results: RestaurantCandidate[] }
  >();
  let lastNominatimRequestAt = 0;
  const waitForNominatim = async () => {
    const remaining = 1_000 - (Date.now() - lastNominatimRequestAt);
    if (remaining > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
    }
    lastNominatimRequestAt = Date.now();
  };
  const normalizeCorsOrigin = (origin: string) =>
    origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  const configuredOrigins = process.env.WEB_ORIGIN
    ?.split(",")
    .map(normalizeCorsOrigin)
    .filter(Boolean) ?? [];
  const productionWebOrigins = [
    "https://vegantools.org",
    "https://www.vegantools.org",
    "https://vegan-tools.onrender.com",
  ];
  const allowedOrigins = new Set([...configuredOrigins, ...productionWebOrigins]);
  const loopbackOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeCorsOrigin(origin);
      callback(null, allowedOrigins.has(normalizedOrigin) || loopbackOrigin.test(normalizedOrigin));
    },
  });
  await app.register(multipart, {
    limits: { files: 8, fileSize: 10 * 1024 * 1024 },
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Vegan Tools API", version: "0.1.0" },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/", async () => ({
    name: "Vegan Tools API",
    status: "ok",
    health: "/health",
  }));

  app.get("/health", async (_request, reply) => {
    return reply
      .type("text/plain; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send("ok");
  });

  app.get<{ Params: { menuId: string; storedName: string } }>(
    "/v1/menu-sources/:menuId/:storedName",
    async (request, reply) => {
      const source = await menuSourceStore.read(
        request.params.menuId,
        request.params.storedName,
      );
      if (!source) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Original menu source not found.",
        });
      }
      return reply
        .type(source.mimeType)
        .header("Cache-Control", "public, max-age=3600")
        .send(source.buffer);
    },
  );

  app.get<{
    Reply: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
    };
  }>("/v1/location/approximate", async (request, reply) => {
    // 1. Check Cloudflare hosting geo headers
    const cfLat = request.headers["cf-iplatitude"] as string | undefined;
    const cfLng = request.headers["cf-iplongitude"] as string | undefined;
    const cfCity = request.headers["cf-ipcity"] as string | undefined;
    const cfCountry = request.headers["cf-ipcountry"] as string | undefined;

    if (cfLat && cfLng && !isNaN(Number(cfLat)) && !isNaN(Number(cfLng))) {
      return reply.send({
        latitude: Number(cfLat),
        longitude: Number(cfLng),
        city: cfCity ? decodeURIComponent(cfCity) : undefined,
        country: cfCountry,
      });
    }

    // 2. Check Vercel / Render geo headers
    const vercelLat = request.headers["x-vercel-ip-latitude"] as string | undefined;
    const vercelLng = request.headers["x-vercel-ip-longitude"] as string | undefined;
    const vercelCity = request.headers["x-vercel-ip-city"] as string | undefined;
    const vercelCountry = request.headers["x-vercel-ip-country"] as string | undefined;

    if (vercelLat && vercelLng && !isNaN(Number(vercelLat)) && !isNaN(Number(vercelLng))) {
      return reply.send({
        latitude: Number(vercelLat),
        longitude: Number(vercelLng),
        city: vercelCity ? decodeURIComponent(vercelCity) : undefined,
        country: vercelCountry,
      });
    }

    // 3. Extract client IP
    const forwarded = request.headers["x-forwarded-for"];
    const clientIp = typeof forwarded === "string"
      ? (forwarded.split(",")[0]?.trim() || request.ip)
      : request.ip;

    const isLocalOrPrivate =
      !clientIp ||
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp.startsWith("192.168.") ||
      clientIp.startsWith("10.") ||
      clientIp.startsWith("172.16.");

    try {
      const geoUrl = isLocalOrPrivate
        ? "http://ip-api.com/json/?fields=status,lat,lon,city,country"
        : `http://ip-api.com/json/${clientIp}?fields=status,lat,lon,city,country`;

      const geoRes = await fetch(geoUrl, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });

      if (geoRes.ok) {
        const data = (await geoRes.json()) as {
          status?: string;
          lat?: number;
          lon?: number;
          city?: string;
          country?: string;
        };
        if (
          data.status === "success" &&
          typeof data.lat === "number" &&
          typeof data.lon === "number"
        ) {
          return reply.send({
            latitude: data.lat,
            longitude: data.lon,
            city: data.city,
            country: data.country,
          });
        }
      }
    } catch (err) {
      request.log.warn({ err }, "IP geolocation lookup failed; using fallback");
    }

    // Default fallback coordinates (Barcelona center)
    return reply.send({
      latitude: 41.3879,
      longitude: 2.1699,
      city: "Barcelona",
      country: "ES",
    });
  });

  function deduplicateRestaurants(candidates: RestaurantCandidate[]): RestaurantCandidate[] {
    const seen = new Set<string>();
    const result: RestaurantCandidate[] = [];

    for (const c of candidates) {
      const latKey = c.latitude.toFixed(3);
      const lngKey = c.longitude.toFixed(3);
      const normName = c.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `${normName}:${latKey}:${lngKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }

    return result;
  }

  app.get<{
    Querystring: {
      latitude?: string;
      longitude?: string;
      limit?: string;
    };
  }>(
    "/v1/restaurants/curated",
    async (request) => {
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const limit = Math.min(Math.max(Number(request.query.limit) || 12, 1), 50);
      const hasLocation =
        Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

      if (!hasLocation) {
        return CURATED_RESTAURANTS.slice(0, limit);
      }

      // Calculate distance in km to each curated place
      const withDistance = CURATED_RESTAURANTS.map((r) => {
        const dLat = ((r.latitude - latitude) * Math.PI) / 180;
        const dLng = ((r.longitude - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((r.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { r, distKm };
      }).sort((a, b) => a.distKm - b.distKm);

      // Return only venues within regional reach (max 50 km) or the 5 closest within 100km
      const nearby = withDistance.filter((item) => item.distKm <= 55);
      const candidates = nearby.length > 0 ? nearby : withDistance.filter((item) => item.distKm <= 120).slice(0, 6);
      return candidates.slice(0, limit).map((item) => item.r);
    },
  );

  function inferTagsAndVegan(input: {
    name: string;
    cuisine?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    vegan?: string;
    vegetarian?: string;
  }) {
    const tags = new Set<string>();
    const nameLower = input.name.toLowerCase();
    const cuisineLower = (input.cuisine ?? "").toLowerCase();
    const typeLower = (input.osm_value ?? input.type ?? "").toLowerCase();
    const veganLower = (input.vegan ?? "").toLowerCase();
    const vegetarianLower = (input.vegetarian ?? "").toLowerCase();
    const allText = `${nameLower} ${cuisineLower} ${typeLower} ${veganLower} ${vegetarianLower}`;

    // Cross-match against curated catalog for rich metadata inheritance
    const curatedMatch = CURATED_RESTAURANTS.find((cr) => {
      const crName = cr.name.toLowerCase();
      return nameLower.includes(crName) || crName.includes(nameLower);
    });

    const isVegan =
      curatedMatch?.isVegan ??
      (veganLower === "yes" ||
        veganLower === "only" ||
        cuisineLower === "vegan" ||
        cuisineLower.includes("vegan"));

    const isVegetarian =
      curatedMatch?.isVegetarian ??
      (isVegan ||
        vegetarianLower === "yes" ||
        vegetarianLower === "only" ||
        cuisineLower === "vegetarian" ||
        cuisineLower.includes("vegetarian"));

    if (curatedMatch?.tags) {
      for (const t of curatedMatch.tags) tags.add(t);
    }

    if (isVegan) tags.add("vegan");
    if (isVegetarian) tags.add("vegetarian");

    if (
      typeLower === "restaurant" ||
      typeLower === "fast_food" ||
      typeLower === "food_court" ||
      allText.includes("restaurant") ||
      allText.includes("restaurante") ||
      allText.includes("bistrot") ||
      allText.includes("bistro") ||
      allText.includes("menjar") ||
      input.osm_key === "amenity"
    ) {
      tags.add("restaurant");
    }
    if (
      allText.includes("cafe") ||
      allText.includes("cafeteria") ||
      allText.includes("coffee") ||
      allText.includes("bakery") ||
      allText.includes("pastisseria") ||
      allText.includes("pasteleria") ||
      allText.includes("panaderia") ||
      allText.includes("forn") ||
      allText.includes("donut") ||
      typeLower === "cafe" ||
      typeLower === "coffee_shop" ||
      typeLower === "bakery" ||
      typeLower === "pastry"
    ) {
      tags.add("cafe_bakery");
    }
    if (
      allText.includes("italian") ||
      allText.includes("italia") ||
      allText.includes("italiano") ||
      allText.includes("pizza") ||
      allText.includes("pizzeria") ||
      allText.includes("pasta") ||
      allText.includes("trattoria") ||
      cuisineLower.includes("pizza") ||
      cuisineLower.includes("italian")
    ) {
      tags.add("italian");
    }
    if (
      allText.includes("asian") ||
      allText.includes("asiatic") ||
      allText.includes("asiatico") ||
      allText.includes("japanese") ||
      allText.includes("japones") ||
      allText.includes("sushi") ||
      allText.includes("ramen") ||
      allText.includes("chinese") ||
      allText.includes("chines") ||
      allText.includes("thai") ||
      allText.includes("vietnam") ||
      allText.includes("korean") ||
      allText.includes("oriental") ||
      allText.includes("wok")
    ) {
      tags.add("asian");
    }
    if (
      allText.includes("mediterranean") ||
      allText.includes("mediterrani") ||
      allText.includes("mediterraneo") ||
      allText.includes("tapas") ||
      allText.includes("tapes") ||
      allText.includes("paella") ||
      allText.includes("arros") ||
      allText.includes("platets")
    ) {
      tags.add("mediterranean");
    }
    if (
      allText.includes("gelat") ||
      allText.includes("gelats") ||
      allText.includes("ice cream") ||
      allText.includes("ice_cream") ||
      allText.includes("helado") ||
      allText.includes("heladeria") ||
      allText.includes("gelateria") ||
      typeLower === "ice_cream"
    ) {
      tags.add("ice_cream");
    }
    if (
      allText.includes("burger") ||
      allText.includes("hamburgues") ||
      allText.includes("junk food") ||
      cuisineLower.includes("burger")
    ) {
      tags.add("burger");
    }
    if (
      allText.includes("catalan") ||
      allText.includes("catalana") ||
      allText.includes("catalunya") ||
      allText.includes("cuina catalana") ||
      allText.includes("masia") ||
      allText.includes("calçots") ||
      allText.includes("brasa") ||
      allText.includes("can ") ||
      allText.includes("cal ")
    ) {
      tags.add("catalan");
    }
    if (
      allText.includes("gluten") ||
      allText.includes("celiac") ||
      allText.includes("celíac") ||
      allText.includes("sense gluten") ||
      allText.includes("sin gluten") ||
      allText.includes("gluten_free") ||
      allText.includes("gluten-free")
    ) {
      tags.add("gluten_free");
    }
    if (allText.includes("halal")) {
      tags.add("halal");
    }
    if (
      allText.includes("indian") ||
      allText.includes("indi") ||
      allText.includes("curry") ||
      allText.includes("tandoori") ||
      allText.includes("india") ||
      allText.includes("masala")
    ) {
      tags.add("indian");
    }
    if (
      allText.includes("fish and chips") ||
      allText.includes("fish & chips") ||
      allText.includes("chippy")
    ) {
      tags.add("fish_and_chips");
    }

    let inferredCuisine = curatedMatch?.cuisine ?? input.cuisine;
    if (!inferredCuisine) {
      if (tags.has("italian")) inferredCuisine = "italian";
      else if (tags.has("asian")) inferredCuisine = "asian";
      else if (tags.has("mediterranean")) inferredCuisine = "mediterranean";
      else if (tags.has("burger")) inferredCuisine = "burger";
      else if (tags.has("catalan")) inferredCuisine = "catalan";
      else if (tags.has("indian")) inferredCuisine = "indian";
      else if (tags.has("ice_cream")) inferredCuisine = "ice_cream";
      else if (tags.has("cafe_bakery")) inferredCuisine = "cafe_bakery";
      else if (tags.has("fish_and_chips")) inferredCuisine = "fish_and_chips";
      else if (tags.has("restaurant")) inferredCuisine = "restaurant";
    }

    return {
      tags: Array.from(tags),
      isVegan: isVegan || undefined,
      isVegetarian: isVegetarian || undefined,
      cuisine: inferredCuisine,
      rating: curatedMatch?.rating,
    };
  }

  async function fetchOverpassRestaurants(
    lat: number,
    lon: number,
    radiusMeters: number,
    signal?: AbortSignal,
  ): Promise<RestaurantCandidate[]> {
    const radius = Math.min(Math.max(radiusMeters, 500), 10_000);
    const query = `[out:json][timeout:6];(node["amenity"~"restaurant|cafe|fast_food|bar|bistro|pub|ice_cream|bakery"](around:${radius},${lat},${lon});way["amenity"~"restaurant|cafe|fast_food|bar|bistro|pub|ice_cream|bakery"](around:${radius},${lat},${lon});node["diet:vegan"](around:${radius},${lat},${lon});node["diet:vegetarian"](around:${radius},${lat},${lon}););out center 50;`;

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              process.env.NOMINATIM_USER_AGENT ??
              process.env.OFF_USER_AGENT ??
              "VeganTools/0.1 (https://nilsduran.github.io)",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: signal || AbortSignal.timeout(6_000),
        });

        if (!response.ok) continue;
        const data = (await response.json()) as {
          elements?: Array<{
            type: "node" | "way" | "relation";
            id: number;
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
            tags?: Record<string, string>;
          }>;
        };

        const results: RestaurantCandidate[] = [];
        for (const el of data.elements ?? []) {
          const tags = el.tags;
          if (!tags || !tags.name) continue;
          const elemLat = el.lat ?? el.center?.lat;
          const elemLon = el.lon ?? el.center?.lon;
          if (typeof elemLat !== "number" || typeof elemLon !== "number") continue;

          const streetAddress = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
          const locality = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
          const fullAddress = [streetAddress, locality, tags["addr:postcode"], tags["addr:country"]].filter(Boolean).join(", ");

          const website = tags.website || tags["contact:website"] || tags.url;
          let websiteUrl: string | undefined;
          try {
            if (website) {
              const parsed = new URL(website.startsWith("http") ? website : `https://${website}`);
              if (["http:", "https:"].includes(parsed.protocol)) {
                websiteUrl = parsed.toString();
              }
            }
          } catch {
            websiteUrl = undefined;
          }

          const inferred = inferTagsAndVegan({
            name: tags.name,
            cuisine: tags.cuisine,
            vegan: tags["diet:vegan"],
            vegetarian: tags["diet:vegetarian"],
            osm_key: "amenity",
            osm_value: tags.amenity || tags.shop,
          });

          results.push({
            id: `osm-${el.type.charAt(0).toUpperCase()}-${el.id}`,
            name: tags.name,
            address: fullAddress || locality || tags["addr:country"] || "",
            latitude: elemLat,
            longitude: elemLon,
            websiteUrl,
            mapUrl: `https://www.openstreetmap.org/?mlat=${elemLat}&mlon=${elemLon}#map=17/${elemLat}/${elemLon}`,
            provider: "openstreetmap" as const,
            cuisine: inferred.cuisine,
            tags: inferred.tags,
            isVegan: inferred.isVegan,
            isVegetarian: inferred.isVegetarian,
            rating: inferred.rating,
          });
        }

        if (results.length > 0) {
          return results;
        }
      } catch {
        // try next endpoint
      }
    }
    return [];
  }
  let geoapifyDisabledUntil = 0;

  app.get<{
    Querystring: {
      q?: string;
      near?: string;
      autocomplete?: string;
      sessionToken?: string;
      latitude?: string;
      longitude?: string;
      radius?: string;
    };
  }>(
    "/v1/restaurants/search",
    async (request, reply) => {
      const query = request.query.q?.trim();
      if (!query || query.length < 2) {
        return reply.code(400).send({
          code: "QUERY_REQUIRED",
          message: "Enter at least two characters of the restaurant name.",
        });
      }

      const geoapifyKey = process.env.GEOAPIFY_API_KEY?.trim();
      const defaultNear =
        process.env.DEFAULT_RESTAURANT_NEAR?.trim() || "Barcelona";
      const latitude = Number(request.query.latitude);
      const longitude = Number(request.query.longitude);
      const hasLocation =
        Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
      const requestedRadius = Number(request.query.radius);
      const radiusMeters =
        Number.isFinite(requestedRadius) && requestedRadius >= 100 && requestedRadius <= 100_000
          ? requestedRadius
          : 5_000;
      const radiusKm = radiusMeters / 1_000;
      const cacheKey = [
        geoapifyKey ? "geoapify" : "openstreetmap",
        request.query.autocomplete === "true" ? "autocomplete" : "search",
        query.toLocaleLowerCase(),
        request.query.near?.trim().toLocaleLowerCase() ?? "",
        hasLocation ? `${latitude},${longitude}` : "",
        hasLocation ? String(radiusMeters) : "",
      ].join("|");
      const cachedSearch = restaurantSearchCache.get(cacheKey);
      if (cachedSearch && cachedSearch.expiresAt > Date.now()) {
        return cachedSearch.results;
      }
      let inferredTextNear = "";
      let inferredRestaurantQuery = query;
      if (
        request.query.autocomplete !== "true" &&
        !request.query.near?.trim() &&
        !hasLocation &&
        !query.includes(",")
      ) {
        const words = query.split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          for (const suffixLength of [2, 1]) {
            if (words.length <= suffixLength) continue;
            const possibleLocality = words.slice(-suffixLength).join(" ");
            try {
              const localityUrl = new URL(
                "https://nominatim.openstreetmap.org/search",
              );
              localityUrl.search = new URLSearchParams({
                q: possibleLocality,
                format: "jsonv2",
                limit: "1",
                addressdetails: "0",
                layer: "address",
              }).toString();
              const localityResponse = await fetch(localityUrl, {
                headers: {
                  "User-Agent":
                    process.env.NOMINATIM_USER_AGENT ??
                    process.env.OFF_USER_AGENT ??
                    "VeganTools/0.1 (https://nilsduran.github.io)",
                  Accept: "application/json",
                },
                signal: AbortSignal.timeout(1_500),
              });
              if (!localityResponse.ok) continue;
              const localities = (await localityResponse.json()) as Array<{
                addresstype?: string;
                type?: string;
              }>;
              const localityType =
                localities[0]?.addresstype ?? localities[0]?.type;
              if (
                localityType &&
                ["city", "town", "village", "municipality"].includes(localityType)
              ) {
                inferredTextNear = possibleLocality;
                inferredRestaurantQuery = words.slice(0, -suffixLength).join(" ");
                break;
              }
            } catch {
              // Location inference is optional; normal provider search remains available.
            }
          }
        }
      }
      const isGenericQuery = ["vegan", "vegà", "restaurant", "restaurants", "bar", "cafe", "food", "menjar"].includes(query.trim().toLowerCase());
      const commaParts = query.split(",").map((part) => part.trim()).filter(Boolean);
      const hasExplicitCity = Boolean(request.query.near?.trim() || commaParts.length > 1 || inferredTextNear);
      
      const isWithinLocation = (candLat: number, candLon: number): boolean => {
        if (!hasLocation || hasExplicitCity) return true;
        const dLat = (candLat - latitude) * (Math.PI / 180);
        const dLon = (candLon - longitude) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(latitude * (Math.PI / 180)) *
            Math.cos(candLat * (Math.PI / 180)) *
            Math.sin(dLon / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return isGenericQuery ? distKm <= radiusKm : distKm <= 150;
      };

      let inferredNear: string | undefined;
      let geoapifyQuery = query;
      if (commaParts.length > 1) {
        geoapifyQuery = commaParts[0] ?? query;
        inferredNear = commaParts.slice(1).join(", ");
      } else if (inferredTextNear) {
        geoapifyQuery = inferredRestaurantQuery;
        inferredNear = inferredTextNear;
      } else if (isGenericQuery) {
        inferredNear = request.query.near?.trim() || defaultNear;
      } else {
        inferredNear = request.query.near?.trim() || undefined;
        geoapifyQuery = query;
      }

      if (!geoapifyKey && request.query.autocomplete === "true") {
        return reply.code(503).send({
          code: "AUTOCOMPLETE_PROVIDER_REQUIRED",
          message:
            "Live suggestions require Geoapify. Press Enter to search OpenStreetMap instead.",
        });
      }

      if (geoapifyKey && Date.now() > geoapifyDisabledUntil) {
        const url = new URL("https://api.geoapify.com/v2/places");
        url.searchParams.set(
          "categories",
          "catering.restaurant,catering.cafe,catering.fast_food,catering.ice_cream,catering.bakery",
        );
        url.searchParams.set("apiKey", geoapifyKey);
        url.searchParams.set(
          "limit",
          request.query.autocomplete === "true" ? "8" : "50",
        );

        if (!isGenericQuery && geoapifyQuery) {
          url.searchParams.set("name", geoapifyQuery);
        }

        if (hasLocation) {
          url.searchParams.set(
            "filter",
            `circle:${longitude},${latitude},${radiusMeters}`,
          );
          url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
        } else if (inferredNear) {
          url.searchParams.set("text", `${geoapifyQuery} ${inferredNear}`);
        } else {
          url.searchParams.set("text", geoapifyQuery);
        }

        try {
          const response = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(3_000),
          });

          if (
            response.status === 429 ||
            response.status === 401 ||
            response.status === 403
          ) {
            geoapifyDisabledUntil = Date.now() + 60 * 60_000;
            request.log.warn(
              { status: response.status },
              "Geoapify quota exceeded or key invalid; disabling for 1h",
            );
          }

          if (response.ok) {
            const payload = (await response.json()) as {
              features?: Array<{
                properties?: {
                  place_id?: string;
                  name?: string;
                  formatted?: string;
                  address_line1?: string;
                  address_line2?: string;
                  city?: string;
                  street?: string;
                  housenumber?: string;
                  postcode?: string;
                  country?: string;
                  website?: string;
                  contact?: { phone?: string; website?: string };
                  opening_hours?: string;
                  categories?: string[];
                  catering?: {
                    cuisine?: string;
                    diet?: {
                      vegan?: boolean;
                      vegetarian?: boolean;
                      gluten_free?: boolean;
                    };
                  };
                };
                geometry?: {
                  type: "Point";
                  coordinates: [number, number]; // [lon, lat]
                };
              }>;
            };

            const candidates: RestaurantCandidate[] = (payload.features ?? [])
              .filter((f) => {
                const props = f.properties;
                const coords = f.geometry?.coordinates;
                return (
                  props?.name &&
                  coords &&
                  coords.length >= 2 &&
                  Number.isFinite(coords[1]) &&
                  Number.isFinite(coords[0]) &&
                  isWithinLocation(coords[1], coords[0])
                );
              })
              .map((f) => {
                const props = f.properties!;
                const lon = f.geometry!.coordinates[0];
                const lat = f.geometry!.coordinates[1];
                const placeId = props.place_id || `${lat}-${lon}`;
                const website = props.website || props.contact?.website;
                let websiteUrl: string | undefined;
                try {
                  if (website) {
                    const parsed = new URL(
                      website.startsWith("http") ? website : `https://${website}`,
                    );
                    if (["http:", "https:"].includes(parsed.protocol)) {
                      websiteUrl = parsed.toString();
                    }
                  }
                } catch {
                  websiteUrl = undefined;
                }

                const categories = Array.isArray(props.categories)
                  ? props.categories
                  : [];
                const isVegan =
                  props.catering?.diet?.vegan === true ||
                  categories.includes("diet.vegan");
                const isVegetarian =
                  isVegan ||
                  props.catering?.diet?.vegetarian === true ||
                  categories.includes("diet.vegetarian");

                const tags = new Set<string>();
                if (isVegan) tags.add("vegan");
                if (isVegetarian) tags.add("vegetarian");
                for (const cat of categories) {
                  if (cat.includes("restaurant")) tags.add("restaurant");
                  if (cat.includes("cafe") || cat.includes("bakery")) tags.add("cafe_bakery");
                  if (cat.includes("italian") || cat.includes("pizza")) tags.add("italian");
                  if (cat.includes("asian") || cat.includes("japanese") || cat.includes("chinese")) tags.add("asian");
                  if (cat.includes("mediterranean") || cat.includes("tapas")) tags.add("mediterranean");
                  if (cat.includes("burger") || cat.includes("fast_food")) tags.add("burger");
                  if (cat.includes("ice_cream")) tags.add("ice_cream");
                  if (cat.includes("indian")) tags.add("indian");
                  if (cat.includes("gluten_free")) tags.add("gluten_free");
                }

                return {
                  id: `geoapify-${placeId}`,
                  name: props.name!,
                  address:
                    props.formatted ||
                    props.address_line2 ||
                    [props.street, props.city, props.postcode, props.country]
                      .filter(Boolean)
                      .join(", "),
                  latitude: lat,
                  longitude: lon,
                  websiteUrl,
                  mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
                  provider: "geoapify" as const,
                  cuisine: props.catering?.cuisine,
                  tags: Array.from(tags),
                  isVegan: isVegan || undefined,
                  isVegetarian: isVegetarian || undefined,
                  openingHours: props.opening_hours,
                };
              });

            if (candidates.length > 0) {
              restaurantSearchCache.set(cacheKey, {
                expiresAt: Date.now() + 15 * 60_000,
                results: candidates,
              });
              return candidates;
            }
          }
        } catch (error) {
          request.log.warn(
            { error },
            "Geoapify restaurant search failed; using OpenStreetMap",
          );
        }
      }

      const normalizeText = (str: string) =>
        str.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

      const normQuery = normalizeText(query);
      const queryParts = query.split(",").map((p) => p.trim()).filter(Boolean);
      const searchHead = normalizeText(queryParts[0] ?? query);

      // 1. Check curated catalog for instant high-confidence matches and local proximity
      const curatedMatches = CURATED_RESTAURANTS.filter((r) => {
        const rName = normalizeText(r.name);
        const rAddr = normalizeText(r.address);

        if (isGenericQuery && hasLocation && !hasExplicitCity) {
          const dLat = (r.latitude - latitude) * (Math.PI / 180);
          const dLon = (r.longitude - longitude) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(latitude * (Math.PI / 180)) *
              Math.cos(r.latitude * (Math.PI / 180)) *
              Math.sin(dLon / 2) ** 2;
          const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return distKm <= radiusKm;
        }

        const nameMatch = (
          rName.includes(normQuery) ||
          normQuery.includes(rName) ||
          rName.includes(searchHead) ||
          searchHead.includes(rName) ||
          (rAddr.includes(normQuery) && rName.length > 2)
        );
        return nameMatch;
      });

      // 2. Spatial Overpass API query for generic area discovery
      if (isGenericQuery && hasLocation && !hasExplicitCity) {
        try {
          const overpassResults = await fetchOverpassRestaurants(latitude, longitude, radiusMeters);
          if (overpassResults.length > 0 || curatedMatches.length > 0) {
            const combined = [...curatedMatches, ...overpassResults];
            const deduplicated = deduplicateRestaurants(combined);
            restaurantSearchCache.set(cacheKey, {
              expiresAt: Date.now() + 15 * 60_000,
              results: deduplicated,
            });
            return deduplicated;
          }
        } catch (overpassErr) {
          request.log.warn({ overpassErr }, "Overpass spatial search failed, falling back to Photon");
        }
      }

      // 3. Query Photon (Komoot OSM POI engine with universal coverage and soft proximity ranking)
      const photonResults: RestaurantCandidate[] = [];
      try {
        const photonUrl = new URL("https://photon.komoot.io/api/");
        const cleanQuery = isGenericQuery && !hasExplicitCity
          ? "restaurant"
          : query.replaceAll(",", " ").replace(/\s+/g, " ").trim();
        photonUrl.searchParams.set("q", cleanQuery);
        photonUrl.searchParams.set("limit", "50");
        if (isGenericQuery && !hasExplicitCity) {
          photonUrl.searchParams.set("osm_tag", "amenity:restaurant");
        }
        if (hasLocation && !hasExplicitCity) {
          photonUrl.searchParams.set("lat", String(latitude));
          photonUrl.searchParams.set("lon", String(longitude));
        }
        const photonRes = await fetch(photonUrl.toString(), {
          headers: {
            "User-Agent":
              process.env.NOMINATIM_USER_AGENT ??
              process.env.OFF_USER_AGENT ??
              "VeganTools/0.1 (https://nilsduran.github.io)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(6_000),
        });
        if (photonRes.ok) {
          const photonData = (await photonRes.json()) as {
            features?: Array<{
              properties?: {
                osm_id?: number;
                osm_type?: string;
                name?: string;
                city?: string;
                town?: string;
                village?: string;
                state?: string;
                country?: string;
                street?: string;
                housenumber?: string;
                osm_key?: string;
                osm_value?: string;
              };
              geometry?: {
                coordinates?: [number, number];
              };
            }>;
          };
          const diningValues = new Set([
            "restaurant", "cafe", "fast_food", "bar", "pub", "bistro", "ice_cream",
            "bakery", "food_court", "pastry", "coffee_shop", "deli", "vegetarian", "vegan", "yes"
          ]);
          for (const f of photonData.features ?? []) {
            const p = f.properties;
            if (!p?.name || !f.geometry?.coordinates) continue;
            const [lon, lat] = f.geometry.coordinates;
            const isDining = (p.osm_key === "amenity" || p.osm_key === "shop") && diningValues.has(p.osm_value ?? "");
            const pNorm = normalizeText(p.name);
            const nameMatches = pNorm.includes(searchHead) || searchHead.includes(pNorm) || pNorm.includes(normQuery);
            if (!isDining && !nameMatches && p.osm_key !== "amenity") continue;
            if (!isWithinLocation(lat, lon)) continue;

            const streetAddress = [p.street, p.housenumber].filter(Boolean).join(" ");
            const locality = p.city || p.town || p.village;
            const fullAddress = [streetAddress, locality, p.state, p.country]
              .filter(Boolean)
              .join(", ");

            const { tags, isVegan, isVegetarian, cuisine, rating } = inferTagsAndVegan({
              name: p.name,
              osm_key: p.osm_key,
              osm_value: p.osm_value,
            });

            photonResults.push({
              id: `osm-${p.osm_type ?? "N"}-${p.osm_id ?? Math.floor(Math.random() * 1e8)}`,
              name: p.name,
              address: fullAddress || locality || p.country || "",
              latitude: lat,
              longitude: lon,
              mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
              provider: "openstreetmap" as const,
              cuisine,
              tags,
              isVegan,
              isVegetarian,
              rating,
            });
          }
        }
      } catch (photonErr) {
        request.log.warn({ photonErr }, "Photon search failed, trying fallback providers");
      }

      // If we got results from Photon or curated, return them directly without calling Nominatim
      if (photonResults.length > 0 || curatedMatches.length > 0) {
        const combined = [...curatedMatches, ...photonResults];
        const deduplicated = deduplicateRestaurants(combined);
        restaurantSearchCache.set(cacheKey, {
          expiresAt: Date.now() + 15 * 60_000,
          results: deduplicated,
        });
        return deduplicated;
      }

      // 4. Fallback to OpenStreetMap Nominatim
      const buildNominatimUrl = (withLocation: boolean) => {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        const params: Record<string, string> = {
          format: "jsonv2",
          limit: "30",
          addressdetails: "1",
          extratags: "1",
        };
        if (isGenericQuery && withLocation && hasLocation) {
          params.amenity = "restaurant";
          params.viewbox = `${longitude - 0.08},${latitude + 0.06},${longitude + 0.08},${latitude - 0.06}`;
          params.bounded = "1";
        } else {
          params.q = isGenericQuery ? "restaurant" : query;
          if (withLocation && hasLocation) {
            params.viewbox = `${longitude - 0.25},${latitude + 0.2},${longitude + 0.25},${latitude - 0.2}`;
            params.bounded = "0";
          }
        }
        url.search = new URLSearchParams(params).toString();
        return url.toString();
      };

      try {
        await waitForNominatim();
        let response = await fetch(buildNominatimUrl(hasLocation), {
          headers: {
            "User-Agent":
              process.env.NOMINATIM_USER_AGENT ??
              process.env.OFF_USER_AGENT ??
              "VeganTools/0.1 (https://nilsduran.github.io)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error(`OpenStreetMap search failed (${response.status}).`);
        let raw = await response.json() as Array<{
          osm_id: number;
          osm_type: "node" | "way" | "relation";
          name?: string;
          display_name: string;
          lat: string;
          lon: string;
          type?: string;
          category?: string;
          extratags?: {
            website?: string;
            "contact:website"?: string;
            opening_hours?: string;
            cuisine?: string;
          };
        }>;

        // If local search yielded 0 results and we had a location bias, fallback to global search
        if (raw.length === 0 && hasLocation && !request.query.radius) {
          await waitForNominatim();
          response = await fetch(buildNominatimUrl(false), {
            headers: {
              "User-Agent":
                process.env.NOMINATIM_USER_AGENT ??
                process.env.OFF_USER_AGENT ??
                "VeganTools/0.1 (https://nilsduran.github.io)",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8_000),
          });
          if (response.ok) {
            raw = await response.json() as typeof raw;
          }
        }

        const diningTypes = new Set([
          "restaurant", "cafe", "fast_food", "bar", "pub", "bistro", "ice_cream",
          "bakery", "food_court", "pastry", "coffee_shop", "deli", "vegetarian", "vegan"
        ]);
        const searchHead = query.split(",")[0]?.trim().toLowerCase() ?? query.toLowerCase();
        const nominatimCandidates: RestaurantCandidate[] = raw
          .filter((item) =>
            diningTypes.has(item.type ?? "") ||
            item.category === "amenity" ||
            (item.name && item.name.toLowerCase().includes(searchHead))
          )
          .map((item) => {
            const website = item.extratags?.website ?? item.extratags?.["contact:website"];
            let websiteUrl: string | undefined;
            try {
              const parsed = website ? new URL(website) : undefined;
              if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
                websiteUrl = parsed.toString();
              }
            } catch {
              websiteUrl = undefined;
            }
            const { tags, isVegan, isVegetarian, cuisine } = inferTagsAndVegan({
              name: item.name ?? item.display_name,
              cuisine: item.extratags?.cuisine,
              type: item.type,
            });

            return {
              id: `${item.osm_type}-${item.osm_id}`,
              name: item.name?.trim() || item.display_name.split(",")[0]?.trim() || query,
              address: item.display_name,
              latitude: Number(item.lat),
              longitude: Number(item.lon),
              websiteUrl,
              mapUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
              provider: "openstreetmap",
              openingHours: item.extratags?.opening_hours,
              cuisine,
              tags,
              isVegan,
              isVegetarian,
            };
          });

        const allResults = [...curatedMatches, ...photonResults, ...nominatimCandidates]
          .filter((item) => isWithinLocation(item.latitude, item.longitude));
        const finalResults = deduplicateRestaurants(allResults);

        restaurantSearchCache.set(cacheKey, {
          expiresAt: Date.now() + 15 * 60_000,
          results: finalResults,
        });
        return finalResults;
      } catch (error) {
        request.log.warn({ error }, "Restaurant search failed");
        if (photonResults.length > 0 || curatedMatches.length > 0) {
          const fallback = deduplicateRestaurants([...curatedMatches, ...photonResults]);
          return fallback;
        }
        return reply.code(503).send({
          code: "RESTAURANT_SEARCH_UNAVAILABLE",
          message: "Restaurant search is temporarily unavailable. You can still upload a menu.",
        });
      }
    },
  );

  app.post<{ Body: unknown }>("/v1/restaurants/resolve", async (request, reply) => {
    const parsed = restaurantCandidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "INVALID_RESTAURANT",
        message: "The selected restaurant is invalid.",
      });
    }
    const candidate = parsed.data;
    if (candidate.provider === "curated" || candidate.id.startsWith("curated-")) {
      return candidate;
    }
    if (candidate.websiteUrl) return candidate;

    const geoapifyKey = process.env.GEOAPIFY_API_KEY?.trim();
    if (candidate.provider === "geoapify" && geoapifyKey) {
      const placeId = candidate.id.replace(/^geoapify-/, "");
      try {
        const url = new URL("https://api.geoapify.com/v2/place-details");
        url.searchParams.set("id", placeId);
        url.searchParams.set("apiKey", geoapifyKey);
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3_000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{
              properties?: {
                website?: string;
                contact?: { website?: string; phone?: string };
              };
            }>;
          };
          const site =
            data.features?.[0]?.properties?.website ||
            data.features?.[0]?.properties?.contact?.website;
          if (site) {
            try {
              const parsedUrl = new URL(
                site.startsWith("http") ? site : `https://${site}`,
              );
              if (["http:", "https:"].includes(parsedUrl.protocol)) {
                return { ...candidate, websiteUrl: parsedUrl.toString() };
              }
            } catch {
              // ignore invalid url
            }
          }
        }
      } catch (err) {
        request.log.warn({ err }, "Geoapify place details lookup failed");
      }
    }

    try {
      const websiteUrl = await restaurantWebsiteFinder.find(candidate);
      return websiteUrl ? { ...candidate, websiteUrl } : candidate;
    } catch (error) {
      request.log.warn({ error }, "Official website search failed");
      return candidate;
    }
  });

  interface AuthUser {
    id: string;
    name: string;
    avatarUrl?: string;
  }

  function extractUserFromAuthHeader(authHeader?: string): AuthUser | undefined {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return undefined;
    const token = authHeader.slice(7).trim();
    if (!token) return undefined;

    try {
      const parts = token.split(".");
      if (parts.length < 2) return undefined;
      const payloadJson = Buffer.from(parts[1]!, "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson);
      if (!payload.sub) return undefined;

      const name =
        payload.user_metadata?.name ||
        payload.user_metadata?.full_name ||
        payload.user_metadata?.user_name ||
        (payload.email ? payload.email.split("@")[0] : undefined) ||
        "Anònim";

      const avatarUrl =
        payload.user_metadata?.avatar_url ||
        payload.user_metadata?.picture ||
        undefined;

      return {
        id: String(payload.sub),
        name: String(name),
        avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
      };
    } catch {
      return undefined;
    }
  }

  // 1. Get Reviews and Stats for a Restaurant (Public)
  app.get<{ Params: { id: string } }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const restaurantId = request.params.id;
      if (!restaurantId) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "Restaurant ID is required.",
        });
      }
      try {
        const result = await restaurantReviewStore.getReviews(restaurantId);
        return result;
      } catch (error) {
        request.log.error({ error, restaurantId }, "Failed to fetch restaurant reviews");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to load reviews.",
        });
      }
    },
  );

  // 2. Submit / Update Review for a Restaurant (Authenticated)
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const user = extractUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required to submit a review.",
        });
      }

      const restaurantId = request.params.id;
      const parsed = createReviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          code: "INVALID_REVIEW",
          message: "Invalid review content. Leaves score must be 1 to 5.",
          errors: parsed.error.format(),
        });
      }

      const { leavesScore, comment, userName } = parsed.data;
      const now = new Date().toISOString();

      const review: RestaurantReview = {
        id: randomUUID(),
        restaurantId,
        userId: user.id,
        userName: userName?.trim() || user.name,
        userAvatarUrl: user.avatarUrl,
        leavesScore,
        comment: comment?.trim() || "",
        createdAt: now,
        updatedAt: now,
      };

      try {
        const saved = await restaurantReviewStore.saveReview(review);
        const all = await restaurantReviewStore.getReviews(restaurantId);
        return {
          review: saved,
          stats: all.stats,
        };
      } catch (error) {
        request.log.error({ error, restaurantId, userId: user.id }, "Failed to save restaurant review");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to save review.",
        });
      }
    },
  );

  // 3. Delete Review for a Restaurant (Authenticated)
  app.delete<{ Params: { id: string } }>(
    "/v1/restaurants/:id/reviews",
    async (request, reply) => {
      const user = extractUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required to delete a review.",
        });
      }

      const restaurantId = request.params.id;
      try {
        const deleted = await restaurantReviewStore.deleteReview(restaurantId, user.id);
        const all = await restaurantReviewStore.getReviews(restaurantId);
        return {
          deleted,
          stats: all.stats,
        };
      } catch (error) {
        request.log.error({ error, restaurantId, userId: user.id }, "Failed to delete restaurant review");
        return reply.code(500).send({
          code: "STORE_ERROR",
          message: "Failed to delete review.",
        });
      }
    },
  );

  app.post<{
    Body: {
      restaurantName?: string;
      websiteUrl?: string;
      restaurant?: unknown;
    };
  }>("/v1/menus/discover", async (request, reply) => {
    const parsedRestaurant = restaurantCandidateSchema.safeParse(
      request.body?.restaurant,
    );
    const websiteUrl = request.body?.websiteUrl?.trim();
    if (!websiteUrl) {
      return reply.code(400).send({
        code: "RESTAURANT_WEBSITE_REQUIRED",
        message: "Enter a valid website or menu link.",
      });
    }
    let normalizedWebsite: string;
    let fallbackName = "";
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      normalizedWebsite = parsed.toString();
      fallbackName = parsed.hostname.replace(/^www\./i, "").split(".")[0] ?? "Restaurant";
      if (fallbackName) {
        fallbackName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      }
    } catch {
      return reply.code(400).send({
        code: "INVALID_WEBSITE",
        message: "Enter a valid public restaurant website.",
      });
    }

    const restaurant = parsedRestaurant.success
      ? parsedRestaurant.data
      : undefined;

    const restaurantName =
      restaurant?.name ?? (request.body?.restaurantName?.trim() || fallbackName || "Restaurant");

    const draft = await repo.createMenu();

    // Check shared menu cache to return previously discovered menus instantly
    if (restaurant) {
      try {
        const cached = await restaurantMenuCache.get(restaurant);
        if (cached?.menu && cached.menu.status === "ready" && cached.menu.sections.length > 0) {
          const sessionMenu = {
            ...cached.menu,
            id: draft.id,
            editToken: draft.editToken,
          };
          await repo.setMenu(sessionMenu);
          return reply.code(200).send(sessionMenu);
        }
      } catch (cacheError) {
        request.log.warn({ cacheError }, "Restaurant menu cache lookup failed");
      }
    }

    const discoverWithFallback = async () => {
      try {
        return await withTimeout(
          menuDiscoverer.discover(normalizedWebsite),
          25_000,
          "Finding a menu on the restaurant website took too long.",
        );
      } catch (initialError) {
        if (!restaurant) throw initialError;
        const fallbackWebsite = await restaurantWebsiteFinder.find(
          { ...restaurant, websiteUrl: undefined },
          normalizedWebsite,
        );
        if (!fallbackWebsite || fallbackWebsite === normalizedWebsite) {
          throw initialError;
        }
        request.log.info(
          { rejectedWebsite: normalizedWebsite, fallbackWebsite },
          "Retrying menu discovery with a verified website",
        );
        return withTimeout(
          menuDiscoverer.discover(fallbackWebsite),
          25_000,
          "Finding a menu on the restaurant website took too long.",
        );
      }
    };
    void withTimeout(
      discoverWithFallback(),
      55_000,
      "Finding a menu on the restaurant website took too long.",
    )
      .then(async (discovered) => {
        let sourceFiles: Awaited<ReturnType<MenuSourceStore["save"]>> = [];
        try {
          sourceFiles = await menuSourceStore.save(draft.id, [discovered.upload]);
        } catch (sourceError) {
          request.log.warn({ sourceError }, "Discovered menu source could not be saved");
        }
        const draftWithSources = { ...draft, sourceFiles };
        await repo.setMenu(draftWithSources);
        return withTimeout(
          menuAnalyzer.analyze(draftWithSources, [discovered.upload]),
          180_000,
          "Menu analysis took too long. Please try again.",
        ).then((result) => {
          const dishCount = result.sections.reduce(
            (total, section) => total + section.items.length,
            0,
          );
          if (dishCount === 0) {
            throw new Error(
              "The website menu was found, but no dishes could be extracted. Upload the PDF or menu photos instead.",
            );
          }
          return {
            ...result,
            restaurantName,
            sourceUrl: discovered.sourceUrl,
            sourceLabel: "Restaurant website",
          };
        });
      })
      .then(async (result) => {
        await repo.setMenu(result);
        if (restaurant) {
          try {
            await restaurantMenuCache.save(restaurant, result);
          } catch (cacheError) {
            request.log.warn({ cacheError }, "Shared menu cache write failed");
          }
        }
      })
      .catch(async (error: unknown) => {
        request.log.warn({ error }, "Website menu discovery failed");
        await repo.setMenu({
          ...draft,
          restaurantName,
          sourceUrl: normalizedWebsite,
          sourceLabel: "Restaurant website",
          status: "failed",
          error: error instanceof Error
            ? error.message
            : "No readable menu was found. Upload the menu instead.",
        });
      });
    return reply.code(202).send({
      ...draft,
      restaurantName,
      sourceUrl: normalizedWebsite,
      sourceLabel: "Restaurant website",
    });
  });

  app.get<{ Params: { gtin: string } }>("/v1/products/:gtin", async (request, reply) => {
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin)) {
      return reply.code(400).send({ code: "INVALID_GTIN", message: "Invalid GTIN check digit." });
    }

    const cached = await repo.getProduct(gtin);
    if (cached?.classifierVersion === CLASSIFIER_VERSION) return cached;

    try {
      const product = await lookupOpenFoodFacts(gtin);
      if (product) {
        await repo.saveProduct(product);
        return product;
      }
    } catch (error) {
      request.log.warn({ error }, "Open Food Facts lookup failed");
    }

    const unknown: ProductResult = {
      gtin,
      verdict: "unknown",
      assurance: "unverified",
      definitive: false,
      reason: "No trustworthy product evidence was found. Scan the current ingredient label.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: CLASSIFIER_VERSION,
      traces: [],
      revision: 1,
      evidence: [],
    };
    return unknown;
  });

  app.post<{
    Params: { gtin: string };
    Body: { ingredientsText?: string; market?: string; verifiedVeganClaim?: boolean };
  }>("/v1/products/:gtin/evidence", async (request, reply) => {
    if (!request.headers.authorization?.startsWith("Bearer ")) {
      return reply.code(401).send({ code: "AUTH_REQUIRED", message: "Sign in to submit evidence." });
    }
    const gtin = normalizeGtin(request.params.gtin);
    if (!isValidGtin(gtin) || !request.body?.ingredientsText?.trim()) {
      return reply.code(400).send({ code: "INVALID_EVIDENCE", message: "GTIN and ingredients are required." });
    }

    const analysis = classifyIngredients(request.body.ingredientsText, {
      assurance: "label_based",
      verifiedVeganClaim: request.body.verifiedVeganClaim,
    });
    const previous = await repo.getProduct(gtin);
    const capturedAt = new Date().toISOString();
    const evidence: Evidence = {
      id: randomUUID(),
      sourceType: "package_label",
      sourceName: "User-confirmed package label",
      capturedAt,
      market: request.body.market ?? "ES",
      reviewerId: "authenticated-user",
      ingredientsText: request.body.ingredientsText,
      traces: analysis.traces,
    };
    const product: ProductResult = {
      gtin,
      productName: previous?.productName,
      brand: previous?.brand,
      imageUrl: previous?.imageUrl,
      ingredientsImageUrl: previous?.ingredientsImageUrl,
      verdict: analysis.verdict,
      assurance: analysis.assurance,
      definitive: analysis.definitive,
      reason: analysis.reason,
      matchedIngredients: analysis.matchedIngredients,
      findings: analysis.findings,
      classifierVersion: analysis.classifierVersion,
      traces: analysis.traces,
      verifiedAt: capturedAt,
      revision: (previous?.revision ?? 0) + 1,
      evidence: [...(previous?.evidence ?? []), evidence],
    };
    await repo.saveProduct(product);
    return reply.code(201).send(product);
  });

  app.post<{
    Body: {
      ingredientsText?: string;
      verifiedVeganClaim?: boolean;
      verifiedVegetarianClaim?: boolean;
    };
  }>("/v1/ingredients/classify", async (request, reply) => {
    if (!request.body?.ingredientsText?.trim()) {
      return reply.code(400).send({
        code: "INGREDIENTS_REQUIRED",
        message: "Paste a readable ingredient list.",
      });
    }
    return classifyIngredients(request.body.ingredientsText, {
      assurance: "label_based",
      verifiedVeganClaim: request.body.verifiedVeganClaim,
      verifiedVegetarianClaim: request.body.verifiedVegetarianClaim,
    });
  });

  app.post("/v1/ingredients/extract", async (request, reply) => {
    const upload = await request.file();
    if (!upload || !upload.mimetype.startsWith("image/")) {
      return reply.code(400).send({
        code: "IMAGE_REQUIRED",
        message: "Take or choose a photo of the ingredient label.",
      });
    }

    try {
      const ingredientsText = await withTimeout(
        ingredientExtractor.extract({
          mimetype: upload.mimetype,
          buffer: await upload.toBuffer(),
        }),
        30_000,
        "Photo reading took too long. Type the ingredients manually.",
      );
      return { ingredientsText };
    } catch (error) {
      return reply.code(503).send({
        code: "EXTRACTION_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Could not read this photo.",
      });
    }
  });

  app.post<{ Params: { gtin: string } }>(
    "/v1/products/:gtin/ingredients/extract",
    async (request, reply) => {
      const gtin = normalizeGtin(request.params.gtin);
      if (!isValidGtin(gtin)) {
        return reply.code(400).send({
          code: "INVALID_GTIN",
          message: "Invalid GTIN check digit.",
        });
      }

      let product = await repo.getProduct(gtin);
      if (!product?.ingredientsImageUrl) {
        product = await lookupOpenFoodFacts(gtin);
        if (product) await repo.saveProduct(product);
      }
      if (!product?.ingredientsImageUrl) {
        return reply.code(404).send({
          code: "INGREDIENT_IMAGE_MISSING",
          message: "Open Food Facts does not have an ingredient-label image for this product.",
        });
      }

      try {
        const url = new URL(product.ingredientsImageUrl);
        if (
          url.protocol !== "https:" ||
          !(url.hostname === "openfoodfacts.org" || url.hostname.endsWith(".openfoodfacts.org"))
        ) {
          throw new Error("The ingredient image source is not allowed.");
        }
        const imageResponse = await fetch(url, {
          headers: {
            "User-Agent":
              process.env.OFF_USER_AGENT ?? "VeganTools/0.1 (contact@example.com)",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!imageResponse.ok) throw new Error("The ingredient image could not be downloaded.");
        const mimetype = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
        if (!mimetype.startsWith("image/")) {
          throw new Error("Open Food Facts returned an invalid ingredient image.");
        }
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        if (buffer.byteLength > 10 * 1024 * 1024) {
          throw new Error("The ingredient image is too large.");
        }
        const ingredientsText = await withTimeout(
          ingredientExtractor.extract({ mimetype, buffer }),
          20_000,
          "Photo reading took too long. Type the ingredients manually.",
        );
        return { ingredientsText };
      } catch (error) {
        return reply.code(503).send({
          code: "EXTRACTION_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Could not read this photo.",
        });
      }
    },
  );

  app.post<{ Body: { recipeText?: string } }>(
    "/v1/recipes/veganize",
    async (request, reply) => {
      if (!request.body?.recipeText?.trim()) {
        return reply.code(400).send({
          code: "RECIPE_REQUIRED",
          message: "Paste a recipe with its ingredients.",
        });
      }
      return veganizeRecipe(request.body.recipeText);
    },
  );

  app.post("/v1/menus/analyses", async (request, reply) => {
    const uploads: Array<{ filename: string; mimetype: string; buffer: Buffer }> = [];
    let restaurantName = "";
    let sourceUrl: string | undefined;
    let restaurant: RestaurantCandidate | undefined;
    for await (const part of request.parts()) {
      if (part.type === "file") {
        uploads.push({
          filename: part.filename,
          mimetype: part.mimetype,
          buffer: await part.toBuffer(),
        });
      } else if (part.fieldname === "restaurantName" && typeof part.value === "string") {
        restaurantName = part.value.trim().slice(0, 200);
      } else if (part.fieldname === "sourceUrl" && typeof part.value === "string") {
        try {
          const parsed = new URL(part.value);
          if (["http:", "https:"].includes(parsed.protocol)) sourceUrl = parsed.toString();
        } catch {
          sourceUrl = undefined;
        }
      } else if (part.fieldname === "restaurant" && typeof part.value === "string") {
        try {
          const parsed = restaurantCandidateSchema.safeParse(JSON.parse(part.value));
          if (parsed.success) restaurant = parsed.data;
        } catch {
          restaurant = undefined;
        }
      }
    }
    if (uploads.length === 0) {
      return reply.code(400).send({ code: "FILES_REQUIRED", message: "Upload at least one menu file." });
    }

    const draft = await repo.createMenu();
    let sourceFiles: Awaited<ReturnType<MenuSourceStore["save"]>> = [];
    try {
      sourceFiles = await menuSourceStore.save(draft.id, uploads);
    } catch (sourceError) {
      request.log.warn({ sourceError }, "Original menu source could not be saved");
    }
    const draftWithSources = { ...draft, sourceFiles };
    await repo.setMenu(draftWithSources);
    void withTimeout(
      menuAnalyzer.analyze(draftWithSources, uploads),
      180_000,
      "Menu analysis took too long. Please try again.",
    )
      .then(async (result) => {
        const completed = {
          ...result,
          restaurantName: restaurantName || result.restaurantName,
          sourceUrl,
          sourceLabel: sourceUrl ? "Restaurant website and saved menu" : result.sourceLabel,
        };
        await repo.setMenu(completed);
        if (restaurant) {
          try {
            await restaurantMenuCache.save(restaurant, completed);
          } catch (cacheError) {
            request.log.warn({ cacheError }, "Shared menu cache write failed");
          }
        }
      })
      .catch(async (error: unknown) => {
        request.log.warn({ error }, "Menu analysis failed");
        await repo.setMenu({
          ...draft,
          status: "failed",
          error: friendlyMenuError(error),
        });
      });
    return reply.code(202).send(draftWithSources);
  });

  app.get("/v1/menus/recent", async (request) => {
    try {
      return await restaurantMenuCache.list(12);
    } catch (error) {
      request.log.warn({ error }, "Shared menu cache read failed");
      return [];
    }
  });

  app.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    "/v1/menus/analyses/:id",
    async (request, reply) => {
      const menu = await repo.getMenu(
        request.params.id,
        request.query.token ?? "",
      );
      if (!menu) {
        return reply.code(404).send({ code: "NOT_FOUND", message: "Menu draft not found." });
      }
      return menu;
    },
  );

  app.patch<{
    Params: { id: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/analyses/:id", async (request, reply) => {
    const parsed = menuPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_MENU", issues: parsed.error.issues });
    }
    const menu = await repo.updateMenu(request.params.id, request.query.token ?? "", parsed.data);
    if (!menu) return reply.code(404).send({ code: "NOT_FOUND", message: "Menu draft not found." });
    return menu;
  });

  app.post<{
    Params: { id: string };
    Querystring: { token?: string };
  }>("/v1/menus/:id/publish", async (request, reply) => {
    const menu = await repo.publishMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      return reply.code(409).send({ code: "NOT_READY", message: "Review the menu before publishing." });
    }
    return menu;
  });

  app.get<{ Params: { slug: string } }>("/v1/public/menus/:slug", async (request, reply) => {
    const menu = await repo.getPublicMenu(request.params.slug);
    if (!menu) return reply.code(404).send({ code: "NOT_FOUND", message: "Public menu not found." });
    const { editToken: _private, ...publicMenu } = menu;
    return publicMenu;
  });

  app.post<{
    Params: { id: string; dishId: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/:id/dishes/:dishId/feedback", async (request, reply) => {
    const parsed = dishFeedbackRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_FEEDBACK", issues: parsed.error.issues });
    }
    const { verdict, rawNote, targetModification } = parsed.data;

    let menu = await repo.getMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      menu = await repo.getPublicMenu(request.params.id);
    }
    if (!menu) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Menu not found." });
    }

    let foundItem: any;
    let foundSectionIndex = -1;
    let foundItemIndex = -1;

    for (let sIdx = 0; sIdx < menu.sections.length; sIdx++) {
      const section = menu.sections[sIdx];
      if (!section) continue;
      const iIdx = section.items.findIndex((item) => item.id === request.params.dishId);
      if (iIdx !== -1) {
        foundItem = section.items[iIdx];
        foundSectionIndex = sIdx;
        foundItemIndex = iIdx;
        break;
      }
    }

    if (!foundItem || foundSectionIndex === -1 || foundItemIndex === -1) {
      return reply.code(404).send({ code: "DISH_NOT_FOUND", message: "Dish not found in this menu." });
    }

    const polished = await dishFeedbackPolisher.polishDishFeedback({
      dishName: foundItem.name || foundItem.originalName,
      dishDescription: foundItem.description,
      verdict,
      rawNote,
      targetModification,
    });

    const updatedDish = {
      ...foundItem,
      verdict,
      reason: polished.reason,
      reasonCa: polished.reasonCa,
      modificationNote: polished.modificationNote,
      modificationNoteCa: polished.modificationNoteCa,
      modifiableTo: targetModification,
      modifications: polished.modifications.length > 0 ? polished.modifications : foundItem.modifications,
    };

    const newSections = menu.sections.map((section, sIdx) => {
      if (sIdx !== foundSectionIndex) return section;
      return {
        ...section,
        items: section.items.map((item, iIdx) => (iIdx === foundItemIndex ? updatedDish : item)),
      };
    });

    const updatedMenu = {
      ...menu,
      sections: newSections,
    };

    await repo.setMenu(updatedMenu);

    return { menu: updatedMenu, updatedDish };
  });

  app.post<{
    Params: { id: string };
    Querystring: { token?: string };
    Body: unknown;
  }>("/v1/menus/:id/notes", async (request, reply) => {
    const parsed = restaurantNotesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_NOTES", issues: parsed.error.issues });
    }

    let menu = await repo.getMenu(request.params.id, request.query.token ?? "");
    if (!menu) {
      menu = await repo.getPublicMenu(request.params.id);
    }
    if (!menu) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Menu not found." });
    }

    const polished = await dishFeedbackPolisher.polishRestaurantNotes(parsed.data.rawNotes);

    const updatedMenu = {
      ...menu,
      communityNotes: polished.communityNotes,
      communityNotesCa: polished.communityNotesCa,
    };

    await repo.setMenu(updatedMenu);

    return updatedMenu;
  });

  return app;
}
