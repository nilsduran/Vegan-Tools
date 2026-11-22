import type { DietVerdict } from "@vegan-tools/domain";
import { CircleHelp, Leaf, MilkOff, SearchCheck, TriangleAlert } from "lucide-react";
import { t, tx } from "../i18n";

/**
 * "diet" speaks of food (vegetarian, non-vegetarian); "general" is for clothing,
 * cosmetics or activities, where only vegan or not vegan makes sense.
 */
export function VerdictBadge({ verdict, context = "diet" }: { verdict: DietVerdict; context?: "diet" | "general" }) {
  const values = {
    vegan: { label: t("vegan"), Icon: Leaf },
    probably_vegan: { label: t("probablyVegan"), Icon: SearchCheck },
    vegetarian: { label: context === "diet" ? t("vegetarian") : tx("Not vegan"), Icon: MilkOff },
    // Outside food, "probably vegetarian" means an ingredient's origin is unconfirmed (glycerin, stearic acid).
    probably_vegetarian: { label: context === "diet" ? t("probablyVegetarian") : tx("Doubtful"), Icon: SearchCheck },
    non_vegetarian: { label: context === "diet" ? t("nonVegetarian") : tx("Not vegan"), Icon: TriangleAlert },
    unknown: { label: t("unknown"), Icon: CircleHelp },
  };
  const { label, Icon } = values[verdict];
  return <span className={`verdict verdict-${verdict}`}><Icon />{label}</span>;
}
