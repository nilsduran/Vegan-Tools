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

function isPlausibleOfficialWebsite(value: string) {
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

    const prompt = `Find the official website for this restaurant:
Name: ${restaurant.name}
Address: ${restaurant.address}
Coordinates: ${restaurant.latitude}, ${restaurant.longitude}
${excludedWebsiteUrl ? `Known incorrect or unreachable URL: ${excludedWebsiteUrl}` : ""}

Use web search to distinguish this exact location from similarly named businesses.
Search as a person would, using queries like "${restaurant.name} restaurant ${
      restaurant.address || "official website"
    }" or "${restaurant.name} carta menu web oficial". Prefer the restaurant's own domain or direct menu page, checking that the name and location match.
Return only the absolute official website URL. Do not return a social network,
directory, map, delivery platform, booking platform, or review site. Return NONE
if an official website cannot be verified.`;

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

    const match = responseText?.match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]
      ?.replace(/[.,;:]+$/, "");

    if (match && isPlausibleOfficialWebsite(match)) {
      try {
        websiteUrl = new URL(match).toString();
      } catch {
        websiteUrl = undefined;
      }
    }

    if (!websiteUrl && groundedUris.length > 0) {
      for (const groundedUri of groundedUris.slice(0, 8)) {
        const resolved = await resolveGroundedWebsite(groundedUri);
        if (resolved && isPlausibleOfficialWebsite(resolved)) {
          websiteUrl = resolved;
          break;
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
