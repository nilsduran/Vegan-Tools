import { GoogleGenAI } from "@google/genai";

export interface IngredientImage {
  mimetype: string;
  buffer: Buffer;
}

export interface IngredientExtractor {
  extract(image: IngredientImage): Promise<string>;
}

export class GeminiIngredientExtractor implements IngredientExtractor {
  async extract(image: IngredientImage): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Ingredient photo reading is not configured. You can still type or paste the label.",
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = [...new Set([
      process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
    ])];
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
    let lastError: unknown;

    for (const model of models) {
      for (const delay of [0, 800]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          response = await ai.models.generateContent({
            model,
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: image.mimetype,
                    data: image.buffer.toString("base64"),
                  },
                },
                {
                  text:
                    "Transcribe the ingredient list from this product label exactly. " +
                    "Include any 'may contain' or trace statement. Return plain text only. " +
                    "Do not classify, translate, explain or invent unreadable words.",
                },
              ],
            }],
          });
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (!/404|429|503|not found|not supported|resource_exhausted|unavailable|high demand|overload/i
            .test(message)) throw error;
          if (/404|not found|not supported/i.test(message)) break;
        }
      }
      if (response) break;
    }
    if (!response) throw lastError;

    const text = response.text?.trim();
    if (!text) throw new Error("No readable ingredient list was found in the photo.");
    return text;
  }
}
