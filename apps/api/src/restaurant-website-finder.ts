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
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_WEBSITE_MODEL ?? "gemini-2.5-flash",
      contents: [
        `Find the official website for this restaurant:
Name: ${restaurant.name}
Address: ${restaurant.address}
Coordinates: ${restaurant.latitude}, ${restaurant.longitude}
${excludedWebsiteUrl ? `Known incorrect or unreachable URL: ${excludedWebsiteUrl}` : ""}

Use web search to distinguish this exact location from similarly named businesses.
Search as a person would, using a query like "${restaurant.name} restaurant ${
          restaurant.address || "official website"
        }". Prefer the restaurant's own domain and check that the name and location match.
Return only the absolute official website URL. Do not return a social network,
directory, map, delivery platform, booking platform, or review site. Return NONE
if an official website cannot be verified.`,
      ],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0,
      },
    });

    const match = response.text?.match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]
      ?.replace(/[.,;:]+$/, "");
    const groundedUris = response.candidates?.flatMap((candidate) =>
      candidate.groundingMetadata?.groundingChunks?.flatMap(
        (chunk) => chunk.web?.uri ? [chunk.web.uri] : [],
      ) ?? []
    ) ?? [];
    let websiteUrl = groundedUris.length > 0 &&
        match &&
        isPlausibleOfficialWebsite(match)
      ? new URL(match).toString()
      : undefined;
    if (!websiteUrl) {
      for (const groundedUri of groundedUris.slice(0, 5)) {
        const resolved = await resolveGroundedWebsite(groundedUri);
        if (resolved) {
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
