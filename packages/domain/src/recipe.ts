import { CLASSIFIER_VERSION, classifyIngredients } from "./classifier.js";
import type {
  IngredientFinding,
  RecipeAnalysis,
  RecipeSubstitution,
} from "./schemas.js";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function findIngredientLine(text: string, finding: IngredientFinding): string | undefined {
  const alias = normalize(finding.matchedAlias);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => normalize(line).includes(alias));
}

function extractAmount(line?: string): string | undefined {
  if (!line) return undefined;
  return line.match(
    /^\s*((?:\d+\s+)?\d+(?:[.,]\d+|\/\d+)?\s*(?:mg|g|kg|ml|cl|dl|l|tsp|tbsp|teaspoons?|tablespoons?|cups?|oz|lb)?)/i,
  )?.[1]?.trim();
}

function eggCount(line?: string): number | undefined {
  const value = line?.match(/^\s*(\d+)\s*(?:eggs?|ous?|huevos?)\b/i)?.[1];
  return value ? Number(value) : undefined;
}

function numericAmount(amount?: string): number | undefined {
  if (!amount) return undefined;
  const value = amount.match(/^(\d+)(?:\s+(\d+)\/(\d+)|[.,](\d+)|\/(\d+))?/);
  if (!value) return undefined;
  const whole = Number(value[1]);
  if (value[2] && value[3]) return whole + Number(value[2]) / Number(value[3]);
  if (value[4]) return Number(`${value[1]}.${value[4]}`);
  if (value[5]) return whole / Number(value[5]);
  return whole;
}

function scaledAmount(amount: string | undefined, factor: number): string | undefined {
  const numeric = numericAmount(amount);
  if (numeric === undefined || !amount) return undefined;
  const unit = amount.match(/[a-z]+$/i)?.[0] ?? "";
  const scaled = Math.round(numeric * factor * 10) / 10;
  return `${Number.isInteger(scaled) ? scaled.toFixed(0) : scaled} ${unit}`.trim();
}

function replacementGuidance(
  finding: IngredientFinding,
  amount: string | undefined,
  line: string | undefined,
  selectedSuggestion: string,
): string {
  const quantity = amount ?? "the original quantity";
  const selected = selectedSuggestion.toLowerCase();

  switch (finding.id) {
    case "egg": {
      const count = eggCount(line);
      const eggs = count ?? 1;
      if (selected.includes("aquafaba")) {
        return `Use ${eggs * 3} tbsp aquafaba for ${eggs} egg${eggs === 1 ? "" : "s"}; whip it when the original eggs provide air or volume.`;
      }
      if (selected.includes("silken tofu")) {
        return `Blend ${eggs * 60} g silken tofu until smooth for ${eggs} egg${eggs === 1 ? "" : "s"}; this works best for moisture and density, not whipping.`;
      }
      if (selected.includes("commercial")) {
        return `Use enough commercial egg replacer for ${eggs} egg${eggs === 1 ? "" : "s"}, following that product's package ratio.`;
      }
      return `Mix ${eggs} tbsp ground flaxseed with ${eggs * 3} tbsp water and rest for 10 minutes to replace ${eggs} egg${eggs === 1 ? "" : "s"}.`;
    }
    case "milk":
      return `Replace ${quantity} 1:1 with ${selectedSuggestion}. Choose an unsweetened version for savoury recipes.`;
    case "butter": {
      if (selected.includes("oil")) {
        const converted = scaledAmount(amount, 0.8);
        return converted
          ? `Start with ${converted} ${selectedSuggestion} instead of ${quantity} butter; add a little more only if the mixture is too dry.`
          : `Use about 80% as much ${selectedSuggestion} as butter, then adjust for texture.`;
      }
      return `Replace ${quantity} 1:1 with ${selectedSuggestion}.`;
    }
    case "cream":
      return `Replace ${quantity} 1:1 with ${selectedSuggestion}${selected.includes("coconut") ? "; make sure its flavour suits the dish" : ""}.`;
    case "honey":
      return `Replace ${quantity} 1:1 with ${selectedSuggestion}, then reduce other liquid slightly if the mixture becomes too loose.`;
    case "cheese":
      return selected.includes("nutritional")
        ? "Add nutritional yeast gradually to taste; it provides savoury flavour but is not a 1:1 texture replacement."
        : `Start with ${quantity} ${selectedSuggestion} and adjust for the desired texture.`;
    case "gelatin":
      return `Use ${selectedSuggestion} according to its package ratio for the recipe's total liquid; gelling agents are not interchangeable 1:1.`;
    case "animal-meat":
      return `Start with the same weight of ${selectedSuggestion}, then adjust seasoning and cooking time.`;
    case "fish-seafood":
      return `Start with a similar weight of ${selectedSuggestion}; add seaweed seasoning if a marine flavour is appropriate.`;
    case "animal-fat": {
      if (selected.includes("oil")) {
        const converted = scaledAmount(amount, 0.8);
        return converted
          ? `Start with ${converted} ${selectedSuggestion} instead of ${quantity} animal fat.`
          : `Use about 80% as much ${selectedSuggestion} as solid animal fat.`;
      }
      return `Replace ${quantity} 1:1 with ${selectedSuggestion}.`;
    }
    default:
      return `Use ${selectedSuggestion}; start with ${quantity} only where the product supports a direct substitution, and check its instructions.`;
  }
}

function preferredReplacement(id: string, selectedSuggestion: string): string {
  const selected = selectedSuggestion.toLowerCase();
  if (id === "egg") {
    if (selected.includes("aquafaba")) return "aquafaba";
    if (selected.includes("silken tofu")) return "silken tofu";
    if (selected.includes("commercial")) return "commercial egg replacer";
    return "flax eggs";
  }
  const replacements: Record<string, string> = {
    "flax egg for binding": "flax eggs",
    "aquafaba for whipping": "aquafaba",
    "silken tofu for moisture": "silken tofu",
  };
  return replacements[selectedSuggestion] ??
    selectedSuggestion.replace(/\s+for\s+.+$/i, "");
}

function replaceAlias(line: string, alias: string, replacement: string): string {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return line.replace(new RegExp(escaped, "gi"), replacement);
}

function veganizedIngredientLine(
  line: string,
  finding: IngredientFinding,
  amount: string | undefined,
  selectedSuggestion: string,
): string {
  if (finding.id === "egg") {
    const count = eggCount(line);
    const eggs = count ?? 1;
    const selected = selectedSuggestion.toLowerCase();
    let replacement: string;
    if (selected.includes("aquafaba")) replacement = `${eggs * 3} tbsp aquafaba`;
    else if (selected.includes("silken tofu")) replacement = `${eggs * 60} g silken tofu`;
    else if (selected.includes("commercial")) {
      replacement = `commercial egg replacer for ${eggs} egg${eggs === 1 ? "" : "s"} (package ratio)`;
    } else {
      replacement = `${eggs} flax egg${eggs === 1 ? "" : "s"} (${eggs} tbsp ground flaxseed + ${eggs * 3} tbsp water)`;
    }
    return line.replace(
      new RegExp(
        `^\\s*${eggs}\\s*(?:egg\\s+whites?|egg\\s+yolks?|eggs?|clares?\\s+d['’]ou|rovells?|ous?|claras?\\s+de\\s+huevo|yemas?(?:\\s+de\\s+huevo)?|huevos?)`,
        "i",
      ),
      replacement,
    );
  }
  const selected = selectedSuggestion.toLowerCase();
  if (
    amount &&
    ((finding.id === "butter" || finding.id === "animal-fat") && selected.includes("oil"))
  ) {
    const converted = scaledAmount(amount, 0.8);
    if (converted) {
      const escapedAmount = amount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const withoutAmount = line.replace(new RegExp(`^\\s*${escapedAmount}\\s*`, "i"), "");
      return `${converted} ${replaceAlias(withoutAmount, finding.matchedAlias, preferredReplacement(finding.id, selectedSuggestion))}`;
    }
  }
  if (
    finding.id === "gelatin" ||
    (finding.id === "cheese" && selected.includes("nutritional"))
  ) {
    const escapedAmount = amount?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withoutAmount = amount
      ? line.replace(new RegExp(`^\\s*${escapedAmount ?? ""}\\s*`, "i"), "")
      : line;
    return replaceAlias(
      withoutAmount,
      finding.matchedAlias,
      `${preferredReplacement(finding.id, selectedSuggestion)} (adjust quantity to taste or package instructions)`,
    );
  }
  return replaceAlias(
    line,
    finding.matchedAlias,
    preferredReplacement(finding.id, selectedSuggestion),
  );
}

function instructionNote(substitution: RecipeSubstitution): string | undefined {
  const selected = substitution.selectedSuggestion.toLowerCase();
  switch (substitution.ingredientId) {
    case "egg": {
      const count = eggCount(substitution.detectedText) ?? 1;
      if (selected.includes("aquafaba")) {
        return `Measure ${count * 3} tbsp aquafaba and whip it if the original eggs provide air or volume.`;
      }
      if (selected.includes("silken tofu")) {
        return `Blend ${count * 60} g silken tofu until smooth before adding it.`;
      }
      if (selected.includes("commercial")) {
        return `Prepare enough commercial egg replacer for ${count} egg${count === 1 ? "" : "s"} according to its package.`;
      }
      return `Mix ${count} tbsp ground flaxseed with ${count * 3} tbsp water and rest for 10 minutes before the step that uses the eggs.`;
    }
    case "gelatin":
      return `Prepare ${substitution.selectedSuggestion} according to its package; different gelling agents require different temperatures and ratios.`;
    case "animal-meat":
      return `Cook the ${preferredReplacement(substitution.ingredientId, substitution.selectedSuggestion)} appropriately; do not reuse the original meat cooking time as a safety rule.`;
    case "fish-seafood":
      return `Adjust the cooking method and time for ${preferredReplacement(substitution.ingredientId, substitution.selectedSuggestion)} instead of following the original fish timing.`;
    default:
      return undefined;
  }
}

function buildVeganizedText(
  text: string,
  findings: IngredientFinding[],
  substitutions: RecipeSubstitution[],
): string {
  if (!text.trim()) return "";
  const originalLines = text.split(/\r?\n/);
  const ingredientLines = new Map(
    substitutions
      .filter((item) => item.detectedText)
      .map((item) => [item.ingredientId, item.detectedText]),
  );

  const transformed = originalLines.map((originalLine) => {
    let line = originalLine;
    for (const finding of findings) {
      if (!normalize(originalLine).includes(normalize(finding.matchedAlias))) continue;
      const isIngredientLine = originalLine.trim() === ingredientLines.get(finding.id);
      const substitution = substitutions.find(
        (item) => item.ingredientId === finding.id,
      );
      if (!substitution) continue;
      line = isIngredientLine
        ? veganizedIngredientLine(
            line,
            finding,
            substitution.originalAmount,
            substitution.selectedSuggestion,
          )
        : finding.id === "egg"
          ? line
              .replace(
                /egg\s+whites?|clares?\s+d['’]ou|claras?\s+de\s+huevo/gi,
                preferredReplacement(finding.id, substitution.selectedSuggestion),
              )
              .replace(
                /egg\s+yolks?|rovells?|yemas?(?:\s+de\s+huevo)?/gi,
                preferredReplacement(finding.id, substitution.selectedSuggestion),
              )
              .replace(
                /\beggs?\b|\bous?\b|\bhuevos?\b/gi,
                preferredReplacement(finding.id, substitution.selectedSuggestion),
              )
          : replaceAlias(
              line,
              finding.matchedAlias,
              preferredReplacement(finding.id, substitution.selectedSuggestion),
            );
    }
    return line;
  });

  const hasInstructions =
    /(^|\n)\s*(instructions|method|directions|preparation|steps|instruccions|preparaci[oó]|preparación)\s*:?\s*($|\n)/im
      .test(text);
  if (hasInstructions) {
    const notes = substitutions
      .map((item) => instructionNote(item))
      .filter((note): note is string => Boolean(note));
    if (notes.length > 0) {
      transformed.push("", "Vegan substitution notes:", ...notes.map((note) => `- ${note}`));
    }
  }

  return transformed.join("\n");
}

function contextualDefaultSuggestion(
  finding: IngredientFinding,
  text: string,
): string {
  const recipe = normalize(text);
  const alias = normalize(finding.matchedAlias);
  const available = finding.substitutions;
  const choose = (suggestion: string) =>
    available.includes(suggestion) ? suggestion : available[0] ?? "vegan alternative";

  switch (finding.id) {
    case "egg":
      if (/(meringue|pavlova|macaron|mousse|souffle|whip|egg white|clara d'ou|clara de huevo)/.test(recipe)) {
        return choose("aquafaba for whipping");
      }
      if (/(scrambl|omelette|omelet|frittata|quiche|remena|truita|tortilla)/.test(recipe)) {
        return choose("silken tofu for moisture");
      }
      if (/(custard|cheesecake|brownie|dense cake|flan|crema|pastis dens)/.test(recipe)) {
        return choose("silken tofu for moisture");
      }
      return choose("flax egg for binding");
    case "butter":
      if (/(fry|saute|sauté|roast|risotto|soup|stew|salte|sofreg|guis)/.test(recipe)) {
        return choose("olive oil");
      }
      if (/(muffin|quick bread|carrot cake|banana bread|pancake|crepe|magdalena|pa de pessic)/.test(recipe)) {
        return choose("neutral vegetable oil");
      }
      return choose("vegan butter");
    case "cheese":
      if (alias.includes("parmes") || /(pesto|seasoning|sprinkle|empolvor)/.test(recipe)) {
        return choose("nutritional yeast");
      }
      if (/(cream sauce|creamy|dip|salsa cremosa|sauce cremeuse)/.test(recipe)) {
        return choose("cashew cream");
      }
      return choose("vegan cheese");
    case "cream":
      if (/(whip|dessert|mousse|ganache|ice cream|gelat|postre)/.test(recipe)) {
        return choose("coconut cream");
      }
      return choose("oat cream");
    case "animal-meat":
      if (/(mince|ground|burger|bolognese|meatball|picad|hamburg|mandonguill|boloñesa)/.test(recipe)) {
        return choose("textured vegetable protein");
      }
      if (/(beef|veal|steak|vedella|ternera)/.test(alias)) return choose("seitan");
      if (/(chicken|turkey|duck|pollastre|pavo|pollo|anec|pato)/.test(alias)) return choose("tofu");
      if (/(stew|chili|curry|guisat|estofat)/.test(recipe)) return choose("legumes");
      return choose("seitan");
    case "fish-seafood":
      if (/(salmon|salmo)/.test(alias)) return choose("smoked tofu");
      return choose("hearts of palm");
    case "animal-fat":
      if (/(pastry|pie|biscuit|cookie|croissant|massa|pasta brisa|galeta)/.test(recipe)) {
        return choose("vegan butter");
      }
      return choose("olive oil");
    default:
      return available[0] ?? "vegan alternative";
  }
}

export function veganizeRecipe(
  text: string,
  selections: Record<string, string> = {},
): RecipeAnalysis {
  const analysis = classifyIngredients(text, { assurance: "label_based" });
  const replaceable = analysis.findings.filter(
    (finding) => finding.status !== "vegan" && finding.substitutions.length > 0,
  );

  const substitutions = replaceable.map((finding) => {
    const detectedText = findIngredientLine(text, finding);
    const originalAmount = extractAmount(detectedText);
    const requestedSuggestion = selections[finding.id];
    const defaultSuggestion = contextualDefaultSuggestion(finding, text);
    const selectedSuggestion =
      requestedSuggestion !== undefined &&
      finding.substitutions.includes(requestedSuggestion)
      ? requestedSuggestion
      : defaultSuggestion;
    return {
      ingredientId: finding.id,
      ingredient: finding.name,
      detectedText,
      originalAmount,
      selectedSuggestion,
      reason: finding.reason,
      guidance: replacementGuidance(
        finding,
        originalAmount,
        detectedText,
        selectedSuggestion,
      ),
      suggestions: finding.substitutions,
    };
  });

  let summary: string;
  if (!text.trim()) {
    summary = "Paste a recipe to identify ingredients that need replacing.";
  } else if (analysis.verdict === "probably_vegan" || analysis.verdict === "vegan") {
    summary = "No non-vegan ingredient was detected. Review branded or unspecified ingredients before cooking.";
  } else if (substitutions.length > 0) {
    summary = `${substitutions.length} ingredient${substitutions.length === 1 ? "" : "s"} can be replaced with vegan alternatives.`;
  } else {
    summary = "Some ingredients need more information before this recipe can be veganized reliably.";
  }

  return {
    originalText: text,
    veganizedText: buildVeganizedText(text, analysis.findings, substitutions),
    verdict: analysis.verdict,
    summary,
    classifierVersion: CLASSIFIER_VERSION,
    findings: analysis.findings,
    substitutions,
  };
}
