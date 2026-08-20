import { GoogleGenAI, Type } from "@google/genai";
import type {
  DietVerdict,
  MenuItemModification,
} from "@vegan-tools/domain";

export interface PolishedDishFeedback {
  reason: string;
  reasonCa?: string;
  modificationNote?: string;
  modificationNoteCa?: string;
  modifications: MenuItemModification[];
}

export interface PolishedRestaurantNotes {
  communityNotes: string;
  communityNotesCa: string;
}

export interface DishFeedbackPolisher {
  polishDishFeedback(params: {
    dishName: string;
    dishDescription?: string;
    verdict: DietVerdict;
    rawNote: string;
    targetModification?: "vegan" | "vegetarian";
  }): Promise<PolishedDishFeedback>;

  polishRestaurantNotes(rawNotes: string): Promise<PolishedRestaurantNotes>;
}

function isNonsenseOrSpam(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return true;
  // Check for repeated random characters or consonant spam (e.g. "xlkzjv", "asdfghjk", "aaaaaa")
  if (/^[bcdfghjklmnpqrstvwxyz]{5,}$/i.test(trimmed)) return true;
  if (/^(.)\1{3,}$/i.test(trimmed)) return true;
  if (/^[0-9\W_]+$/.test(trimmed)) return true;
  // If it has very low letter diversity in a short string (e.g. "asdfasdf")
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (lettersOnly.length >= 6) {
    const uniqueChars = new Set(lettersOnly).size;
    if (uniqueChars <= 3) return true;
  }
  return false;
}

function defaultVerdictReason(verdict: DietVerdict, language: "en" | "ca"): string {
  if (language === "ca") {
    switch (verdict) {
      case "vegan":
        return "Ingredients 100% vegetals (verificat per la comunitat)";
      case "probably_vegan":
        return "Probablement vegà (verificat per la comunitat)";
      case "vegetarian":
        return "Vegetarià (sense carn ni peix)";
      case "probably_vegetarian":
        return "Probablement vegetarià";
      case "non_vegetarian":
        return "Conté ingredients d'origen animal (verificat per la comunitat)";
      default:
        return "Veredicte actualitzat per la comunitat";
    }
  }
  switch (verdict) {
    case "vegan":
      return "100% plant-based ingredients (community verified)";
    case "probably_vegan":
      return "Probably vegan (community verified)";
    case "vegetarian":
      return "Vegetarian (no meat or fish)";
    case "probably_vegetarian":
      return "Probably vegetarian";
    case "non_vegetarian":
      return "Contains animal ingredients (community verified)";
    default:
      return "Verdict updated by community feedback";
  }
}

export class GeminiDishFeedbackPolisher implements DishFeedbackPolisher {
  async polishDishFeedback(params: {
    dishName: string;
    dishDescription?: string;
    verdict: DietVerdict;
    rawNote: string;
    targetModification?: "vegan" | "vegetarian";
  }): Promise<PolishedDishFeedback> {
    const { dishName, dishDescription, verdict, rawNote, targetModification } = params;
    const trimmedNote = rawNote.trim();

    // If input is empty or obvious garbage, use clean standardized defaults
    if (!trimmedNote || isNonsenseOrSpam(trimmedNote)) {
      return this.fallbackDishFeedback({
        ...params,
        rawNote: "",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return this.fallbackDishFeedback(params);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = [
      process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      "gemini-3.0-flash",
      "gemini-2.5-flash",
    ];

    const prompt = `You are a culinary data normalizer for a vegan/vegetarian guide app.
A user provided feedback for a dish in a restaurant menu.

Dish context:
- Dish name: "${dishName}"
${dishDescription ? `- Dish description: "${dishDescription}"` : ""}
- Selected verdict: ${verdict}
- User's raw note: "${trimmedNote}"
${targetModification ? `- Practical adaptation target: ${targetModification}` : ""}

Rules for evaluation:
1. Input language: The user note might be in ANY language (Catalan, Spanish, English, French, Italian, German, etc.) and may contain typos, abbreviations, or informal phrasing (e.g. "pasta port ous", "sens llet", "sin queso", "sans gluten mais avec oeuf"). Understand its actual meaning regardless of input language.
2. Garbage/Spam detection: If the user input is nonsense, gibberish (e.g. "xlkzjv", "asdfg"), spam, or meaningless, set "isMeaningful" to false.
3. Standardized format for reasons (when meaningful):
   - In English ("reason"):
     - If non-vegan/non-vegetarian: Start with "Contains [ingredient]..." (e.g., "Contains egg (fresh pasta contains egg)" or "Contains dairy cheese").
     - If vegan: "100% plant-based ingredients" or concise confirmation (e.g., "Prepared with vegetable oil and no animal ingredients").
   - In Catalan ("reasonCa"):
     - If non-vegan/non-vegetarian: Start with "Conté [ingredient]..." (e.g., "Conté ou (la pasta fresca porta ou)" or "Conté formatge lacti").
     - If vegan: "Ingredients 100% vegetals" or concise confirmation (e.g., "Elaborat amb oli vegetal i sense derivats animals").
4. Standardized format for adaptations ("modificationNote" / "modificationNoteCa"):
   - English: "Ask without [ingredient]" or "Request [substitute] instead of [ingredient]".
   - Catalan: "Demanar sense [ingredient]" or "Demanar canvi de [ingredient] per [substitut]".`;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isMeaningful: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
                reasonCa: { type: Type.STRING },
                modificationNote: { type: Type.STRING },
                modificationNoteCa: { type: Type.STRING },
              },
              required: ["isMeaningful", "reason", "reasonCa"],
            },
          },
        });

        const text = response.text;
        if (!text) continue;
        const parsed = JSON.parse(text) as {
          isMeaningful: boolean;
          reason: string;
          reasonCa: string;
          modificationNote?: string;
          modificationNoteCa?: string;
        };

        if (!parsed.isMeaningful) {
          return this.fallbackDishFeedback({ ...params, rawNote: "" });
        }

        const modifications: MenuItemModification[] = [];
        if (targetModification && parsed.modificationNote?.trim()) {
          modifications.push({
            target: targetModification,
            note: parsed.modificationNote.trim(),
            noteCa: parsed.modificationNoteCa?.trim(),
          });
        }

        return {
          reason: parsed.reason.trim() || defaultVerdictReason(verdict, "en"),
          reasonCa: parsed.reasonCa.trim() || defaultVerdictReason(verdict, "ca"),
          modificationNote: parsed.modificationNote?.trim(),
          modificationNoteCa: parsed.modificationNoteCa?.trim(),
          modifications,
        };
      } catch {
        // Try next fallback model
      }
    }

    return this.fallbackDishFeedback(params);
  }

  async polishRestaurantNotes(rawNotes: string): Promise<PolishedRestaurantNotes> {
    const trimmed = rawNotes.trim();
    if (!trimmed || isNonsenseOrSpam(trimmed)) {
      return { communityNotes: "", communityNotesCa: "" };
    }
    if (!process.env.GEMINI_API_KEY) {
      return { communityNotes: trimmed, communityNotesCa: trimmed };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = [
      process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      "gemini-3.0-flash",
      "gemini-2.5-flash",
    ];

    const prompt = `A user provided a restaurant-wide note or warning (e.g. shared fryers, cross-contamination, bread contains milk, etc.).
Raw user text (may be in Catalan, Spanish, English, etc., with typos): "${trimmed}"

Task:
1. If the input is nonsense, gibberish or spam, set "isMeaningful" to false.
2. If meaningful, produce a clear, standardized note in English (communityNotes) and Catalan (communityNotesCa).`;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isMeaningful: { type: Type.BOOLEAN },
                communityNotes: { type: Type.STRING },
                communityNotesCa: { type: Type.STRING },
              },
              required: ["isMeaningful", "communityNotes", "communityNotesCa"],
            },
          },
        });

        const text = response.text;
        if (!text) continue;
        const parsed = JSON.parse(text) as {
          isMeaningful: boolean;
          communityNotes: string;
          communityNotesCa: string;
        };

        if (!parsed.isMeaningful) {
          return { communityNotes: "", communityNotesCa: "" };
        }

        return {
          communityNotes: parsed.communityNotes.trim() || trimmed,
          communityNotesCa: parsed.communityNotesCa.trim() || trimmed,
        };
      } catch {
        // Try next fallback
      }
    }

    return { communityNotes: trimmed, communityNotesCa: trimmed };
  }

  private fallbackDishFeedback(params: {
    verdict: DietVerdict;
    rawNote: string;
    targetModification?: "vegan" | "vegetarian";
  }): PolishedDishFeedback {
    const trimmed = params.rawNote.trim();
    const reason = trimmed || defaultVerdictReason(params.verdict, "en");
    const reasonCa = trimmed || defaultVerdictReason(params.verdict, "ca");

    const modifications: MenuItemModification[] = [];
    if (params.targetModification && trimmed) {
      modifications.push({
        target: params.targetModification,
        note: trimmed,
        noteCa: trimmed,
      });
    }
    return {
      reason,
      reasonCa,
      modificationNote: params.targetModification && trimmed ? trimmed : undefined,
      modificationNoteCa: params.targetModification && trimmed ? trimmed : undefined,
      modifications,
    };
  }
}

