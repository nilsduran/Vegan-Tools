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

    if (!process.env.GEMINI_API_KEY || !trimmedNote) {
      return this.fallbackDishFeedback(params);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = [
      process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      "gemini-3.0-flash",
      "gemini-2.5-flash",
    ];

    const prompt = `A user provided feedback for a restaurant dish.
Dish name: ${dishName}
${dishDescription ? `Dish description: ${dishDescription}` : ""}
Verdict: ${verdict}
User's raw note/comment (may contain typos, slang, or any language): "${trimmedNote}"
${targetModification ? `Target modification: ${targetModification}` : ""}

Task:
1. Fix any spelling or typographical mistakes in the user note.
2. Produce a clear, concise reason in English (reason) and in Catalan (reasonCa).
3. If an adaptation is possible (or targetModification is specified), provide adaptation guidance in English (modificationNote) and Catalan (modificationNoteCa).`;

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
                reason: { type: Type.STRING },
                reasonCa: { type: Type.STRING },
                modificationNote: { type: Type.STRING },
                modificationNoteCa: { type: Type.STRING },
              },
              required: ["reason", "reasonCa"],
            },
          },
        });

        const text = response.text;
        if (!text) continue;
        const parsed = JSON.parse(text) as {
          reason: string;
          reasonCa: string;
          modificationNote?: string;
          modificationNoteCa?: string;
        };

        const modifications: MenuItemModification[] = [];
        if (targetModification && parsed.modificationNote) {
          modifications.push({
            target: targetModification,
            note: parsed.modificationNote,
            noteCa: parsed.modificationNoteCa,
          });
        }

        return {
          reason: parsed.reason || trimmedNote,
          reasonCa: parsed.reasonCa || trimmedNote,
          modificationNote: parsed.modificationNote,
          modificationNoteCa: parsed.modificationNoteCa,
          modifications,
        };
      } catch {
        // Try next model fallback
      }
    }

    return this.fallbackDishFeedback(params);
  }

  async polishRestaurantNotes(rawNotes: string): Promise<PolishedRestaurantNotes> {
    const trimmed = rawNotes.trim();
    if (!trimmed) {
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

    const prompt = `A user provided a community note or warning for a restaurant.
User's raw note (may have typos, slang, or be in Catalan/Spanish/English): "${trimmed}"

Task:
1. Fix any typos or grammatical mistakes.
2. Produce a clean, informative version in English (communityNotes) and Catalan (communityNotesCa).`;

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
                communityNotes: { type: Type.STRING },
                communityNotesCa: { type: Type.STRING },
              },
              required: ["communityNotes", "communityNotesCa"],
            },
          },
        });

        const text = response.text;
        if (!text) continue;
        const parsed = JSON.parse(text) as {
          communityNotes: string;
          communityNotesCa: string;
        };

        return {
          communityNotes: parsed.communityNotes || trimmed,
          communityNotesCa: parsed.communityNotesCa || trimmed,
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
    const modifications: MenuItemModification[] = [];
    if (params.targetModification && trimmed) {
      modifications.push({
        target: params.targetModification,
        note: trimmed,
        noteCa: trimmed,
      });
    }
    return {
      reason: trimmed,
      reasonCa: trimmed,
      modificationNote: params.targetModification ? trimmed : undefined,
      modificationNoteCa: params.targetModification ? trimmed : undefined,
      modifications,
    };
  }
}
