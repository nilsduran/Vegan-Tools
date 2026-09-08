/**
 * @file menu-analyzer.ts
 * @description Gemini multimodal AI analyzer for restaurant menus (PDFs, images, and text).
 * Extracts dish titles, descriptions, and prices, and performs ethical vegan status classification
 * (`vegan`, `vegetarian`, `non-vegan`, `uncertain`) with reasoning and modification advice.
 */

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
  analyze(
    menu: MenuDraft,
    uploads: Upload[],
    options?: { highAccuracy?: boolean; includeDrinks?: boolean },
  ): Promise<MenuDraft>;
}

export class GeminiMenuAnalyzer implements MenuAnalyzer {
  async analyze(
    menu: MenuDraft,
    uploads: Upload[],
    options?: { highAccuracy?: boolean; includeDrinks?: boolean },
  ): Promise<MenuDraft> {
    if (!process.env.GEMINI_API_KEY) {
      return demoMenu(menu, uploads);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const drinksInstruction = options?.includeDrinks
      ? "Extract food items and drinks. For wines, beers and beverages, audit ingredients and clarifiers for animal derivatives (isinglass, gelatin, albumin, carmine E120, honey)."
      : "Extract every food item from these menu files. Ignore drinks to save tokens and focus strictly on dining.";

    const parts = [
      ...uploads.map((upload) => ({
        inlineData: {
          mimeType: upload.mimetype,
          data: upload.buffer.toString("base64"),
        },
      })),
      {
        text: `${drinksInstruction}
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
For dishes that are vegetarian, probably_vegetarian, or non_vegetarian: ONLY if the printed menu explicitly states that the dish can be adapted to vegan (for example: "opció vegana disponible", "vegan option available", "ask without cheese", "demanar sense formatge", "canvi de llet per civada o soja", "tofu option"), set "modifiableTo" to "vegan" and put the explicit printed instruction in "modificationNote" (in English) and "modificationNoteCa" (in Catalan).
NEVER guess or invent cooking modifications if the printed menu does not explicitly mention that the dish can be adapted or customized.
For PDFs, include the 1-based PDF page number where each dish appears as sourcePage.
For multiple uploaded images, use the 1-based image position as sourcePage.
Return JSON matching the supplied schema.${options?.highAccuracy ? "\nExtract with maximum thoroughness. Perform a meticulous, comprehensive scan of all columns, sections, footers, and small print." : ""}`,
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
                        reasonCa: { type: Type.STRING },
                        modifiableTo: {
                          type: Type.STRING,
                          enum: ["vegan", "vegetarian"],
                        },
                        modificationNote: { type: Type.STRING },
                        modificationNoteCa: { type: Type.STRING },
                        sourcePage: { type: Type.INTEGER },
                      },
                      required: ["originalName", "name", "nameCa", "description", "descriptionCa", "price", "verdict", "reason", "reasonCa"],
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
    const models = options?.highAccuracy
      ? [...new Set(["gemini-2.5-pro", "gemini-3.0-flash", configuredModel])]
      : [...new Set([configuredModel, "gemini-3.0-flash", "gemini-2.5-flash"])];
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
    const analyzed = menuDraftSchema.parse({
      ...menu,
      ...parsed,
      status: "ready",
      sections: ((parsed.sections as Array<Record<string, unknown>>) ?? []).map((section) => ({
        ...section,
        id: randomUUID(),
        items: ((section.items as Array<Record<string, unknown>>) ?? []).map((item) => {
          const modifiableTo =
            item.modifiableTo === "vegan" || item.modifiableTo === "vegetarian"
              ? item.modifiableTo
              : undefined;
          const modificationNote =
            typeof item.modificationNote === "string" && item.modificationNote.trim()
              ? item.modificationNote.trim()
              : undefined;
          const modificationNoteCa =
            typeof item.modificationNoteCa === "string" && item.modificationNoteCa.trim()
              ? item.modificationNoteCa.trim()
              : undefined;
          const explicitMods =
            modifiableTo && modificationNote
              ? [{ target: modifiableTo, note: modificationNote, noteCa: modificationNoteCa }]
              : [];

          return {
            description: "",
            price: "",
            ...item,
            modifiableTo,
            modificationNote,
            modificationNoteCa,
            modifications: explicitMods,
            id: randomUUID(),
          };
        }),
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
            reasonCa: item.reasonCa?.trim() || undefined,
          };
        }),
      })),
    };
  }
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
