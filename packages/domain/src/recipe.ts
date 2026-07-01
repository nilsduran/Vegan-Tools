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

function replacementGuidance(
  finding: IngredientFinding,
  amount: string | undefined,
  line: string | undefined,
): string {
  const quantity = amount ?? "the original quantity";

  switch (finding.id) {
    case "egg": {
      const count = eggCount(line);
      if (count) {
        return `For binding, replace ${count} egg${count === 1 ? "" : "s"} with ${count} tbsp ground flaxseed mixed with ${count * 3} tbsp water; rest for 10 minutes. For whipped or airy recipes, use about ${count * 3} tbsp aquafaba instead.`;
      }
      return "For each egg, use 1 tbsp ground flaxseed plus 3 tbsp water for binding, or about 3 tbsp aquafaba for a lighter result.";
    }
    case "milk":
      return `Replace ${quantity} 1:1 with unsweetened soy or oat milk. Choose a neutral, unflavoured product for savoury recipes.`;
    case "butter":
      return `Use the same amount of vegan block butter. For recipes where firmness is unimportant, neutral oil can work, but start with slightly less and adjust.`;
    case "cream":
      return `Replace ${quantity} 1:1 with oat or soy cooking cream; use coconut cream only when its flavour suits the dish.`;
    case "honey":
      return `Replace ${quantity} 1:1 with maple, agave or date syrup, then reduce other liquid slightly if the mixture becomes too loose.`;
    case "cheese":
      return `For melting, start with the same amount of vegan cheese. For flavour rather than texture, add nutritional yeast gradually instead of treating it as a 1:1 replacement.`;
    case "gelatin":
      return "Agar sets more firmly than gelatine and must usually be brought to a boil. Follow the agar package ratio for the recipe's total liquid rather than substituting 1:1.";
    case "animal-meat":
      return `Start with the same cooked weight of tofu, tempeh, seitan or textured vegetable protein, then adjust seasoning and cooking time.`;
    case "fish-seafood":
      return `Start with a similar weight of tofu, hearts of palm or a seafood-style vegan alternative; add seaweed for marine flavour if appropriate.`;
    case "animal-fat":
      return `Replace ${quantity} with vegan butter or vegetable fat. Use an equal amount when solidity matters; otherwise add oil gradually.`;
    default:
      return `Choose one suggested alternative and start with ${quantity} where a direct substitution makes sense. Check the product instructions and adjust texture before cooking.`;
  }
}

function preferredReplacement(id: string): string {
  const replacements: Record<string, string> = {
    egg: "flax eggs",
    milk: "unsweetened soy milk",
    butter: "vegan block butter",
    cream: "oat cooking cream",
    honey: "maple syrup",
    cheese: "vegan cheese",
    gelatin: "agar-agar",
    "animal-meat": "firm tofu",
    "fish-seafood": "hearts of palm",
    "animal-fat": "vegan block butter",
    whey: "pea protein",
    casein: "pea protein",
  };
  return replacements[id] ?? "vegan alternative";
}

function replaceAlias(line: string, alias: string, replacement: string): string {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return line.replace(new RegExp(escaped, "gi"), replacement);
}

function veganizedIngredientLine(
  line: string,
  finding: IngredientFinding,
  amount: string | undefined,
): string {
  if (finding.id === "egg") {
    const count = eggCount(line);
    const replacement = count
      ? `flax eggs (${count} tbsp ground flaxseed + ${count * 3} tbsp water)`
      : "flax egg (1 tbsp ground flaxseed + 3 tbsp water)";
    return replaceAlias(line, finding.matchedAlias, replacement);
  }
  if (finding.id === "gelatin" && amount) {
    const escapedAmount = amount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withoutAmount = line.replace(new RegExp(`^\\s*${escapedAmount}\\s*`, "i"), "");
    return replaceAlias(
      withoutAmount,
      finding.matchedAlias,
      "agar-agar (quantity according to package instructions and total liquid)",
    );
  }
  return replaceAlias(line, finding.matchedAlias, preferredReplacement(finding.id));
}

function instructionNote(id: string, line?: string): string | undefined {
  switch (id) {
    case "egg": {
      const count = eggCount(line) ?? 1;
      return `Mix ${count} tbsp ground flaxseed with ${count * 3} tbsp water and rest for 10 minutes before the step that uses the eggs.`;
    }
    case "gelatin":
      return "Bring the agar mixture to a boil as directed on its package; it sets more firmly than gelatine.";
    case "animal-meat":
      return "Cook the tofu until browned and heated through; do not reuse the original meat cooking time as a safety rule.";
    case "fish-seafood":
      return "Heat the hearts of palm only until warmed and seasoned; prolonged fish cooking times may make it too soft.";
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
      line = isIngredientLine
        ? veganizedIngredientLine(
            line,
            finding,
            substitutions.find((item) => item.ingredientId === finding.id)?.originalAmount,
          )
        : replaceAlias(line, finding.matchedAlias, preferredReplacement(finding.id));
    }
    return line;
  });

  const hasInstructions =
    /(^|\n)\s*(instructions|method|directions|preparation|steps|instruccions|preparaci[oó]|preparación)\s*:?\s*($|\n)/im
      .test(text);
  if (hasInstructions) {
    const notes = substitutions
      .map((item) => instructionNote(item.ingredientId, item.detectedText))
      .filter((note): note is string => Boolean(note));
    if (notes.length > 0) {
      transformed.push("", "Vegan substitution notes:", ...notes.map((note) => `- ${note}`));
    }
  }

  return transformed.join("\n");
}

export function veganizeRecipe(text: string): RecipeAnalysis {
  const analysis = classifyIngredients(text, { assurance: "label_based" });
  const replaceable = analysis.findings.filter(
    (finding) => finding.status !== "vegan" && finding.substitutions.length > 0,
  );

  const substitutions = replaceable.map((finding) => {
    const detectedText = findIngredientLine(text, finding);
    const originalAmount = extractAmount(detectedText);
    return {
      ingredientId: finding.id,
      ingredient: finding.name,
      detectedText,
      originalAmount,
      reason: finding.reason,
      guidance: replacementGuidance(finding, originalAmount, detectedText),
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
