/**
 * @file api.ts
 * @description Frontend HTTP client for the Vegan Tools backend API.
 * Encapsulates endpoints for product lookups, OCR extractions, menu parsing, restaurant searches,
 * and community review transactions with runtime Zod response validation and offline fallbacks.
 */

import {
  ingredientAnalysisSchema,
  menuDraftSchema,
  productResultSchema,
  recipeAnalysisSchema,
  restaurantCandidateSchema,
  restaurantReviewSchema,
  restaurantReviewStatsSchema,
  restaurantVisitLogSchema,
  saveVisitLogInputSchema,
  type CreateReviewRequest,
  type IngredientAnalysis,
  type MenuDraft,
  type MenuPatch,
  type ProductResult,
  type RecipeAnalysis,
  type RestaurantCandidate,
  type RestaurantReview,
  type RestaurantReviewStats,
  type RestaurantVisitLog,
  type SaveVisitLogInput,
  classifyIngredients as classifyIngredientsLocally,
  veganizeRecipe as veganizeRecipeLocally,
} from "@vegan-tools/domain";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168."));

const API_URL =
  import.meta.env.DEV && isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : (import.meta.env.VITE_API_URL ??
       (typeof window !== "undefined"
         ? `${window.location.protocol}//${window.location.hostname}:3001`
         : "http://localhost:3001"));

export function resolveApiUrl(path: string) {
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
}

export function sourcePdfPageUrl(path: string, page: number) {
  return `${resolveApiUrl(path).split("#")[0]}#page=${page}&zoom=page-width`;
}

function normalizeMenuError(menu: MenuDraft): MenuDraft {
  if (menu.error && /503|unavailable|high demand|overload/i.test(menu.error)) {
    return {
      ...menu,
      error: "The menu reader is temporarily busy. Please try again in a moment.",
    };
  }
  return menu;
}

async function checkedFetch(input: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  const url = `${API_URL}${input}`;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const details = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    throw new Error(
      `Could not reach the Vegan Tools API at ${API_URL}. Failed request: ${url}. Browser error: ${details}.`,
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (response.status === 404 && body.message?.startsWith("Route ")) {
      throw new Error(
        "The API server is out of date. Restart it and try again; this is not a missing-secret error.",
      );
    }
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  return response;
}

export async function getProduct(gtin: string): Promise<ProductResult> {
  const response = await checkedFetch(`/v1/products/${encodeURIComponent(gtin)}`);
  return productResultSchema.parse(await response.json());
}

export async function classifyIngredientList(
  ingredientsText: string,
): Promise<IngredientAnalysis> {
  return ingredientAnalysisSchema.parse(classifyIngredientsLocally(
    ingredientsText,
    { assurance: "label_based" },
  ));
}

export async function veganizeRecipe(
  recipeText: string,
  selections: Record<string, string> = {},
): Promise<RecipeAnalysis> {
  return recipeAnalysisSchema.parse(veganizeRecipeLocally(recipeText, selections));
}

export async function extractIngredientText(image: File): Promise<string> {
  const body = new FormData();
  body.append("image", image);
  const response = await checkedFetch("/v1/ingredients/extract", {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as { ingredientsText?: unknown };
  if (typeof payload.ingredientsText !== "string") {
    throw new Error("The photo did not return editable ingredient text.");
  }
  return payload.ingredientsText;
}

export async function extractProductIngredientText(gtin: string): Promise<string> {
  const response = await checkedFetch(
    `/v1/products/${encodeURIComponent(gtin)}/ingredients/extract`,
    { method: "POST" },
  );
  const payload = (await response.json()) as { ingredientsText?: unknown };
  if (typeof payload.ingredientsText !== "string") {
    throw new Error("The product photo did not return editable ingredient text.");
  }
  return payload.ingredientsText;
}

export async function createMenuAnalysis(files: File[]): Promise<MenuDraft> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const response = await checkedFetch("/v1/menus/analyses", { method: "POST", body });
  return menuDraftSchema.parse(await response.json());
}

const clientSearchCache = new Map<string, { data: RestaurantCandidate[]; expiresAt: number }>();

export function clearRestaurantSearchCache() {
  clientSearchCache.clear();
}

export async function searchRestaurants(
  query: string,
  options: {
    autocomplete?: boolean;
    sessionToken?: string;
    near?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    bbox?: [number, number, number, number] | string;
    location?: { latitude: number; longitude: number };
    signal?: AbortSignal;
  } = {},
): Promise<RestaurantCandidate[]> {
  const params = new URLSearchParams({ q: query });
  if (options.autocomplete) params.set("autocomplete", "true");
  if (options.sessionToken) params.set("sessionToken", options.sessionToken);
  if (options.near?.trim()) params.set("near", options.near.trim());
  const lat = options.latitude ?? options.location?.latitude;
  const lng = options.longitude ?? options.location?.longitude;
  if (typeof lat === "number" && typeof lng === "number") {
    params.set("latitude", lat.toFixed(5));
    params.set("longitude", lng.toFixed(5));
  }
  if (typeof options.radius === "number" && Number.isFinite(options.radius)) {
    params.set("radius", String(Math.round(options.radius / 250) * 250));
  }
  if (options.bbox) {
    const bboxStr = Array.isArray(options.bbox)
      ? options.bbox.map((b) => b.toFixed(6)).join(",")
      : options.bbox;
    params.set("bbox", bboxStr);
  }

  const cacheKey = params.toString();
  const cached = clientSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await checkedFetch(
    `/v1/restaurants/search?${params}`,
    { signal: options.signal },
  );
  const data = restaurantCandidateSchema.array().parse(await response.json());

  // Bounded cache with 5 minutes TTL
  if (clientSearchCache.size > 100) {
    const oldestKey = clientSearchCache.keys().next().value;
    if (oldestKey) clientSearchCache.delete(oldestKey);
  }
  clientSearchCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + 5 * 60_000,
  });

  return data;
}

export async function getRestaurantById(id: string): Promise<RestaurantCandidate | null> {
  if (!id) return null;
  try {
    const response = await checkedFetch(`/v1/restaurants/${encodeURIComponent(id)}`);
    return restaurantCandidateSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export async function getRestaurantMenu(id: string): Promise<MenuDraft | null> {
  if (!id) return null;
  try {
    const response = await checkedFetch(`/v1/restaurants/${encodeURIComponent(id)}/menu`);
    return menuDraftSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export async function resolveRestaurant(
  restaurant: RestaurantCandidate,
): Promise<RestaurantCandidate> {
  const response = await checkedFetch("/v1/restaurants/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(restaurant),
  });
  return restaurantCandidateSchema.parse(await response.json());
}

export async function createRestaurantMenuAnalysis(
  files: File[],
  restaurant?: RestaurantCandidate,
): Promise<MenuDraft> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  if (restaurant) {
    body.append("restaurant", JSON.stringify(restaurant));
    body.append("restaurantName", restaurant.name);
    if (restaurant.websiteUrl) body.append("sourceUrl", restaurant.websiteUrl);
  }
  const response = await checkedFetch("/v1/menus/analyses", { method: "POST", body });
  return menuDraftSchema.parse(await response.json());
}

export async function discoverRestaurantMenu(
  restaurant: RestaurantCandidate,
  websiteUrl: string,
): Promise<MenuDraft> {
  const response = await checkedFetch("/v1/menus/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      restaurant,
      restaurantName: restaurant.name,
      websiteUrl,
    }),
  });
  return menuDraftSchema.parse(await response.json());
}

export async function discoverMenuByUrl(
  websiteUrl: string,
  restaurantName?: string,
): Promise<MenuDraft> {
  const response = await checkedFetch("/v1/menus/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteUrl,
      restaurantName: restaurantName || "",
    }),
  });
  return menuDraftSchema.parse(await response.json());
}

export interface CachedRestaurantMenu {
  restaurant: RestaurantCandidate;
  menu: MenuDraft;
  savedAt: string;
}

export async function getRecentRestaurantMenus(): Promise<CachedRestaurantMenu[]> {
  const response = await checkedFetch("/v1/menus/recent");
  const value = await response.json();
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CachedRestaurantMenu[] => {
    const restaurant = restaurantCandidateSchema.safeParse(item?.restaurant);
    const menu = menuDraftSchema.safeParse(item?.menu);
    return restaurant.success && menu.success && typeof item?.savedAt === "string"
      ? [{ restaurant: restaurant.data, menu: menu.data, savedAt: item.savedAt }]
      : [];
  });
}

export async function getMenuDraft(id: string, token: string): Promise<MenuDraft> {
  const response = await checkedFetch(
    `/v1/menus/analyses/${id}?token=${encodeURIComponent(token)}`,
  );
  return normalizeMenuError(menuDraftSchema.parse(await response.json()));
}

export async function updateMenuDraft(
  id: string,
  token: string,
  patch: MenuPatch,
): Promise<MenuDraft> {
  const response = await checkedFetch(
    `/v1/menus/analyses/${id}?token=${encodeURIComponent(token)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return menuDraftSchema.parse(await response.json());
}

export async function publishMenu(id: string, token: string): Promise<MenuDraft> {
  const response = await checkedFetch(
    `/v1/menus/${id}/publish?token=${encodeURIComponent(token)}`,
    { method: "POST" },
  );
  return menuDraftSchema.parse(await response.json());
}

export async function reanalyzeMenuDraft(
  id: string,
  token?: string,
  options?: { highAccuracy?: boolean },
): Promise<MenuDraft> {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (options?.highAccuracy !== false) params.set("highAccuracy", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await checkedFetch(`/v1/menus/${id}/reanalyze${query}`, {
    method: "POST",
  });
  return normalizeMenuError(menuDraftSchema.parse(await response.json()));
}

export async function getPublicMenu(slug: string): Promise<MenuDraft> {
  const response = await checkedFetch(`/v1/public/menus/${encodeURIComponent(slug)}`);
  return menuDraftSchema.parse({
    ...(await response.json()),
    editToken: "public",
  });
}

export async function submitDishFeedback(
  menuId: string,
  dishId: string,
  feedback: {
    verdict: string;
    rawNote: string;
    targetModification?: "vegan" | "vegetarian";
  },
  token?: string,
): Promise<{ menu: MenuDraft; updatedDish: any }> {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  const response = await checkedFetch(
    `/v1/menus/${encodeURIComponent(menuId)}/dishes/${encodeURIComponent(dishId)}/feedback${query}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    },
  );
  const data = await response.json();
  return {
    menu: menuDraftSchema.parse(data.menu),
    updatedDish: data.updatedDish,
  };
}

export async function updateRestaurantNotes(
  menuId: string,
  rawNotes: string,
  token?: string,
): Promise<MenuDraft> {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  const response = await checkedFetch(
    `/v1/menus/${encodeURIComponent(menuId)}/notes${query}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes }),
    },
  );
  return menuDraftSchema.parse(await response.json());
}

export async function getApproximateLocation(): Promise<{
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}> {
  const response = await checkedFetch("/v1/location/approximate");
  return response.json();
}

export async function getCuratedRestaurants(coords?: {
  latitude: number;
  longitude: number;
}): Promise<RestaurantCandidate[]> {
  const query = coords
    ? `?latitude=${coords.latitude}&longitude=${coords.longitude}`
    : "";
  const response = await checkedFetch(`/v1/restaurants/curated${query}`);
  const data = await response.json();
  return Array.isArray(data)
    ? data.map((item) => restaurantCandidateSchema.parse(item))
    : [];
}

export async function getRestaurantReviews(restaurantId: string): Promise<{
  reviews: RestaurantReview[];
  stats: RestaurantReviewStats;
}> {
  const response = await checkedFetch(
    `/v1/restaurants/${encodeURIComponent(restaurantId)}/reviews`,
  );
  const json = (await response.json()) as {
    reviews: unknown[];
    stats: unknown;
  };
  return {
    reviews: Array.isArray(json.reviews)
      ? json.reviews.map((r) => restaurantReviewSchema.parse(r))
      : [],
    stats: restaurantReviewStatsSchema.parse(json.stats),
  };
}

export async function submitRestaurantReview(
  restaurantId: string,
  review: CreateReviewRequest,
  token: string,
): Promise<{
  review: RestaurantReview;
  stats: RestaurantReviewStats;
}> {
  const response = await checkedFetch(
    `/v1/restaurants/${encodeURIComponent(restaurantId)}/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(review),
    },
  );
  const json = (await response.json()) as {
    review: unknown;
    stats: unknown;
  };
  return {
    review: restaurantReviewSchema.parse(json.review),
    stats: restaurantReviewStatsSchema.parse(json.stats),
  };
}

export async function deleteRestaurantReview(
  restaurantId: string,
  token: string,
): Promise<{
  deleted: boolean;
  stats: RestaurantReviewStats;
}> {
  const response = await checkedFetch(
    `/v1/restaurants/${encodeURIComponent(restaurantId)}/reviews`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = (await response.json()) as {
    deleted: boolean;
    stats: unknown;
  };
  return {
    deleted: Boolean(json.deleted),
    stats: restaurantReviewStatsSchema.parse(json.stats),
  };
}

export async function getUserReviews(token: string): Promise<RestaurantReview[]> {
  const response = await checkedFetch("/v1/users/me/reviews", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = (await response.json()) as { reviews: unknown[] };
  if (!Array.isArray(json.reviews)) return [];
  return json.reviews.flatMap((r) => {
    const parsed = restaurantReviewSchema.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function fetchUserVisits(userId: string): Promise<RestaurantVisitLog[]> {
  try {
    const response = await checkedFetch(`/v1/users/${encodeURIComponent(userId)}/visits`, {
      method: "GET",
    });
    const json = (await response.json()) as { visits: unknown[] };
    if (!Array.isArray(json.visits)) return [];
    return json.visits.flatMap((v) => {
      const parsed = restaurantVisitLogSchema.safeParse(v);
      return parsed.success ? [parsed.data] : [];
    });
  } catch (error) {
    console.warn("Failed to fetch user visits from cloud:", error);
    return [];
  }
}

export async function saveUserVisitApi(
  visit: SaveVisitLogInput,
  token: string,
): Promise<RestaurantVisitLog> {
  const response = await checkedFetch(
    `/v1/users/${encodeURIComponent(visit.userId || "")}/visits`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(visit),
    },
  );
  const json = (await response.json()) as { visit: unknown };
  return restaurantVisitLogSchema.parse(json.visit);
}

export async function deleteUserVisitApi(
  visitId: string,
  userId: string,
  token: string,
): Promise<boolean> {
  const response = await checkedFetch(
    `/v1/users/${encodeURIComponent(userId)}/visits/${encodeURIComponent(visitId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = (await response.json()) as { ok?: boolean; success?: boolean };
  return Boolean(json.ok || json.success);
}

export async function fetchUserTop4(userId: string): Promise<RestaurantCandidate[]> {
  try {
    const response = await checkedFetch(`/v1/users/${encodeURIComponent(userId)}/top4`, {
      method: "GET",
    });
    const json = (await response.json()) as { restaurants: unknown[] };
    if (!Array.isArray(json.restaurants)) return [];
    return json.restaurants.flatMap((r) => {
      const parsed = restaurantCandidateSchema.safeParse(r);
      return parsed.success ? [parsed.data] : [];
    });
  } catch (error) {
    console.warn("Failed to fetch user top 4 from cloud:", error);
    return [];
  }
}

export async function saveUserTop4Api(
  userId: string,
  restaurants: RestaurantCandidate[],
  token: string,
): Promise<RestaurantCandidate[]> {
  const response = await checkedFetch(`/v1/users/${encodeURIComponent(userId)}/top4`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ restaurants: restaurants.slice(0, 4) }),
  });
  const json = (await response.json()) as { restaurants: unknown[] };
  if (!Array.isArray(json.restaurants)) return [];
  return json.restaurants.flatMap((r) => {
    const parsed = restaurantCandidateSchema.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });
}


