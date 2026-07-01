import type { IngredientFinding } from "@vegan-tools/domain";

export function IngredientFindings({ findings }: { findings: IngredientFinding[] }) {
  if (findings.length === 0) return null;

  return (
    <div className="finding-list">
      {findings.map((finding) => (
        <article key={finding.id} className={`finding finding-${finding.status}`}>
          <div className="finding-heading">
            <strong>{finding.name}</strong>
            {finding.eNumber && <span>{finding.eNumber}</span>}
          </div>
          <p>{finding.reason}</p>
          <small>Matched “{finding.matchedAlias}”</small>
        </article>
      ))}
    </div>
  );
}
