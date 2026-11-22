/**
 * @file EvidenceNote.tsx
 * @description Shows where a verdict comes from, following the evidence hierarchy of
 * docs/architecture.md §6: certification > manufacturer > package label > open
 * database > automatic analysis. People should see how much to trust each answer.
 */

import type { Assurance, Evidence } from "@vegan-tools/domain";
import { BadgeCheck, Database, Factory, ScanText, ShieldQuestion, Sparkles } from "lucide-react";
import { tx } from "../i18n";

const LEVELS: Record<Assurance, { label: string; detail: string; Icon: typeof BadgeCheck }> = {
  certified: {
    label: "Vegan certification",
    detail: "A recognised vegan certification backs this result.",
    Icon: BadgeCheck,
  },
  manufacturer: {
    label: "Manufacturer statement",
    detail: "Based on the manufacturer's current statement.",
    Icon: Factory,
  },
  label_based: {
    label: "Ingredient label",
    detail: "Based on the ingredient list you checked. Automatic reading, not a certification.",
    Icon: ScanText,
  },
  external: {
    label: "Community database",
    detail: "Based on open, community-maintained data. Check the package when it matters.",
    Icon: Database,
  },
  unverified: {
    label: "No verified source",
    detail: "No trustworthy source was found for this product.",
    Icon: ShieldQuestion,
  },
};

const AUTOMATIC = {
  label: "Automatic recognition",
  detail: "Found automatically (photo, web page or web search). It is not a verification: check the label or ask when it matters.",
  Icon: Sparkles,
};

export function EvidenceNote({
  assurance,
  evidence = [],
  automatic = false,
}: {
  assurance: Assurance;
  evidence?: Evidence[];
  /** Answer produced by AI recognition rather than by a source or the rule engine. */
  automatic?: boolean;
}) {
  const { label, detail, Icon } = automatic ? AUTOMATIC : LEVELS[assurance];
  const source = assurance === "external" ? evidence[0]?.sourceName : undefined;
  return (
    <p className={`evidence-note evidence-note--${assurance}`}>
      <Icon aria-hidden="true" />
      <span>
        <strong>
          {tx("Source")}: {tx(label)}
          {source ? ` (${source})` : ""}
        </strong>{" "}
        {tx(detail)}
      </span>
    </p>
  );
}
