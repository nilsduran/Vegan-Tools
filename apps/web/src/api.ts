import {
  ingredientAnalysisSchema,
  menuDraftSchema,
  productResultSchema,
  recipeAnalysisSchema,
  type IngredientAnalysis,
  type MenuDraft,
  type MenuPatch,
  type ProductResult,
  type RecipeAnalysis,
  classifyIngredients as classifyIngredientsLocally,
  veganizeRecipe as veganizeRecipeLocally,
} from "@vegan-tools/domain";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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
  const response = await fetch(`${API_URL}${input}`, init);
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
  const product = productResultSchema.parse(await response.json());
  const isLegacyOffVeganResult =
    product.verdict === "unknown" &&
    product.evidence.some((item) => item.sourceName === "Open Food Facts") &&
    /(?:marks|label).{0,40}vegan|vegan.{0,20}(?:mark|label)/i.test(product.reason);
  return isLegacyOffVeganResult
    ? {
        ...product,
        verdict: "vegan",
        reason:
          "Open Food Facts marks this product as vegan and no conflicting ingredient was found.",
      }
    : product;
}

export async function classifyIngredientList(
  ingredientsText: string,
): Promise<IngredientAnalysis> {
  return ingredientAnalysisSchema.parse(classifyIngredientsLocally(
    ingredientsText,
    { assurance: "label_based" },
  ));
}

export async function veganizeRecipe(recipeText: string): Promise<RecipeAnalysis> {
  return recipeAnalysisSchema.parse(veganizeRecipeLocally(recipeText));
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
