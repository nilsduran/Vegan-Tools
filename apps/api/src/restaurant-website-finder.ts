/**
 * @file restaurant-website-finder.ts
 * @description Official restaurant domain resolver using Gemini Search Grounding.
 * Filters out third-party platforms (TripAdvisor, Instagram, Yelp) to discover authentic direct homepages.
 */

import { GoogleGenAI } from "@google/genai";
import type { RestaurantCandidate } from "@vegan-tools/domain";

export interface RestaurantWebsiteFinder {
  find(
    restaurant: RestaurantCandidate,
    excludedWebsiteUrl?: string,
  ): Promise<string | undefined>;
}

const NON_OFFICIAL_HOSTS = [
  "facebook.com",
  "foursquare.com",
  "google.com",
  "instagram.com",
  "opentable.com",
  "thefork.com",
  "tripadvisor.com",
  "ubereats.com",
  "yelp.com",
  "glovoapp.com",
  "just-eat.es",
  "deliveroo.es",
  "tiktok.com",
  "twitter.com",
  "x.com",
];

export function isPlausibleOfficialWebsite(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return !NON_OFFICIAL_HOSTS.some(
      (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`),
    );
  } catch {
    return false;
  }
}

export class GoogleSearchRestaurantWebsiteFinder
  implements RestaurantWebsiteFinder
{
  private readonly cache = new Map<
    string,
    { expiresAt: number; websiteUrl?: string }
  >();

  async find(restaurant: RestaurantCandidate, excludedWebsiteUrl?: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return undefined;

    const cacheKey = [
      restaurant.name.toLocaleLowerCase(),
      restaurant.address.toLocaleLowerCase(),
      excludedWebsiteUrl?.toLocaleLowerCase() ?? "",
    ].join("|");
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.websiteUrl;

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = [
      process.env.GEMINI_WEBSITE_MODEL,
      "gemini-3.1-flash-lite",
      "gemini-3.0-flash",
      "gemini-2.5-flash",
    ].filter(Boolean) as string[];

    const prompt = `Find the official website and online menu for this restaurant:
Name: ${restaurant.name}
Address: ${restaurant.address}
Coordinates: ${restaurant.latitude}, ${restaurant.longitude}
${excludedWebsiteUrl ? `Exclude this social media or directory URL: ${excludedWebsiteUrl}` : ""}

Use Google Search to find the restaurant's authentic homepage domain or online menu (e.g. searching "${restaurant.name} ${restaurant.address || ""}" or "${restaurant.name} carta menu web oficial").
Prefer the restaurant's standalone domain (e.g. .cat, .es, .com) rather than third-party platforms or social networks.
Return the official website URL if found, or NONE if no official website exists.`;

    let responseText: string | undefined;
    let groundedUris: string[] = [];

    for (const model of [...new Set(modelsToTry)]) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [prompt],
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0,
          },
        });
        responseText = response.text;
        groundedUris = response.candidates?.flatMap((candidate) =>
          candidate.groundingMetadata?.groundingChunks?.flatMap(
            (chunk) => chunk.web?.uri ? [chunk.web.uri] : [],
          ) ?? []
        ) ?? [];
        if (responseText || groundedUris.length > 0) break;
      } catch {
        // Try next model fallback
      }
    }

    let websiteUrl: string | undefined;

    // 1. Check real Google Search grounded chunks first
    if (groundedUris.length > 0) {
      for (const groundedUri of groundedUris.slice(0, 8)) {
        const resolved = await resolveGroundedWebsite(groundedUri);
        if (resolved && isPlausibleOfficialWebsite(resolved)) {
          websiteUrl = resolved;
          break;
        }
      }
    }

    // 2. Fall back to URL matched in the model response text
    if (!websiteUrl) {
      const match = responseText?.match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]
        ?.replace(/[.,;:]+$/, "");

      if (match && isPlausibleOfficialWebsite(match)) {
        try {
          websiteUrl = new URL(match).toString();
        } catch {
          websiteUrl = undefined;
        }
      }
    }

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + (websiteUrl ? 7 * 24 * 60 * 60_000 : 10 * 60_000),
      websiteUrl,
    });
    return websiteUrl;
  }
}

async function resolveGroundedWebsite(value: string) {
  try {
    const url = new URL(value);
    if (
      url.hostname !== "vertexaisearch.cloud.google.com" &&
      isPlausibleOfficialWebsite(url.toString())
    ) {
      return url.toString();
    }
    if (url.hostname !== "vertexaisearch.cloud.google.com") return undefined;
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(6_000),
    });
    const resolved = response.url;
    await response.body?.cancel();
    return isPlausibleOfficialWebsite(resolved)
      ? new URL(resolved).toString()
      : undefined;
  } catch {
    return undefined;
  }
}
