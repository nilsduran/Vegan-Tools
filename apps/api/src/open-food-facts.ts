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
  ingredients_text_ca?: string;
  ingredients_text_es?: string;
  ingredients_text_en?: string;
  ingredients_text_fr?: string;
  /** Declared allergens (contained, not traces): a strong signal when ingredient texts are incomplete. */
  allergens_tags?: string[];
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

function inferFromProductIdentity(product: OffProduct): {
  verdict: ProductResult["verdict"];
  reason: string;
} | undefined {
  const name = (product.product_name ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  const categories = (product.categories_tags ?? [])
    .map((category) => category.replace(/^[a-z]{2}:/i, "").toLowerCase());

  const wholeProduceNames =
    /^(?:an?\s+)?(?:apple|pomme|poma|manzana|banana|orange|taronja|naranja|pear|poire|pera|peach|peche|pressec|tomato|tomate|tomaquet|carrot|carotte|pastanaga)$/;
  const wholeProduceCategories = categories.some((category) =>
    /^(?:apples|bananas|oranges|pears|peaches|fresh-fruits|fresh-vegetables)$/.test(category),
  );
  if (wholeProduceNames.test(name) || wholeProduceCategories) {
    return {
      verdict: "vegan",
      reason: "This is an unprocessed fruit or vegetable.",
    };
  }

  if (/\b(?:apple|pomme|poma|manzana)\b.*\b(?:pie|tart|cake|pastry|pastis|tarta|tourte)\b/.test(name)) {
    return {
      verdict: "probably_vegetarian",
      reason: "Apple pastries commonly contain dairy or egg and may occasionally use other animal fats.",
    };
  }

  if (/\b(?:dark chocolate|chocolat noir|xocolata negra|chocolate negro)\b/.test(name)) {
    return {
      verdict: "probably_vegan",
      reason: "Dark chocolate is often vegan, but some recipes contain milk or other animal-derived ingredients.",
    };
  }
  return undefined;
}

const VERDICT_SEVERITY: Record<ProductResult["verdict"], number> = {
  non_vegetarian: 5,
  vegetarian: 4,
  probably_vegetarian: 3,
  unknown: 2,
  probably_vegan: 1,
  vegan: 0,
};

/**
 * Community ingredient texts are often incomplete in one language (Nutella's default
 * text was just "sugar, palm oil"). Every language is classified and the most
 * restrictive result wins; ties go to the longest text.
 */
/**
 * Cosmetics added to Open Food Facts by mistake (a Dutch sunscreen filed as
 * food, with "nl:Zonnebrand" categories). Categories are free text in any
 * language, so they are matched by word, without accents.
 */
const COSMETIC_CATEGORY = /(?:^|-)(?:beauty|cosmetics?|cosmetiques?|cosmetica|cosmetica|skin-?care|sun-?(?:protection|screen|cream|care)|personal-care|body-care|face-care|hygiene|shampoos?|deodorants?|toothpastes?|soaps?|verzorging|huidverzorging|zonbescherming|zonnebrand|korperpflege|sonnenschutz|hautpflege|protector-solar|proteccion-solar|proteccio-solar|cuidado-personal|higiene|soins?|creme-solaire|protection-solaire)(?:-|$)/;
const COSMETIC_NAME = /\b(?:spf\s?\d+|sunscreen|sun cream|crema solar|protector solar|creme solaire|zonnebrand|shampoo|champu|xampu|deodorant|desodorante?|toothpaste|pasta de dents|pasta de dientes)\b/;

export function looksLikeCosmetic(product: Pick<OffProduct, "product_name" | "categories_tags">): boolean {
  const plain = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const categories = (product.categories_tags ?? []).map((tag) => plain(tag.replace(/^[a-z]{2}:/i, "")).trim().replace(/\s+/g, "-"));
  return categories.some((category) => COSMETIC_CATEGORY.test(category)) || COSMETIC_NAME.test(plain(product.product_name ?? ""));
}

export function mostRestrictiveIngredients(product: OffProduct): { text: string; analysis: ReturnType<typeof classifyIngredients> } {
  const texts = [
    product.ingredients_text,
    product.ingredients_text_ca,
    product.ingredients_text_es,
    product.ingredients_text_en,
    product.ingredients_text_fr,
  ].filter((text, index, all): text is string => Boolean(text?.trim()) && all.indexOf(text) === index);
  if (texts.length === 0) texts.push("");
  const classified = texts.map((text) => ({
    text,
    analysis: classifyIngredients(text, {
      assurance: "external",
      // OFF is useful evidence, but its community tags are not a trusted claim.
      verifiedVeganClaim: false,
    }),
  }));
  return classified.reduce((best, next) => {
    const difference = VERDICT_SEVERITY[next.analysis.verdict] - VERDICT_SEVERITY[best.analysis.verdict];
    if (difference > 0) return next;
    if (difference === 0 && next.text.length > best.text.length) return next;
    return best;
  });
}

/** OFF sometimes answers a burst of requests with an error page: one retry after a pause. */
async function fetchOffJson(url: string): Promise<OffResponse | undefined> {
  for (const delay of [0, 1_200]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": process.env.OFF_USER_AGENT ?? "VeganTools/0.1 (contact@example.com)",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 404) return undefined;
      if (!response.ok) continue;
      return (await response.json()) as OffResponse;
    } catch {
      // Non-JSON error page or timeout: retry once.
    }
  }
  return undefined;
}

export async function lookupOpenFoodFacts(gtin: string): Promise<ProductResult | undefined> {
  const fields = [
    "product_name",
    "brands",
    "image_front_url",
    "image_ingredients_url",
    "ingredients_text",
    "ingredients_text_ca",
    "ingredients_text_es",
    "ingredients_text_en",
    "ingredients_text_fr",
    "allergens_tags",
    "ingredients_analysis_tags",
    "labels_tags",
    "categories_tags",
    "categories",
    "last_modified_t",
  ].join(",");
  const url =
    `https://world.openfoodfacts.org/api/v3.6/product/${gtin}.json?fields=${fields}`;
  const data = await fetchOffJson(url);
  if (!data?.product) return undefined;

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
  const { text: ingredients, analysis } = mostRestrictiveIngredients(product);
  evidence.ingredientsText = ingredients || product.ingredients_text;
  evidence.traces = analysis.traces;
  const allergens = (product.allergens_tags ?? []).map((tag) => tag.replace(/^[a-z]{2}:/i, ""));
  const declaresSeafood = allergens.some((tag) => ["fish", "crustaceans", "molluscs"].includes(tag));
  const declaresMilkOrEgg = allergens.some((tag) => ["milk", "eggs"].includes(tag));

  let verdict = analysis.verdict;
  let reason = analysis.reason;
  const tagValues = tags.map((tag) => tag.replace(/^[a-z]{2}:/i, ""));
  const labelValues = labels.map((tag) => tag.replace(/^[a-z]{2}:/i, ""));
  const markedNonVegetarian = tagValues.includes("non-vegetarian");
  const markedNonVegan = tagValues.includes("non-vegan");
  const markedVegan =
    tagValues.includes("vegan") ||
    labelValues.includes("vegan");
  const identityInference =
    analysis.verdict === "unknown" ? inferFromProductIdentity(product) : undefined;
  const hasConflictingIngredient = analysis.findings.some(
    (finding) =>
      finding.status === "non_vegetarian" || finding.status === "vegetarian",
  );

  if (declaresSeafood && analysis.verdict !== "non_vegetarian") {
    verdict = "non_vegetarian";
    reason = "The declared allergens include fish or shellfish.";
  } else if (declaresMilkOrEgg && VERDICT_SEVERITY[analysis.verdict] < VERDICT_SEVERITY.probably_vegetarian) {
    verdict = markedNonVegetarian ? "non_vegetarian" : "probably_vegetarian";
    reason = "The declared allergens include milk or eggs, so it is not vegan.";
  } else if (markedNonVegetarian && analysis.verdict !== "non_vegetarian") {
    verdict = "non_vegetarian";
    reason = "Open Food Facts marks this product as non-vegetarian.";
  } else if (
    markedNonVegan &&
    (analysis.verdict === "unknown" || analysis.verdict === "probably_vegan")
  ) {
    verdict = "probably_vegetarian";
    reason =
      "Open Food Facts marks this product as non-vegan, but the available data does not establish whether it is vegetarian.";
  } else if (markedVegan && !markedNonVegan && !hasConflictingIngredient) {
    verdict = "vegan";
    reason =
      "Open Food Facts marks this product as vegan and no conflicting ingredient was found.";
  } else if (identityInference) {
    verdict = identityInference.verdict;
    reason = identityInference.reason;
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
    category: looksLikeCosmetic(product) ? "beauty" : "food",
  };
}
