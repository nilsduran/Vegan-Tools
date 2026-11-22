/**
 * @file product-resolver.ts
 * @description Turns a barcode into the best answer available, for any product.
 *
 * 1. Every Open Facts database is asked; their records are combined, and a record
 *    with an ingredient list wins over an empty one (products are often filed in the
 *    wrong database, e.g. a sunscreen in Open Food Facts with no ingredients).
 * 2. When no record has ingredients, or no database knows the barcode, a web search
 *    identifies the product and looks for its published ingredient list.
 * 3. An ingredient list, wherever it comes from, is judged by the rule engine. A list
 *    found on the web without any source is discarded. Web results are never
 *    definitive and are marked as automatic.
 */

import {
  capAutomatedVerdict,
  classifyIngredients,
  CLASSIFIER_VERSION,
  type Evidence,
  type ProductResult,
} from "@vegan-tools/domain";
import type { ProductResearch } from "./universal-analyzer.js";

/** Cosmetic INCI names that the food-oriented dictionary would not recognise. */
export function normalizeCosmeticIngredients(text: string): string {
  return text
    .replace(/\bcera\s+alba\b/gi, "beeswax")
    .replace(/\bmel\b/gi, "honey")
    .replace(/\bci\s*75470\b/gi, "carmine")
    .replace(/\blanolin\s+cera\b/gi, "lanolin")
    .replace(/\bshellac\s+cera\b/gi, "shellac")
    .replace(/\bsnail\s+secretion\s+filtrate\b/gi, "snail mucin");
}

const SEVERITY: Record<ProductResult["verdict"], number> = {
  non_vegetarian: 5,
  vegetarian: 4,
  probably_vegetarian: 3,
  unknown: 2,
  probably_vegan: 1,
  vegan: 0,
};

export function hasIngredientData(product: ProductResult): boolean {
  return product.evidence.some((evidence) => Boolean(evidence.ingredientsText?.trim())) || product.findings.length > 0;
}

/**
 * Picks the record to answer with. Records with ingredient data win; among them the
 * most restrictive verdict wins (precaution). Without data, the first record found
 * (food, beauty, products, in that order) only provides the product's identity.
 */
export function pickPrimaryRecord(records: ProductResult[]): ProductResult | undefined {
  const withData = records.filter(hasIngredientData);
  if (withData.length > 0) {
    return withData.reduce((best, next) => (SEVERITY[next.verdict] > SEVERITY[best.verdict] ? next : best));
  }
  return records.find((record) => record.verdict !== "unknown") ?? records[0];
}

/** Whether a web search can improve the answer. */
export function needsResearch(primary: ProductResult | undefined): boolean {
  return !primary || !hasIngredientData(primary);
}

function categoryOf(research: ProductResearch): ProductResult["category"] {
  if (research.category === "food") return "food";
  if (research.category === "cosmetic") return "beauty";
  return "other";
}

/** Combines what the databases knew with what the web search found. */
export function applyResearch(gtin: string, base: ProductResult | undefined, research: ProductResearch): ProductResult | undefined {
  if (!research.found && !base) return undefined;

  const category = research.found ? categoryOf(research) : base?.category;
  const evidence: Evidence[] = [...(base?.evidence ?? [])];
  const webSource = research.sources[0];
  const product: ProductResult = {
    gtin,
    productName: base?.productName || research.productName,
    brand: base?.brand || research.brand,
    imageUrl: base?.imageUrl,
    ingredientsImageUrl: base?.ingredientsImageUrl,
    verdict: base?.verdict ?? "unknown",
    assurance: base?.assurance ?? "unverified",
    definitive: false,
    reason: base?.reason ?? "No trustworthy product evidence was found. Scan the current ingredient label.",
    matchedIngredients: base?.matchedIngredients ?? [],
    findings: base?.findings ?? [],
    classifierVersion: CLASSIFIER_VERSION,
    traces: base?.traces ?? [],
    verifiedAt: base?.verifiedAt,
    revision: 1,
    evidence,
    category,
    isBeautyProduct: category === "beauty" || base?.isBeautyProduct,
    crueltyFree: base?.crueltyFree,
    crueltyFreeCertifications: base?.crueltyFreeCertifications,
    labels: base?.labels,
  };

  const listFound = Boolean(research.ingredientsText?.trim()) && research.sources.length > 0;
  if (listFound && webSource) {
    const text = research.ingredientsText!.trim();
    const analysis = classifyIngredients(category === "beauty" ? normalizeCosmeticIngredients(text) : text, {
      assurance: "unverified",
      verifiedVeganClaim: false,
    });
    evidence.push({
      id: `web-${gtin}`,
      sourceType: "automated_extraction",
      sourceName: webSource.title || new URL(webSource.url).hostname,
      sourceUrl: webSource.url,
      capturedAt: new Date().toISOString(),
      market: "ES",
      ingredientsText: text,
      traces: analysis.traces,
    });
    let verdict = analysis.verdict;
    let reason = analysis.reason;
    const onlyDoubtful = !analysis.findings.some((finding) => finding.status === "vegetarian" || finding.status === "non_vegetarian");
    if (research.manufacturerVeganClaim && onlyDoubtful && (verdict === "probably_vegan" || verdict === "probably_vegetarian")) {
      // A manufacturer statement outranks dual-origin doubts (glycerin, E471), but it was
      // found automatically, so the answer stays "probably".
      verdict = "probably_vegan";
      reason = "The ingredient list found on the web has no clearly animal-derived ingredient, and the manufacturer describes the product as vegan.";
    }
    if (verdict === "vegan") verdict = "probably_vegan";
    return {
      ...product,
      verdict,
      reason,
      assurance: "unverified",
      matchedIngredients: analysis.matchedIngredients,
      findings: analysis.findings,
      traces: analysis.traces,
    };
  }

  if (research.found && webSource) {
    evidence.push({
      id: `web-${gtin}`,
      sourceType: "automated_extraction",
      sourceName: webSource.title || new URL(webSource.url).hostname,
      sourceUrl: webSource.url,
      capturedAt: new Date().toISOString(),
      market: "ES",
      traces: [],
    });
    if (research.manufacturerVeganClaim) {
      return {
        ...product,
        verdict: "probably_vegan",
        reason: "The manufacturer describes the product as vegan, but its ingredient list could not be checked.",
        assurance: "unverified",
      };
    }
    // Products without ingredient lists (clothing, household goods): automatic judgement of materials.
    const verdict = capAutomatedVerdict(research.verdict ?? "unknown");
    if (verdict !== "unknown") {
      return { ...product, verdict, reason: research.reason || product.reason, assurance: "unverified" };
    }
  }
  return product;
}
