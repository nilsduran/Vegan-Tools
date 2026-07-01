import type { DietVerdict } from "@vegan-tools/domain";
import { CircleHelp, Leaf, MilkOff, SearchCheck, TriangleAlert } from "lucide-react";
import { t } from "../i18n";

export function VerdictBadge({ verdict }: { verdict: DietVerdict }) {
  const values = {
    vegan: { label: t("vegan"), Icon: Leaf },
    probably_vegan: { label: t("probablyVegan"), Icon: SearchCheck },
    vegetarian: { label: t("vegetarian"), Icon: MilkOff },
    probably_vegetarian: { label: t("probablyVegetarian"), Icon: SearchCheck },
    non_vegetarian: { label: t("nonVegetarian"), Icon: TriangleAlert },
    unknown: { label: t("unknown"), Icon: CircleHelp },
  };
  const { label, Icon } = values[verdict];
  return <span className={`verdict verdict-${verdict}`}><Icon />{label}</span>;
}
