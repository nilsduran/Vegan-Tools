import {
  classifyIngredients,
  type Evidence,
  type ProductResult,
} from "@vegan-tools/domain";

interface OffProduct {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_ingredients_url?: string;
  ingredients_text?: string;
  ingredients_analysis_tags?: string[];
  labels_tags?: string[];
  categories_tags?: string[];
  categories?: string;
  last_modified_t?: number;
}

interface OffResponse {
  status?: string;
  product?: OffProduct;
}

export async function lookupOpenFoodFacts(gtin: string): Promise<ProductResult | undefined> {
  const fields = [
    "product_name",
    "brands",
    "image_front_url",
    "image_ingredients_url",
    "ingredients_text",
    "ingredients_analysis_tags",
    "labels_tags",
    "categories_tags",
    "categories",
    "last_modified_t",
  ].join(",");
  const url =
    `https://world.openfoodfacts.org/api/v3.6/product/${gtin}.json?fields=${fields}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        process.env.OFF_USER_AGENT ?? "VeganTools/0.1 (contact@example.com)",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return undefined;
  const data = (await response.json()) as OffResponse;
  if (!data.product) return undefined;

  const product = data.product;
  const capturedAt = product.last_modified_t
    ? new Date(product.last_modified_t * 1000).toISOString()
    : new Date().toISOString();
  const evidence: Evidence = {
    id: `off-${gtin}`,
    sourceType: "open_food_facts",
    sourceName: "Open Food Facts",
    sourceUrl: `https://world.openfoodfacts.org/product/${gtin}`,
    capturedAt,
    market: "ES",
    license: "ODbL 1.0 / CC BY-SA for images",
    ingredientsText: product.ingredients_text,
    traces: [],
  };

  const tags = product.ingredients_analysis_tags ?? [];
  const labels = product.labels_tags ?? [];
  const categories = product.categories_tags ?? [];
  const ingredients = product.ingredients_text ?? "";
  const analysis = classifyIngredients(ingredients, {
    assurance: "external",
    // OFF is useful evidence, but its community tags are not a trusted claim.
    verifiedVeganClaim: false,
  });
  evidence.traces = analysis.traces;

  let verdict = analysis.verdict;
  let reason = analysis.reason;
  const markedVegan =
    tags.some((tag) => tag.endsWith(":vegan")) ||
    labels.some((tag) => tag.includes("vegan"));
  const hasConflictingIngredient = analysis.findings.some(
    (finding) =>
      finding.status === "non_vegetarian" || finding.status === "vegetarian",
  );

  if (markedVegan && !hasConflictingIngredient) {
    verdict = "vegan";
    reason =
      "Open Food Facts marks this product as vegan and no conflicting ingredient was found.";
  } else if (
    categories.some((category) => category.includes("plant-based")) &&
    !hasConflictingIngredient &&
    analysis.verdict === "unknown"
  ) {
    verdict = "probably_vegan";
    reason =
      "Open Food Facts places this product in a plant-based category, but an ingredient list or vegan label is still needed for confirmation.";
  }

  return {
    gtin,
    productName: product.product_name,
    brand: product.brands,
    imageUrl: product.image_front_url,
    ingredientsImageUrl: product.image_ingredients_url,
    verdict,
    assurance: "external",
    definitive: false,
    reason,
    matchedIngredients: analysis.matchedIngredients,
    findings: analysis.findings,
    classifierVersion: analysis.classifierVersion,
    traces: analysis.traces,
    verifiedAt: capturedAt,
    revision: 1,
    evidence: [evidence],
  };
}
