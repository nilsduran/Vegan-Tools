import { randomUUID } from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { menuDraftSchema, type MenuDraft } from "@vegan-tools/domain";

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
Never guess that a dish is vegan. Use "unknown" whenever ingredients are incomplete.
Allowed verdicts: vegan, probably_vegan, vegetarian, probably_vegetarian, non_vegetarian, unknown.
Modification notes must begin with "Ask whether it can be prepared..." and are suggestions, not guarantees.
Return JSON matching the supplied schema.`,
      },
    ];

    const generate = () => ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-3-flash",
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
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        originalName: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        price: { type: Type.STRING },
                        verdict: {
                          type: Type.STRING,
                          enum: ["vegan", "probably_vegan", "vegetarian", "probably_vegetarian", "non_vegetarian", "unknown"],
                        },
                        reason: { type: Type.STRING },
                        modificationNote: { type: Type.STRING },
                        modifiableTo: {
                          type: Type.STRING,
                          enum: ["vegan", "vegetarian"],
                        },
                      },
                      required: ["originalName", "name", "verdict", "reason"],
                    },
                  },
                },
                required: ["name", "items"],
              },
            },
          },
          required: ["restaurantName", "originalLanguage", "sections"],
        },
      },
    });

    let response: Awaited<ReturnType<typeof generate>>;
    try {
      response = await generate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/503|unavailable|high demand|overload/i.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350));
      response = await generate();
    }

    const parsed = JSON.parse(response.text ?? "{}") as Record<string, unknown>;
    return menuDraftSchema.parse({
      ...menu,
      ...parsed,
      status: "ready",
      sections: ((parsed.sections as Array<Record<string, unknown>>) ?? []).map((section) => ({
        ...section,
        id: randomUUID(),
        items: ((section.items as Array<Record<string, unknown>>) ?? []).map((item) => ({
          description: "",
          price: "",
          ...item,
          id: randomUUID(),
        })),
      })),
    });
  }
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
          },
        ],
      },
    ],
  };
}
