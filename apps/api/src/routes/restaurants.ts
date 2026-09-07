/**
 * @file restaurants.ts
 * @description API endpoints for discovering, searching, and detailing vegan & vegan-friendly restaurants.
 * Orchestrates multi-provider geospatial search (Geoapify, Photon, Nominatim, Overpass), curated datasets,
 * opening hours evaluation, and website domain resolution.
 */

import type { FastifyInstance } from "fastify";
import {
  restaurantCandidateSchema,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import { CURATED_RESTAURANTS } from "../curated-restaurants.js";
import { evaluateOpeningHours } from "../opening-hours.js";
import type { RestaurantWebsiteFinder } from "../restaurant-website-finder.js";

export function cleanShortAddress(
  formattedAddress?: string,
  street?: string,
  housenumber?: string,
  city?: string,
): string {
  if (street && city) {
    const st = housenumber ? `${street}, ${housenumber}` : street;
    return `${st}, ${city}`;
  }
  if (!formattedAddress) return city || "";
  const clean = formattedAddress
    .replace(/,\s*(?:Spain|España|Espanya|Catalunya|Catalonia|United Kingdom|France|Deutschland|Italy|Italia)$/i, "")
    .replace(/,\s*\d{4,5}\s+([^,]+)/, ", $1")
    .replace(/,\s*\d{4,5}/, "")
    .replace(/,\s*(?:Catalunya|Catalonia|Comunitat de Madrid|Andalucía|Valencia)$/i, "")
    .trim();
  return clean || formattedAddress;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeNameForDeduplication(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function deduplicateRestaurants(candidates: RestaurantCandidate[]): RestaurantCandidate[] {
  const result: RestaurantCandidate[] = [];

  for (const incoming of candidates) {
    const incomingNorm = normalizeNameForDeduplication(incoming.name);
    if (!incomingNorm) continue;

    let matchedIndex = -1;
    for (let i = 0; i < result.length; i++) {
      const existing = result[i]!;
      if (existing.id === incoming.id) {
        matchedIndex = i;
        break;
      }

      const existingNorm = normalizeNameForDeduplication(existing.name);
      const distMeters = haversineMeters(
        existing.latitude,
        existing.longitude,
        incoming.latitude,
        incoming.longitude,
      );

      // Deduplicate if places are within 35 meters and names match or share a significant substring
      const nameMatches =
        existingNorm === incomingNorm ||
        (existingNorm.length >= 4 &&
          incomingNorm.length >= 4 &&
          (existingNorm.includes(incomingNorm) || incomingNorm.includes(existingNorm)));

      if (distMeters <= 35 && nameMatches) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex >= 0) {
      const existing = result[matchedIndex]!;
      const prefersIncoming = incoming.provider === "curated" && existing.provider !== "curated";

      const merged: RestaurantCandidate = {
        ...(prefersIncoming ? incoming : existing),
        websiteUrl: existing.websiteUrl || incoming.websiteUrl,
        openingHours: existing.openingHours || incoming.openingHours,
        rating: existing.rating ?? incoming.rating,
        cuisine: existing.cuisine || incoming.cuisine,
        isVegan: existing.isVegan || incoming.isVegan,
        isVegetarian: existing.isVegetarian || incoming.isVegetarian,
        isOpenNow: existing.isOpenNow !== undefined ? existing.isOpenNow : incoming.isOpenNow,
        tags: Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])])),
      };
      result[matchedIndex] = merged;
    } else {
      result.push({ ...incoming });
    }
  }

  return result;
}

export function inferTagsAndVegan(input: {
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
  if (
    allText.includes("kebab") ||
    allText.includes("doner") ||
    allText.includes("döner") ||
    allText.includes("turkish") ||
    allText.includes("shawarma") ||
    cuisineLower.includes("kebab") ||
    cuisineLower.includes("turkish")
  ) {
    tags.add("kebab");
  }

  let inferredCuisine = curatedMatch?.cuisine ?? input.cuisine;
  if (!inferredCuisine) {
    if (tags.has("italian")) inferredCuisine = "italian";
    else if (tags.has("asian")) inferredCuisine = "asian";
    else if (tags.has("mediterranean")) inferredCuisine = "mediterranean";
    else if (tags.has("burger")) inferredCuisine = "burger";
    else if (tags.has("kebab")) inferredCuisine = "kebab";
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
          openingHours: tags.opening_hours,
          isOpenNow: evaluateOpeningHours(tags.opening_hours),
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

export interface RestaurantRoutesOptions {
  restaurantWebsiteFinder: RestaurantWebsiteFinder;
}

export async function restaurantRoutes(
  app: FastifyInstance,
  options: RestaurantRoutesOptions,
) {
  const { restaurantWebsiteFinder } = options;

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

  let geoapifyDisabledUntil = 0;

  // Curated restaurants endpoint
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
        return CURATED_RESTAURANTS.slice(0, limit).map((r) => ({
          ...r,
          isOpenNow: evaluateOpeningHours(r.openingHours),
        }));
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
      return candidates.slice(0, limit).map((item) => ({
        ...item.r,
        isOpenNow: evaluateOpeningHours(item.r.openingHours),
      }));
    },
  );

  // Restaurant search endpoint
  app.get<{
    Querystring: {
      q?: string;
      near?: string;
      autocomplete?: string;
      sessionToken?: string;
      latitude?: string;
      longitude?: string;
      radius?: string;
      bbox?: string;
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

      let parsedBbox: [number, number, number, number] | undefined; // [minLon, minLat, maxLon, maxLat]
      if (request.query.bbox) {
        const parts = request.query.bbox.split(",").map(Number);
        if (parts.length === 4 && parts.every((p) => Number.isFinite(p))) {
          parsedBbox = [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
        }
      }

      const cacheKey = [
        geoapifyKey ? "geoapify" : "openstreetmap",
        request.query.autocomplete === "true" ? "autocomplete" : "search",
        query.toLocaleLowerCase(),
        request.query.near?.trim().toLocaleLowerCase() ?? "",
        hasLocation ? `${latitude},${longitude}` : "",
        hasLocation ? String(radiusMeters) : "",
        request.query.bbox ?? "",
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
        !parsedBbox &&
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
      
      const isWithinLocation = (candLat: number, candLon: number, isLocality: boolean = false): boolean => {
        if (isLocality) return true;
        if (parsedBbox) {
          const [minLon, minLat, maxLon, maxLat] = parsedBbox;
          return candLon >= minLon && candLat >= minLat && candLon <= maxLon && candLat <= maxLat;
        }
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
        inferredNear = request.query.near?.trim() || (hasLocation ? undefined : defaultNear);
      } else {
        inferredNear = request.query.near?.trim() || undefined;
        geoapifyQuery = query;
      }

      function calculateRelevanceScore(
        searchQuery: string,
        cand: RestaurantCandidate,
        primaryNameQuery?: string,
        locationFilter?: string,
      ): number {
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .trim();

        const qNorm = normalize(searchQuery);
        const nameNorm = normalize(cand.name);
        const addrNorm = normalize(cand.address || "");
        const primNorm = primaryNameQuery ? normalize(primaryNameQuery) : "";
        const locNorm = locationFilter ? normalize(locationFilter) : "";

        let score = 0;

        // 1. Name Match (Checking primary name query first, then full query)
        const targetNameQuery = primNorm || qNorm;
        if (nameNorm === targetNameQuery || (primNorm && nameNorm === primNorm) || nameNorm === qNorm) {
          score += 2000;
        } else if (targetNameQuery && (nameNorm.startsWith(targetNameQuery) || nameNorm.endsWith(targetNameQuery))) {
          score += 1200;
        } else if (targetNameQuery && (nameNorm.includes(targetNameQuery) || targetNameQuery.includes(nameNorm))) {
          score += 800;
        }

        // Token-level name matching
        const qWords = (targetNameQuery || qNorm).split(/[\s,]+/).filter((w) => w.length > 1);
        for (const w of qWords) {
          if (nameNorm === w) {
            score += 400;
          } else if (nameNorm.includes(w)) {
            score += 200;
          }
        }

        // 2. Location / Address matching
        if (locNorm) {
          const locWords = locNorm.split(/[\s,]+/).filter((w) => w.length > 2);
          const matchesLocation = locWords.length > 0 && locWords.every((w) => addrNorm.includes(w));
          if (matchesLocation || addrNorm.includes(locNorm)) {
            score += 600;
          }
        }

        // 3. Proximity bonus (if GPS coordinates provided and no explicit distant city filter)
        if (hasLocation && !hasExplicitCity) {
          const dLat = (cand.latitude - latitude) * (Math.PI / 180);
          const dLon = (cand.longitude - longitude) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(latitude * (Math.PI / 180)) *
              Math.cos(cand.latitude * (Math.PI / 180)) *
              Math.sin(dLon / 2) ** 2;
          const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (distKm <= 1) score += 400;
          else if (distKm <= 5) score += 250;
          else if (distKm <= 15) score += 100;
          else if (distKm <= 50) score += 50;
        }

        // 4. Data Quality & Diet
        if (cand.websiteUrl) score += 150;
        if (cand.isVegan) score += 200;
        else if (cand.isVegetarian) score += 80;
        if (cand.rating && cand.rating >= 4) {
          score += Math.round(cand.rating * 30);
        }
        // City/locality relevance: exact match gets promoted based on hierarchical scale, partial match gets deprioritized
        if (cand.placeType === "city" || cand.placeType === "locality") {
          const isExactCityMatch = nameNorm === targetNameQuery || nameNorm === qNorm;
          if (isExactCityMatch) {
            const locKind = cand.tags?.[0] || "city";
            let localityBonus = 150;
            if (locKind === "city") localityBonus = 350;
            else if (locKind === "town") localityBonus = 250;
            else if (locKind === "village") localityBonus = 150;
            else if (locKind === "municipality") localityBonus = 100;
            else if (locKind === "suburb" || locKind === "borough") localityBonus = 50;

            score += localityBonus;
          } else {
            score -= 1500;
          }
        }

        return score;
      }

      const validGeoapifyCategories =
        "catering.restaurant,catering.cafe,catering.fast_food,catering.ice_cream,catering.bar,catering.pub,commercial.food_and_drink.bakery";

      if (geoapifyKey && Date.now() > geoapifyDisabledUntil) {
        // If specific name search: use Autocomplete endpoint for high precision POI keyword search
        // If spatial search: use Places endpoint with circle filter
        const isSpatialSearch = Boolean(parsedBbox) || (hasLocation && (isGenericQuery || Boolean(request.query.radius)));
        const url = new URL(
          isSpatialSearch
            ? "https://api.geoapify.com/v2/places"
            : "https://api.geoapify.com/v1/geocode/autocomplete",
        );

        if (isSpatialSearch) {
          url.searchParams.set("categories", validGeoapifyCategories);
          if (parsedBbox) {
            url.searchParams.set("filter", `rect:${parsedBbox[0]},${parsedBbox[1]},${parsedBbox[2]},${parsedBbox[3]}`);
          } else {
            url.searchParams.set("filter", `circle:${longitude},${latitude},${radiusMeters}`);
            url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
          }
          url.searchParams.set("limit", request.query.autocomplete === "true" ? "8" : "50");
        } else {
          url.searchParams.set("text", query);
          if (hasLocation && !inferredNear && !hasExplicitCity) {
            url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
          }
          url.searchParams.set("limit", request.query.autocomplete === "true" ? "8" : "20");
        }
        url.searchParams.set("apiKey", geoapifyKey);

        try {
          const response = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(3_500),
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
                  category?: string;
                  result_type?: string;
                  datasource?: {
                    raw?: {
                      opening_hours?: string;
                    };
                  };
                  catering?: {
                    cuisine?: string;
                    opening_hours?: string;
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
                if (!props?.name || !coords || coords.length < 2 || !Number.isFinite(coords[1]) || !Number.isFinite(coords[0])) {
                  return false;
                }

                // Only allow dining establishments or geographic localities (cities/towns/neighborhoods)
                const cats = props.categories ?? (props.category ? [props.category] : []);
                const nameLower = props.name.toLowerCase();
                const hasDiningNameKeyword = [
                  "restaurant", "restaurante", "cafe", "cafè", "café", "cafeteria", "bar", "pub",
                  "bistro", "bistrot", "bakery", "forn", "panaderia", "pizzeria", "burger", "sushi",
                  "tapas", "taverna", "taberna", "cerveceria", "gelateria", "ice cream", "heladeria",
                  "vegan", "vegà", "vegano", "vegetarian", "vegetarià", "vegetariano", "pa torrat"
                ].some((kw) => nameLower.includes(kw));

                const isDining =
                  cats.some((c) => c.startsWith("catering") || c.startsWith("commercial.food_and_drink")) ||
                  props.catering !== undefined ||
                  hasDiningNameKeyword;

                const isLocality =
                  props.result_type === "city" ||
                  props.result_type === "locality" ||
                  props.result_type === "suburb" ||
                  props.result_type === "administrative" ||
                  cats.includes("administrative");

                const isNonDiningAmenity =
                  cats.some((c) =>
                    c.includes("police") ||
                    c.includes("school") ||
                    c.includes("bank") ||
                    c.includes("parking") ||
                    c.includes("industrial")
                  );

                if (!isWithinLocation(coords[1], coords[0], isLocality)) return false;

                if ((!isDining && !isLocality) || (isNonDiningAmenity && !isDining)) {
                  return false;
                }
                return true;
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

                const categories = Array.isArray(props.categories) ? props.categories : [];
                const isLocality =
                  props.result_type === "city" ||
                  props.result_type === "locality" ||
                  props.result_type === "suburb" ||
                  props.result_type === "administrative" ||
                  categories.includes("administrative");

                const isVegan =
                  Boolean(props.catering?.diet?.vegan) ||
                  categories.includes("catering.restaurant.vegan") ||
                  categories.includes("diet.vegan");
                const isVegetarian =
                  Boolean(props.catering?.diet?.vegetarian) ||
                  categories.includes("catering.restaurant.vegetarian") ||
                  categories.includes("diet.vegetarian");

                const tags = new Set<string>();
                if (isLocality) {
                  tags.add("city");
                } else {
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
                }

                const openingHoursStr =
                  props.opening_hours ||
                  props.catering?.opening_hours ||
                  props.datasource?.raw?.opening_hours;

                return {
                  id: `geoapify-${placeId}`,
                  name: props.name!,
                  address: cleanShortAddress(
                    props.formatted || props.address_line2,
                    props.street,
                    props.housenumber,
                    props.city,
                  ),
                  latitude: lat,
                  longitude: lon,
                  websiteUrl,
                  mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
                  provider: "geoapify" as const,
                  cuisine: props.catering?.cuisine,
                  tags: Array.from(tags),
                  isVegan: isVegan || undefined,
                  isVegetarian: isVegetarian || undefined,
                  openingHours: openingHoursStr,
                  isOpenNow: evaluateOpeningHours(openingHoursStr),
                  placeType: isLocality ? ("city" as const) : ("restaurant" as const),
                };
              });

            if (candidates.length > 0) {
              const deduplicated = deduplicateRestaurants(candidates);
              const ranked = !isGenericQuery
                ? deduplicated.sort(
                    (a, b) =>
                      calculateRelevanceScore(query, b, geoapifyQuery, inferredNear) -
                      calculateRelevanceScore(query, a, geoapifyQuery, inferredNear),
                  )
                : deduplicated;

              restaurantSearchCache.set(cacheKey, {
                expiresAt: Date.now() + 15 * 60_000,
                results: ranked,
              });
              return ranked;
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

        const queryWords = normQuery.split(/[\s,]+/).filter((w) => w.length > 2);
        const wordsMatch = queryWords.length > 0 && queryWords.every((w) => rName.includes(w) || rAddr.includes(w));
        const nameMatch = (
          rName.includes(normQuery) ||
          normQuery.includes(rName) ||
          rName.includes(searchHead) ||
          searchHead.includes(rName) ||
          (rAddr.includes(normQuery) && rName.length > 2) ||
          wordsMatch
        );
        return nameMatch;
      }).map((r) => ({
        ...r,
        isOpenNow: evaluateOpeningHours(r.openingHours),
      }));

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
            const isDining = (p.osm_key === "amenity" || p.osm_key === "shop" || p.osm_key === "catering") && diningValues.has(p.osm_value ?? "");
            const isLocality = (p.osm_key === "place" || p.osm_key === "boundary") && ["city", "town", "village", "suburb", "municipality", "borough"].includes(p.osm_value ?? "");
            if (!isDining && !isLocality) continue;
            if (!isWithinLocation(lat, lon, isLocality)) continue;

            const streetAddress = [p.street, p.housenumber].filter(Boolean).join(" ");
            const locality = p.city || p.town || p.village;
            const fullAddress = [streetAddress, locality, p.state, p.country]
              .filter(Boolean)
              .join(", ");

            const localityKind = isLocality ? (p.osm_value ?? "city") : undefined;
            const { tags, isVegan, isVegetarian, cuisine, rating } = isLocality
              ? { tags: [localityKind || "city"], isVegan: undefined, isVegetarian: undefined, cuisine: undefined, rating: undefined }
              : inferTagsAndVegan({
                  name: p.name,
                  osm_key: p.osm_key,
                  osm_value: p.osm_value,
                });

            photonResults.push({
              id: `osm-${p.osm_type ?? "N"}-${p.osm_id ?? Math.floor(Math.random() * 1e8)}`,
              name: p.name,
              address: cleanShortAddress(fullAddress, p.street, p.housenumber, locality),
              latitude: lat,
              longitude: lon,
              mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
              provider: "openstreetmap" as const,
              cuisine,
              tags,
              isVegan,
              isVegetarian,
              rating,
              placeType: isLocality ? ("city" as const) : ("restaurant" as const),
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
        const ranked = !isGenericQuery
          ? deduplicated.sort(
              (a, b) =>
                calculateRelevanceScore(query, b, geoapifyQuery, inferredNear) -
                calculateRelevanceScore(query, a, geoapifyQuery, inferredNear),
            )
          : deduplicated;
        restaurantSearchCache.set(cacheKey, {
          expiresAt: Date.now() + 15 * 60_000,
          results: ranked,
        });
        return ranked;
      }

      // If autocomplete is requested, avoid hitting public Nominatim
      if (request.query.autocomplete === "true") {
        return [];
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
          "bakery", "food_court", "pastry", "coffee_shop", "deli", "vegetarian", "vegan",
          "biergarten", "tea_house", "creperie", "pizzeria"
        ]);
        const localityTypes = new Set([
          "city", "town", "village", "suburb", "municipality", "borough"
        ]);
        const nominatimCandidates: RestaurantCandidate[] = raw
          .filter((item) => {
            const isDining = diningTypes.has(item.type ?? "") || (item.category === "amenity" && diningTypes.has(item.type ?? ""));
            const isLocality = localityTypes.has(item.type ?? "") || item.category === "place" || item.category === "boundary";
            return isDining || isLocality;
          })
          .map((item) => {
            const isLocality = localityTypes.has(item.type ?? "") || item.category === "place" || item.category === "boundary";
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
            const localityKind = isLocality ? (item.type ?? "city") : undefined;
            const { tags, isVegan, isVegetarian, cuisine } = isLocality
              ? { tags: [localityKind || "city"], isVegan: undefined, isVegetarian: undefined, cuisine: undefined }
              : inferTagsAndVegan({
                  name: item.name ?? item.display_name,
                  cuisine: item.extratags?.cuisine,
                  type: item.type,
                });

            return {
              id: `${item.osm_type}-${item.osm_id}`,
              name: item.name?.trim() || item.display_name.split(",")[0]?.trim() || query,
              address: cleanShortAddress(item.display_name),
              latitude: Number(item.lat),
              longitude: Number(item.lon),
              websiteUrl,
              mapUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
              provider: "openstreetmap" as const,
              openingHours: item.extratags?.opening_hours,
              isOpenNow: evaluateOpeningHours(item.extratags?.opening_hours),
              cuisine,
              tags,
              isVegan,
              isVegetarian,
              placeType: isLocality ? ("city" as const) : ("restaurant" as const),
            };
          });

        const allResults = [...curatedMatches, ...photonResults, ...nominatimCandidates]
          .filter((item) => isWithinLocation(item.latitude, item.longitude, item.placeType === "city"));
        const finalResults = deduplicateRestaurants(allResults);
        const rankedResults = !isGenericQuery
          ? finalResults.sort(
              (a, b) =>
                calculateRelevanceScore(query, b, geoapifyQuery, inferredNear) -
                calculateRelevanceScore(query, a, geoapifyQuery, inferredNear),
            )
          : finalResults;

        restaurantSearchCache.set(cacheKey, {
          expiresAt: Date.now() + 15 * 60_000,
          results: rankedResults,
        });
        return rankedResults;
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

  // Restaurant resolve endpoint
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
}
