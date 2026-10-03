/**
 * @file ingredient-normalizer.ts
 * @description Standardized food formulation text normalization pipeline (Phase 1).
 * Cleans packaging declarations, removes non-informative percentage tokens,
 * canonicalizes E-numbers and separators, and isolates allergen traces.
 */

import { splitTraces } from "./classifier.js";

export interface NormalizedIngredientResult {
  /** The clean, normalized ingredient text suitable for ML tokenization and regex scanning */
  cleanText: string;
  /** Extracted precautionary allergen traces (e.g. "May contain traces of milk") */
  traces: string[];
  /** Whether the text originally contained precautionary traces */
  hadTraces: boolean;
}

/**
 * Normalizes packaging ingredient text for ML models and dictionary lookups:
 * 1. Strips precautionary allergen warnings into a separate traces array.
 * 2. Removes leading "Ingredients:" language prefixes.
 * 3. Removes percentage specifications (e.g. "(65%)", " 12.5% ", "[0.2%]") which waste model context.
 * 4. Canonicalizes European E-numbers (e.g. "E 471", "e-471" -> "E471").
 * 5. Normalizes diverse bullet/separator characters (•, ;, |, ~) to clean commas.
 * 6. Collapses redundant whitespace and commas.
 */
export function normalizeIngredientText(rawText: string): NormalizedIngredientResult {
  if (!rawText || typeof rawText !== "string") {
    return { cleanText: "", traces: [], hadTraces: false };
  }

  // 1. Isolate precautionary allergen traces
  const { ingredients, traces } = splitTraces(rawText);

  let text = ingredients;

  // 2. Remove leading label prefixes (multilingual)
  text = text.replace(
    /^\s*(?:ingredients?|ingredientes?|zutaten|ingr[eé]dients?|ingredienti|composici[oó]n?|zloženie|składniki)\s*[:\-–]\s*/i,
    "",
  );

  // 3. Remove percentage declarations: '(65%)', '[12.5%]', ' ( 0.5% ) ', ' 10% ', '1.5%'
  text = text.replace(/\s*[\(\[]\s*\d+(?:[.,]\d+)?\s*%\s*[\)\]]/g, "");
  text = text.replace(/\s*\b\d+(?:[.,]\d+)?\s*%/g, "");

  // 4. Canonicalize E-numbers: 'E 471', 'e-471', 'E - 120' -> 'E471', 'E120'
  text = text.replace(/\b[eE]\s*[-–—]?\s*(\d{3,4}[a-z]?)\b/g, "E$1");

  // 5. Standardize bullet points and separators to clean commas, preserving Catalan ela geminada (l·l)
  text = text.replace(/([lL])[\u00B7·•]([lL])/g, "$1__ELA_GEMINADA__$2");
  text = text.replace(/[\u2022\u2023\u25E6\u2043\u2219•|;~*·]+/g, ", ");
  text = text.replace(/__ELA_GEMINADA__/g, "·");

  // 6. Clean whitespace and comma chaining
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\s*,\s*/g, ", ");
  text = text.replace(/(?:,\s*)+/g, ", ");

  // 7. Strip leading/trailing punctuation
  text = text.replace(/^[\s,.:;]+|[\s,.:;]+$/g, "").trim();

  return {
    cleanText: text,
    traces,
    hadTraces: traces.length > 0,
  };
}
