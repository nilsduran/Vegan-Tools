/**
 * @file UniversalResult.tsx
 * @description Result card of the universal scanner (photo or unknown link): what it is,
 * whether it involves animals, why, vegan alternatives and where the answer comes from.
 * Cosmetics also show whether the brand tests on animals.
 */

import type { ScanSubject, UniversalScanResult } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";
import { localizeGeneratedText } from "../generated-i18n";
import { BrandCrueltyFree } from "./BrandCrueltyFree";
import { EvidenceNote } from "./EvidenceNote";
import { IngredientFindings } from "./IngredientFindings";
import { VerdictBadge } from "./VerdictBadge";

const SUBJECT_LABELS: Record<ScanSubject, string> = {
  ingredient_label: "Ingredient label",
  food: "Food",
  cosmetic: "Cosmetics & Care",
  clothing: "Clothing and materials",
  activity: "Activity",
  place: "Place",
  menu: "Restaurant menu",
  other: "Other product",
};

/** Food and labels use dietary words (vegetarian...); everything else is vegan or not. */
export function isDietarySubject(subject: ScanSubject) {
  return subject === "food" || subject === "ingredient_label" || subject === "menu";
}

export function UniversalResult({ result }: { result: UniversalScanResult }) {
  const language = useLanguage();
  const fromRules = result.assurance === "label_based";
  return (
    <article className="product-result universal-result">
      <div className="product-result-body">
        <div className="universal-result-badges">
          <VerdictBadge verdict={result.verdict} context={isDietarySubject(result.subject) ? "diet" : "general"} />
          <span className="product-category-chip">{tx(SUBJECT_LABELS[result.subject])}</span>
        </div>
        {result.title && <h2>{result.title}</h2>}
        {result.brand && <p className="muted">{result.brand}</p>}
        {result.reason && (
          <p className="result-reason">{fromRules ? localizeGeneratedText(result.reason, language) : result.reason}</p>
        )}
        {result.concerns.length > 0 && (
          <ul className="universal-concerns">
            {result.concerns.map((concern) => <li key={concern}>{concern}</li>)}
          </ul>
        )}
        {result.findings.length > 0 && <IngredientFindings findings={result.findings} compact />}
        {result.traces.length > 0 && (
          <p className="trace-note">{tx("Allergen trace warning")}: {result.traces.join(", ")}</p>
        )}
        {result.alternatives.length > 0 && (
          <div className="universal-alternatives">
            <strong>{tx("Vegan alternatives")}</strong>
            <ul>{result.alternatives.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {result.subject === "cosmetic" && result.brand && <BrandCrueltyFree brand={result.brand} />}
        <EvidenceNote assurance={result.assurance} automatic={!fromRules} />
      </div>
    </article>
  );
}
