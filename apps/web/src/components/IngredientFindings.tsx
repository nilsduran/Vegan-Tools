import type { IngredientFinding } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";
import {
  localizeIngredientName,
  localizeIngredientReason,
} from "../generated-i18n";

export function IngredientFindings({
  findings,
  compact = false,
}: {
  findings: IngredientFinding[];
  compact?: boolean;
}) {
  const language = useLanguage();
  if (findings.length === 0) return null;

  if (compact) {
    return (
      <ul className="compact-finding-list">
        {findings.map((finding) => (
          <li key={finding.id}>
            <strong>{localizeIngredientName(finding, language)}{finding.eNumber ? ` (${finding.eNumber})` : ""}</strong>
            <span>{tx("Matched")} “{finding.matchedAlias}”</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="finding-list">
      {findings.map((finding) => (
        <article key={finding.id} className={`finding finding-${finding.status}`}>
          <div className="finding-heading">
            <strong>{localizeIngredientName(finding, language)}</strong>
            {finding.eNumber && <span>{finding.eNumber}</span>}
          </div>
          <p>{localizeIngredientReason(finding, language)}</p>
          <small>{tx("Matched")} “{finding.matchedAlias}”</small>
        </article>
      ))}
    </div>
  );
}
