import { GoogleGenAI, Type } from "@google/genai";
import { ProductResult } from "./openFoodFacts";

export async function searchBarcodeWithGemini(barcode: string, useDeepSearch: boolean = false): Promise<ProductResult | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = useDeepSearch ? "gemini-3-flash-preview" : "gemini-3.1-flash-lite-preview";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Search the web for the grocery product with the barcode/EAN: ${barcode}. 
      1. Identify the product name.
      2. Find its ingredients.
      3. Determine if it is vegan, vegetarian, non-vegetarian, or unknown.
      
      You MUST return ONLY a valid JSON object (no markdown formatting, no backticks) with the following structure:
      {
        "status": "vegan" | "vegetarian" | "non-vegetarian" | "unknown",
        "reason": "brief explanation in Catalan",
        "productName": "Name of the product"
      }`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let text = response.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    
    if (!match) return null;
    
    const result = JSON.parse(match[0]);
    if (result.status === 'unknown') return null;
    
    return result as ProductResult;
  } catch (error) {
    console.error("Error searching barcode with Gemini:", error);
    return null;
  }
}

export async function analyzeIngredientsImage(base64Image: string): Promise<ProductResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Remove the data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        },
        "Analyze this image of a product's ingredients list. Determine if the product is Vegan, Vegetarian, or Neither. Return JSON with 'status' (vegan, vegetarian, non-vegetarian, or unknown) and 'reason' (a brief explanation mentioning specific ingredients if applicable, written in Catalan)."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['vegan', 'vegetarian', 'non-vegetarian', 'unknown'] },
            reason: { type: Type.STRING }
          },
          required: ['status', 'reason']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text);
    return {
      status: result.status,
      reason: result.reason,
      productName: "Analitzat des de la imatge"
    };
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    return {
      status: 'unknown',
      reason: 'No s\'ha pogut analitzar la imatge. Si us plau, torna-ho a provar.'
    };
  }
}
