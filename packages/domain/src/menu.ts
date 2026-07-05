import type { DietVerdict } from "./schemas.js";

interface MenuExplanationInput {
  name: string;
  originalName?: string;
  description?: string;
  reason?: string;
  verdict: DietVerdict;
}

function normalizedText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function visibleMenuDescription(item: MenuExplanationInput) {
  const description = item.description?.trim() ?? "";
  if (!description) return "";
  const normalizedDescription = normalizedText(description);
  const normalizedName = normalizedText(item.name);
  const normalizedOriginalName = normalizedText(item.originalName ?? "");
  if (
    normalizedDescription === normalizedName ||
    normalizedDescription === normalizedOriginalName ||
    (
      normalizedDescription.length >= normalizedName.length * 0.6 &&
      normalizedName.includes(normalizedDescription)
    ) ||
    (
      normalizedOriginalName &&
      normalizedDescription.length >= normalizedOriginalName.length * 0.6 &&
      normalizedOriginalName.includes(normalizedDescription)
    )
  ) {
    return "";
  }
  return description;
}

export function menuDisplayText(item: MenuExplanationInput) {
  return {
    name: item.name,
    description: visibleMenuDescription(item),
  };
}

export function informativeMenuReason(item: MenuExplanationInput) {
  const reason = item.reason?.trim() ?? "";
  const genericReason =
    !reason ||
    /^(?:this is (?:a )?)?(?:probably )?(?:vegan|vegetarian|non[- ]vegetarian|carnist)(?:\s+(?:dish|dessert|option|item|meal))?\.?$/i
      .test(reason);
  if (!genericReason) return reason;

  const dishText = `${item.name} ${item.originalName ?? ""} ${
    item.description ?? ""
  }`.toLocaleLowerCase();
  if (
    item.verdict === "vegetarian" ||
    item.verdict === "probably_vegetarian"
  ) {
    if (
      /\b(ice creams?|helados?|gelato)\b/i.test(dishText) &&
      /\b(sorbets?|sorbetes?)\b/i.test(dishText)
    ) {
      return "This selection mixes dairy ice creams with sorbets. The ice-cream flavours are vegetarian; the sorbets may be vegan, but their recipe should be checked for milk, egg, honey or gelatin.";
    }
    if (/\b(coulant|lava cake)\b/i.test(dishText) && /\b(ice cream|helado)\b/i.test(dishText)) {
      return "Vegetarian rather than vegan because the ice cream normally contains dairy, and chocolate coulant commonly contains butter and egg.";
    }
    if (/\b(ice cream|helado|gelato)\b/i.test(dishText)) {
      return "Vegetarian rather than vegan because ice cream normally contains dairy.";
    }
    if (/\b(cheese|mozzarella|burrata|parmesan|provolone|queso|formatge)\b/i.test(dishText)) {
      return "Vegetarian rather than vegan because the dish contains cheese.";
    }
    if (/\b(egg|eggs|huevo|huevos|ou|ous)\b/i.test(dishText)) {
      return "Vegetarian rather than vegan because the dish contains egg.";
    }
    return "The menu marks this as vegetarian, but it does not list enough ingredients to identify the animal-derived component.";
  }

  if (item.verdict === "vegan" || item.verdict === "probably_vegan") {
    return item.description?.trim()
      ? "No animal-derived ingredients are listed in the menu description."
      : "The menu marks this as vegan, but it does not provide enough ingredient detail for an independent explanation.";
  }

  if (item.verdict === "non_vegetarian") {
    const animalIngredient = dishText.match(
      /\b(chicken|beef|pork|ham|bacon|tuna|salmon|cod|anchov(?:y|ies)|prawn|shrimp|meat|fish)\b/i,
    )?.[1];
    return animalIngredient
      ? `Not vegetarian because the dish contains ${animalIngredient}.`
      : "Not vegetarian because the menu indicates an animal-derived ingredient, but does not identify it clearly.";
  }

  return reason || "The menu does not provide enough ingredient detail for a reliable classification.";
}
