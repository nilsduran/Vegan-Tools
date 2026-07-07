import {
  ingredientAnalysisSchema,
  menuDraftSchema,
  productResultSchema,
  recipeAnalysisSchema,
  restaurantCandidateSchema,
  type IngredientAnalysis,
  type MenuDraft,
  type MenuPatch,
  type ProductResult,
  type RecipeAnalysis,
  type RestaurantCandidate,
  classifyIngredients as classifyIngredientsLocally,
  veganizeRecipe as veganizeRecipeLocally,
} from "@vegan-tools/domain";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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
  try {
    response = await fetch(`${API_URL}${input}`, init);
  } catch {
    throw new Error(
      `Could not reach the Vegan Tools API at ${API_URL}. Check that the API is deployed, awake, and allows this website origin.`,
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

export async function searchRestaurants(
  query: string,
  options: {
    autocomplete?: boolean;
    sessionToken?: string;
    near?: string;
    location?: { latitude: number; longitude: number };
    signal?: AbortSignal;
  } = {},
): Promise<RestaurantCandidate[]> {
  const params = new URLSearchParams({ q: query });
  if (options.autocomplete) params.set("autocomplete", "true");
  if (options.sessionToken) params.set("sessionToken", options.sessionToken);
  if (options.near?.trim()) params.set("near", options.near.trim());
  if (options.location) {
    params.set("latitude", String(options.location.latitude));
    params.set("longitude", String(options.location.longitude));
  }
  const response = await checkedFetch(
    `/v1/restaurants/search?${params}`,
    { signal: options.signal },
  );
  return restaurantCandidateSchema.array().parse(await response.json());
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

export async function getPublicMenu(slug: string): Promise<MenuDraft> {
  const response = await checkedFetch(`/v1/public/menus/${encodeURIComponent(slug)}`);
  return menuDraftSchema.parse({
    ...(await response.json()),
    editToken: "public",
  });
}
