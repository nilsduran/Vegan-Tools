import { randomUUID } from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import {
  informativeMenuReason,
  menuDisplayText,
  menuDraftSchema,
  visibleMenuDescription,
  type MenuDraft,
} from "@vegan-tools/domain";

interface Upload {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface MenuAnalyzer {
  analyze(menu: MenuDraft, uploads: Upload[]): Promise<MenuDraft>;
}

export class GeminiMenuAnalyzer implements MenuAnalyzer {
  async analyze(menu: MenuDraft, uploads: Upload[]): Promise<MenuDraft> {
    if (!process.env.GEMINI_API_KEY) {
      return demoMenu(menu, uploads);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts = [
      ...uploads.map((upload) => ({
        inlineData: {
          mimeType: upload.mimetype,
          data: upload.buffer.toString("base64"),
        },
      })),
      {
        text: `Extract every food item from these menu files. Ignore drinks.
Translate display text to English while retaining each original dish name.
Also translate section names, dish names and dish descriptions to Catalan.
The "name" must be the full translated dish name as printed, including meaningful qualifiers such as "with pappa al pomodoro and arugula".
The "nameCa" must be the full Catalan dish name. If the original dish name is a proper noun or already customary in Catalan, keep it natural rather than over-translating it.
Put separately printed ingredients, flavours, preparation details and descriptive text in "description".
Translate descriptions fully into English; never leave description in the source language when the display name has been translated.
Translate descriptions fully into Catalan in "descriptionCa"; never leave descriptionCa in English or the source language.
If the only descriptive text repeats the dish title, use an empty description instead.
If the only descriptive text repeats the dish title, use an empty descriptionCa as well.
Keep "reason" only for a short explanation of the dietary verdict; do not move the menu description there.
The reason must name the ingredient or uncertainty that supports the verdict. For example, explain that ice cream normally contains dairy instead of writing only "Vegetarian dessert".
Never return a reason that merely repeats a verdict label such as "Vegan dish", "Vegetarian option" or "Non-vegetarian item".
Use an empty string for description or price only when that information is absent from the source.
Never guess that a dish is vegan. Use "unknown" whenever ingredients are incomplete.
When one menu line contains selectable variants with different dietary implications, split them into separate items. For example, separate dairy ice-cream flavours from lemon or mandarin sorbets; sorbet is only probably vegan or unknown unless its ingredients or vegan marking rule out milk, egg, honey and gelatin.
Allowed verdicts: vegan, probably_vegan, vegetarian, probably_vegetarian, non_vegetarian, unknown.
For PDFs, include the 1-based PDF page number where each dish appears as sourcePage.
For multiple uploaded images, use the 1-based image position as sourcePage.
Return JSON matching the supplied schema.`,
      },
    ];

    const generate = (model: string) => ai.models.generateContent({
      model,
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            restaurantName: { type: Type.STRING },
            originalLanguage: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  nameCa: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        originalName: { type: Type.STRING },
                        name: { type: Type.STRING },
                        nameCa: { type: Type.STRING },
                        description: { type: Type.STRING },
                        descriptionCa: { type: Type.STRING },
                        price: { type: Type.STRING },
                        verdict: {
                          type: Type.STRING,
                          enum: ["vegan", "probably_vegan", "vegetarian", "probably_vegetarian", "non_vegetarian", "unknown"],
                        },
                        reason: { type: Type.STRING },
                        sourcePage: { type: Type.INTEGER },
                      },
                      required: ["originalName", "name", "nameCa", "description", "descriptionCa", "price", "verdict", "reason"],
                    },
                  },
                },
                required: ["name", "nameCa", "items"],
              },
            },
          },
          required: ["restaurantName", "originalLanguage", "sections"],
        },
      },
    });

    const configuredModel = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
    const models = [...new Set([configuredModel, "gemini-2.5-flash"])];
    let response: Awaited<ReturnType<typeof generate>> | undefined;
    let lastError: unknown;
    let selectedModel = configuredModel;

    for (const model of models) {
      for (const delay of [0, 800, 2_000]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          response = await generate(model);
          selectedModel = model;
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const retryable = /429|503|resource_exhausted|unavailable|high demand|overload/i.test(message);
          const unsupported = /404|not found|not supported/i.test(message);
          if (!retryable && !unsupported) throw error;
          if (unsupported) break;
        }
      }
      if (response) break;
    }
    if (!response) throw lastError;

    const parsed = JSON.parse(response.text ?? "{}") as Record<string, unknown>;
    const inferredModifications = await inferModifications(ai, models, selectedModel, parsed);
    const analyzed = menuDraftSchema.parse({
      ...menu,
      ...parsed,
      status: "ready",
      sections: ((parsed.sections as Array<Record<string, unknown>>) ?? []).map((section, sectionIndex) => ({
        ...section,
        id: randomUUID(),
        items: ((section.items as Array<Record<string, unknown>>) ?? []).map((item, itemIndex) => ({
          description: "",
          price: "",
          ...item,
          modifications: inferredModifications.get(`${sectionIndex}:${itemIndex}`) ?? [],
          id: randomUUID(),
        })),
      })),
    });
    return {
      ...analyzed,
      sections: analyzed.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const displayText = menuDisplayText({
            ...item,
            description: visibleMenuDescription(item),
          });
          return {
            ...item,
            name: displayText.name,
            description: displayText.description,
            descriptionCa: visibleMenuDescription({
              ...item,
              name: item.nameCa?.trim() || item.name,
              description: item.descriptionCa ?? "",
            }),
            reason: informativeMenuReason(item),
          };
        }),
      })),
    };
  }
}

async function inferModifications(
  ai: GoogleGenAI,
  fallbackModels: string[],
  preferredModel: string,
  parsed: Record<string, unknown>,
) {
  const sections = (parsed.sections as Array<Record<string, unknown>>) ?? [];
  const candidates = sections.flatMap((section, sectionIndex) =>
    ((section.items as Array<Record<string, unknown>>) ?? []).map((item, itemIndex) => ({
      key: `${sectionIndex}:${itemIndex}`,
      name: item.name,
      originalName: item.originalName,
      description: item.description,
      verdict: item.verdict,
      reason: item.reason,
    })),
  );
  const result = new Map<string, Array<{
    target: "vegan" | "vegetarian";
    note: string;
  }>>();
  if (candidates.length === 0) return result;

  const models = [...new Set([preferredModel, ...fallbackModels])];
  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
  for (const model of models) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: [{
          parts: [{
            text: `Infer plausible restaurant requests from this extracted menu JSON.
Use the dish name, description, verdict and reason even when the original menu does not explicitly offer modifications.
For vegetarian dishes, add a vegan adaptation when animal ingredients could plausibly be omitted or replaced.
For non-vegetarian dishes, add a vegetarian adaptation when meat or fish could plausibly be omitted or replaced, and a separate vegan adaptation when further dairy or egg changes are needed.
A dish may have both targets with different notes. Do not add a redundant adaptation to a dish already in that diet.
Only suggest ordinary kitchen changes: omit one or two secondary ingredients, serve a sauce separately, or replace butter with olive oil.
Never remove three or more ingredients. Do not suggest an adaptation when the remaining dish would be mostly a bare base, plain starch, bread or tomato sauce.
Never require a special vegan product or a newly prepared substitute such as plant-based bolognese, vegan meat, vegan cheese, vegan cream, vegan mayonnaise, tofu, tempeh or seitan.
Do not suggest an adaptation if it replaces the main ingredient, requires making a new sauce or filling, or changes the identity of the dish.
The named or defining ingredient is never secondary: for example, do not turn baked provolone, burrata, halloumi, a cheese board or fondue vegan by omitting its cheese.
Do not make an integrated baked dessert such as coulant, lava cake, brownie, cheesecake, tiramisu, flan or custard vegan merely by removing an accompaniment; its base commonly contains egg or dairy.
For example, do not adapt a ham, mozzarella and egg pizza to vegan by removing all three toppings. A multi-topping pizza may reasonably become vegetarian by omitting ham, or vegan by omitting ham and cheese, only when several substantial vegetable toppings remain.
Every note must start with "Ask whether it can be prepared..." and must not imply a guarantee.
Return only dishes with at least one adaptation. Preserve each key exactly.

${JSON.stringify(candidates)}`,
          }],
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dishes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    modifications: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          target: {
                            type: Type.STRING,
                            enum: ["vegan", "vegetarian"],
                          },
                          note: { type: Type.STRING },
                        },
                        required: ["target", "note"],
                      },
                    },
                  },
                  required: ["key", "modifications"],
                },
              },
            },
            required: ["dishes"],
          },
        },
      });
      break;
    } catch {
      // Adaptations are useful but must never make the complete extraction fail.
    }
  }
  if (!response) return result;

  try {
    const payload = JSON.parse(response.text ?? "{}") as {
      dishes?: Array<{
        key?: unknown;
        modifications?: Array<{ target?: unknown; note?: unknown }>;
      }>;
    };
    const validKeys = new Set(candidates.map((candidate) => candidate.key));
    const candidatesByKey = new Map(
      candidates.map((candidate) => [candidate.key, candidate]),
    );
    for (const dish of payload.dishes ?? []) {
      if (typeof dish.key !== "string" || !validKeys.has(dish.key)) continue;
      const candidate = candidatesByKey.get(dish.key);
      const dishName = `${String(candidate?.name ?? "")} ${String(candidate?.originalName ?? "")}`;
      const dishDescription = `${String(candidate?.description ?? "")} ${
        String(candidate?.reason ?? "")
      }`;
      const modifications = (dish.modifications ?? [])
        .filter(
          (entry): entry is { target: "vegan" | "vegetarian"; note: string } =>
            (entry.target === "vegan" || entry.target === "vegetarian") &&
            typeof entry.note === "string" &&
            isPracticalAdaptation(
              entry.note,
              dishName,
              dishDescription,
              entry.target,
            ),
        )
        .map((entry) => ({
          target: entry.target,
          note: /^ask whether\b/i.test(entry.note.trim())
            ? entry.note.trim()
            : `Ask whether it can be prepared ${entry.note.trim()}`,
        }));
      if (modifications.length > 0) result.set(dish.key, modifications);
    }
  } catch {
    return new Map();
  }
  return result;
}

export function isPracticalAdaptation(
  note: string,
  dishName: string,
  dishDescription = "",
  target?: "vegan" | "vegetarian",
) {
  const normalized = note.trim().toLowerCase();
  if (!normalized) return false;
  if (/(?:plant[- ]based|vegan)\s+(?:bolognese|meat|chicken|fish|cheese|cream|mayonnaise|mayo|pesto|sauce|protein)|tofu|tempeh|seitan|meat substitute|mock meat|alternative protein/i
    .test(normalized)) return false;

  const normalizedName = dishName.toLowerCase();
  const removed = normalized.match(
    /\b(?:without|omit(?:ting)?)\s+(?:the\s+)?(.+?)(?:[.;]|$)/i,
  )?.[1];
  if (!removed) return true;
  const removedIngredients = removed
    .replace(/\b(?:being|included|added)\b/g, "")
    .split(/\s*,\s*|\s+(?:and|or)\s+/)
    .map((ingredient) => ingredient.replace(/^(?:the|any)\s+/, "").trim())
    .filter(Boolean);
  if (removedIngredients.length > 2) return false;

  const describedIngredients = dishDescription
    .replace(/[()[\]]/g, "")
    .split(/\s*,\s*|\s+(?:and|with)\s+/)
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient.length > 2);
  if (
    describedIngredients.length >= 3 &&
    removedIngredients.length >= Math.ceil(describedIngredients.length / 2)
  ) return false;

  const meaningfulRemovedWords = removedIngredients.join(" ")
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zà-ÿ]/gi, ""))
    .filter((word) => word.length >= 4 && !["with", "from", "sauce"].includes(word));
  if (meaningfulRemovedWords.some((word) => normalizedName.includes(word))) {
    return false;
  }

  const integratedDish =
    /\b(?:croquettes?|fritters?|tartares?|bolognese|burgers?|meatballs?|lasagnas?|cannellonis?|ravioli|stuffed|farcit|croquetes?|tartars?|hamburguesas?|mandonguilles?|canelons?|omelettes?|tortillas?)\b/i
      .test(normalizedName);
  if (integratedDish) return false;
  if (/\bbravas?\b/i.test(normalizedName) && /\bsauce\b/i.test(removed)) return false;
  if (
    /\b(caprese|parmigiana|parmesana)\b/i.test(normalizedName) &&
    /\b(cheese|mozzarella|burrata|parmesan|egg)\b/i.test(removed)
  ) return false;
  if (
    /\b(provolone|mozzarella|burrata|halloumi|camembert|brie|cheddar|parmesan|parmesano|fondue|raclette|cheese board)\b/i
      .test(normalizedName) &&
    /\b(cheese|provolone|mozzarella|burrata|halloumi|camembert|brie|cheddar|parmesan|dairy)\b/i
      .test(removed)
  ) return false;
  if (
    target === "vegan" &&
    /\b(coulant|lava cake|brownie|cheesecake|tiramisu|flan|custard|crepes?|waffles?)\b/i
      .test(normalizedName)
  ) return false;
  return true;
}

function demoMenu(menu: MenuDraft, uploads: Upload[]): MenuDraft {
  return {
    ...menu,
    status: "ready",
    restaurantName: uploads[0]?.filename.replace(/\.[^.]+$/, "") ?? "Sample restaurant",
    originalLanguage: "unknown",
    sections: [
      {
        id: randomUUID(),
        name: "Review required",
        items: [
          {
            id: randomUUID(),
            originalName: "Example dish",
            name: "Example dish",
            description:
              "Gemini is not configured. Replace this sample with the dishes visible in the uploaded menu.",
            price: "",
            verdict: "unknown",
            reason: "No automated analysis was run.",
            modifications: [],
            sourcePage: 1,
          },
        ],
      },
    ],
  };
}
