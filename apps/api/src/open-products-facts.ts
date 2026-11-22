/**
 * @file open-products-facts.ts
 * @description Identifies non-food, non-cosmetic products (clothes, shoes, household goods)
 * through Open Products Facts.
 *
 * There is no reliable materials data for these products yet, so the verdict stays
 * "unknown" and the result tells people what to look for on the label. Saying nothing
 * is better than guessing (precautionary principle).
 */

import { CLASSIFIER_VERSION, type Evidence, type ProductResult } from "@vegan-tools/domain";

interface OpfResponse {
  status?: number | string;
  product?: {
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    last_modified_t?: number;
  };
}

export async function lookupOpenProductsFacts(gtin: string): Promise<ProductResult | undefined> {
  const fields = ["product_name", "brands", "image_front_url", "last_modified_t"].join(",");
  try {
    const response = await fetch(
      `https://world.openproductsfacts.org/api/v2/product/${gtin}.json?fields=${fields}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": process.env.OFF_USER_AGENT ?? "VeganTools/0.1 (contact@vegantools.org)",
        },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return undefined;
    const data = (await response.json()) as OpfResponse;
    if (!data.product || Number(data.status) !== 1 || !data.product.product_name) return undefined;

    const product = data.product;
    const capturedAt = product.last_modified_t
      ? new Date(product.last_modified_t * 1000).toISOString()
      : new Date().toISOString();
    const evidence: Evidence = {
      id: `opf-${gtin}`,
      sourceType: "automated_extraction",
      sourceName: "Open Products Facts",
      sourceUrl: `https://world.openproductsfacts.org/product/${gtin}`,
      capturedAt,
      market: "ES",
      license: "ODbL 1.0 / CC BY-SA for images",
      traces: [],
    };
    return {
      gtin,
      productName: product.product_name,
      brand: product.brands,
      imageUrl: product.image_front_url,
      verdict: "unknown",
      assurance: "external",
      definitive: false,
      reason:
        "This is not a food or cosmetic product, and its materials are not analysed yet. Check the label for leather, wool, silk, down, fur or animal-based glues.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: CLASSIFIER_VERSION,
      traces: [],
      verifiedAt: capturedAt,
      revision: 1,
      evidence: [evidence],
      category: "other",
    };
  } catch {
    return undefined;
  }
}
