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
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-3-flash",
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

    const text = response.text?.trim();
    if (!text) throw new Error("No readable ingredient list was found in the photo.");
    return text;
  }
}
