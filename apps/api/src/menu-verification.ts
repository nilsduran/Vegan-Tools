/**
 * @file menu-verification.ts
 * @description Second look at the dishes a menu analysis calls vegan, where a mistake
 * hurts most (a vegan eating animal products). It can only lower a verdict, never
 * raise it.
 *
 * 1. Rules (free, deterministic): the dish name and description go through the
 *    ingredient classifier; "amb formatge" or "pernil" in a "vegan" dish lowers it.
 * 2. AI review of only those dishes: animal ingredients that this kind of dish
 *    usually hides (meat stock in risotto, butter in pastry, egg in fresh pasta,
 *    fish sauce in pad thai). "Possible" keeps the dish as probably vegan with
 *    something to ask; "likely" takes it out of the vegan group.
 *
 * Skipped for 100% vegan venues, where the venue itself is the evidence.
 */

import { classifyIngredients, type DietVerdict, type MenuDraft, type MenuItem } from "@vegan-tools/domain";

export interface DishToReview {
  id: string;
  name: string;
  description: string;
}

export interface DishReview {
  id: string;
  risk: "none" | "possible" | "likely";
  /** The animal ingredient at risk, in English. */
  ingredient?: string;
  /** slaughter: meat, fish, stock, gelatine; secretion: dairy, egg, honey. */
  kind?: "slaughter" | "secretion";
  reason?: string;
  reasonCa?: string;
}

export type DishReviewer = (dishes: DishToReview[]) => Promise<DishReview[]>;

const VEGAN_GROUP: DietVerdict[] = ["vegan", "probably_vegan"];

function lowerByRules(item: MenuItem): MenuItem {
  const text = [item.originalName, item.name, item.description].filter(Boolean).join(". ");
  const analysis = classifyIngredients(text, { assurance: "unverified" });
  const slaughter = analysis.findings.filter((finding) => finding.status === "non_vegetarian");
  const secretion = analysis.findings.filter((finding) => finding.status === "vegetarian");
  if (slaughter.length > 0) {
    const names = slaughter.map((finding) => finding.name).join(", ");
    return {
      ...item,
      verdict: "non_vegetarian",
      reason: `The dish description mentions ${names}.`,
      reasonCa: `La descripció del plat esmenta ${names}.`,
    };
  }
  if (secretion.length > 0) {
    const names = secretion.map((finding) => finding.name).join(", ");
    return {
      ...item,
      verdict: "vegetarian",
      reason: `The dish description mentions ${names}.`,
      reasonCa: `La descripció del plat esmenta ${names}.`,
    };
  }
  return item;
}

function lowerByReview(item: MenuItem, review: DishReview | undefined): MenuItem {
  if (!review || review.risk === "none") return item;
  const ingredient = review.ingredient?.trim() || "an animal-derived ingredient";
  const reason = review.reason?.trim() || `This kind of dish is often made with ${ingredient}: ask the staff.`;
  const reasonCa = review.reasonCa?.trim() || `Aquest tipus de plat sovint porta ${ingredient}: pregunta-ho al personal.`;
  if (review.risk === "possible") {
    return { ...item, verdict: "probably_vegan", reason, reasonCa };
  }
  return {
    ...item,
    verdict: review.kind === "secretion" ? "probably_vegetarian" : "unknown",
    reason,
    reasonCa,
  };
}

export async function verifyVeganDishes(
  menu: MenuDraft,
  options: { isVegan?: boolean; review?: DishReviewer } = {},
): Promise<MenuDraft> {
  if (options.isVegan) return menu;

  let sections = menu.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => (VEGAN_GROUP.includes(item.verdict) ? lowerByRules(item) : item)),
  }));

  const toReview = sections
    .flatMap((section) => section.items)
    .filter((item) => VEGAN_GROUP.includes(item.verdict))
    .map((item) => ({ id: item.id, name: item.originalName || item.name, description: item.description }));

  if (toReview.length > 0 && options.review) {
    try {
      const reviews = await options.review(toReview);
      const byId = new Map(reviews.map((review) => [review.id, review]));
      sections = sections.map((section) => ({
        ...section,
        items: section.items.map((item) => (VEGAN_GROUP.includes(item.verdict) ? lowerByReview(item, byId.get(item.id)) : item)),
      }));
    } catch {
      // The review is a safety net: without it the rule check above still applies.
    }
  }
  return { ...menu, sections };
}
