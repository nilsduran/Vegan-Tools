import {
  classifyIngredients,
  type Evidence,
  type ProductResult,
} from "@vegan-tools/domain";

interface ObfProduct {
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

interface ObfResponse {
  status?: number | string;
  product?: ObfProduct;
}

const CRUELTY_FREE_LABELS_MAP: Record<string, string> = {
  "en:not-tested-on-animals": "Not tested on animals",
  "en:cruelty-free": "Cruelty-Free",
  "en:leaping-bunny": "Leaping Bunny (CCIC)",
  "en:peta-cruelty-free": "PETA Cruelty-Free",
  "en:one-voice": "One Voice",
  "en:choose-cruelty-free": "Choose Cruelty-Free",
  "en:ihtn": "IHTN Cruelty-Free",
  "not-tested-on-animals": "Not tested on animals",
  "cruelty-free": "Cruelty-Free",
  "leaping-bunny": "Leaping Bunny (CCIC)",
  "peta-cruelty-free": "PETA Cruelty-Free",
};

export async function lookupOpenBeautyFacts(gtin: string): Promise<ProductResult | undefined> {
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

  const url = `https://world.openbeautyfacts.org/api/v2/product/${gtin}.json?fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.OBF_USER_AGENT ?? "VeganTools/0.1 (contact@vegantools.org)",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return undefined;
    const data = (await response.json()) as ObfResponse;
    if (!data.product || Number(data.status) !== 1) return undefined;

    const product = data.product;
    const capturedAt = product.last_modified_t
      ? new Date(product.last_modified_t * 1000).toISOString()
      : new Date().toISOString();

    const evidence: Evidence = {
      id: `obf-${gtin}`,
      sourceType: "open_beauty_facts",
      sourceName: "Open Beauty Facts",
      sourceUrl: `https://world.openbeautyfacts.org/product/${gtin}`,
      capturedAt,
      market: "ES",
      license: "ODbL 1.0 / CC BY-SA for images",
      ingredientsText: product.ingredients_text,
      traces: [],
    };

    const labels = product.labels_tags ?? [];
    const detectedCertifications: string[] = [];

    for (const label of labels) {
      const lower = label.toLowerCase();
      for (const [key, name] of Object.entries(CRUELTY_FREE_LABELS_MAP)) {
        if (lower === key || lower.endsWith(`:${key}`)) {
          if (!detectedCertifications.includes(name)) {
            detectedCertifications.push(name);
          }
        }
      }
    }

    const isCrueltyFree = detectedCertifications.length > 0;
    const rawIngredients = product.ingredients_text ?? "";
    const normalizedIngredients = rawIngredients
      .replace(/\bcera\s+alba\b/gi, "beeswax")
      .replace(/\bmel\b/gi, "honey")
      .replace(/\bci\s*75470\b/gi, "carmine")
      .replace(/\blanolin\s+cera\b/gi, "lanolin")
      .replace(/\bshellac\s+cera\b/gi, "shellac")
      .replace(/\bsnail\s+secretion\s+filtrate\b/gi, "snail mucin");

    const analysis = classifyIngredients(normalizedIngredients, {
      assurance: "external",
      verifiedVeganClaim: false,
    });
    evidence.traces = analysis.traces;

    let verdict = analysis.verdict;
    let reason = analysis.reason;

    const labelValues = labels.map((tag) => tag.replace(/^[a-z]{2}:/i, "").toLowerCase());
    const isMarkedVegan = labelValues.includes("vegan") || labelValues.some((l) => l.includes("vegan"));
    const hasConflictingIngredient = analysis.findings.some(
      (finding) =>
        finding.status === "non_vegetarian" || finding.status === "vegetarian",
    );

    if (isMarkedVegan && !hasConflictingIngredient) {
      verdict = "vegan";
      reason = "Open Beauty Facts marks this product as vegan and no animal-derived cosmetic ingredients were detected.";
    } else if (isCrueltyFree && verdict === "unknown") {
      verdict = "probably_vegan";
      reason = `Certified ${detectedCertifications.join(", ")}. No animal-derived ingredients were identified, but full formula verification is recommended.`;
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
      isBeautyProduct: true,
      crueltyFree: isCrueltyFree,
      crueltyFreeCertifications: detectedCertifications,
      labels: labels.map((l) => l.replace(/^[a-z]{2}:/i, "")),
    };
  } catch {
    return undefined;
  }
}
