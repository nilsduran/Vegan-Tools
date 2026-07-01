import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { MenuData } from "../types";

export async function analyzeMenu(files: File[]): Promise<MenuData> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey as string });

  const fileParts = await Promise.all(
    files.map(async (file) => {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Error en llegir el fitxer."));
        reader.readAsDataURL(file);
      });

      return {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      };
    })
  );

  const parts = [
    ...fileParts,
    {
      text: `You are an expert menu analyzer. Extract ALL food items from the provided restaurant menu image(s)/document(s).
    
Instructions:
1. Group the items into their respective sections (e.g., "Entrants", "Plats Principals", "Postres").
2. For each item, extract the name, description, and price. DO NOT SKIP ANY FOOD ITEMS. However, DO NOT extract any drinks, beverages, cocktails, wines, or sodas. Skip drinks entirely. Ensure the price is extracted if visible (e.g., "12€", "12.50", "12"). If the price is missing, leave it empty.
3. Categorize EVERY item strictly as "vegan", "vegetarian", or "carnivore".
   - "vegan": Contains no animal products.
   - "vegetarian": Contains no meat/fish, but may contain dairy/eggs.
   - "carnivore": Contains meat or fish.
4. If an item is "carnivore" or "vegetarian", provide a short \`modificationNote\` ONLY IF there is an easy modification to make it vegan/vegetarian (e.g., "Sense formatge", "Substituir la carn per tofu"). If no easy modification exists, leave it empty. Also provide \`modifiableTo\` indicating if the modification makes it "vegan" or "vegetarian".
5. Translate all extracted text (restaurant name, section names, dish names, descriptions, and notes) into Catalan.
6. Return the result STRICTLY matching the provided JSON schema. Do not dump raw text into a single field.`
    }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: parts
      }
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          restaurantName: { type: Type.STRING, description: "The name of the restaurant, if visible (in Catalan)." },
          sections: {
            type: Type.ARRAY,
            description: "List of menu sections",
            items: {
              type: Type.OBJECT,
              properties: {
                sectionName: { type: Type.STRING, description: "The name of the menu section (e.g., Entrants, Plats Principals)." },
                items: {
                  type: Type.ARRAY,
                  description: "List of dishes in this section",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "The name of the dish (in Catalan)." },
                      description: { type: Type.STRING, description: "The description of the dish (in Catalan)." },
                      price: { type: Type.STRING, description: "The price of the dish." },
                      category: { type: Type.STRING, description: "Must be exactly one of: 'vegan', 'vegetarian', 'carnivore'" },
                      modificationNote: { type: Type.STRING, description: "Short note on how to make it vegan/vegetarian, if applicable (in Catalan)." },
                      modifiableTo: { type: Type.STRING, description: "If modifiable, what does it become? 'vegan' or 'vegetarian'. Leave empty if not modifiable." }
                    },
                    required: ["name", "category"]
                  }
                }
              },
              required: ["sectionName", "items"]
            }
          }
        },
        required: ["sections"]
      }
    }
  });

  let text = response.text;
  if (!text) {
    throw new Error("No s'ha rebut cap resposta de Gemini.");
  }

  // Clean up markdown formatting if present
  text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(text) as MenuData;
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("El format de la resposta no és vàlid. Si us plau, torna-ho a provar.");
  }
}
