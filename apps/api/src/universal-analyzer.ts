/**
 * @file universal-analyzer.ts
 * @description The universal scanner's AI step: tells what a photo or a web page shows
 * (ingredient label, food, cosmetic, clothing, activity, place, menu, other) and whether
 * it involves animals, and looks up whether a cosmetics brand tests on animals.
 *
 * Quality rules (docs/architecture.md §6):
 * - An ingredient label is only transcribed here; the verdict comes from the
 *   deterministic classifier, exactly as when the text is typed.
 * - Everything else is automatic identification: it can never yield a definitive
 *   "vegan" (capAutomatedVerdict) and is always labelled as unverified.
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  capAutomatedVerdict,
  classifyIngredients,
  isValidGtin,
  normalizeGtin,
  scanSubjectSchema,
  type BrandEthics,
  type DietVerdict,
  type ScanSource,
  type ScanSubject,
  type UniversalScanResult,
} from "@vegan-tools/domain";
import { recordGeminiCall } from "./usage-counters.js";

export type ScanLanguage = "ca" | "en";

export interface ScanImage {
  mimetype: string;
  buffer: Buffer;
}

export interface ScanText {
  /** Page title, description and visible text, or a product name and brand. */
  text: string;
  url?: string;
  /** Extra context for the model, e.g. "identified by barcode in Open Products Facts". */
  hint?: string;
}

export interface UniversalAnalyzer {
  analyzeImage(image: ScanImage, language: ScanLanguage): Promise<UniversalScanResult>;
  analyzeText(input: ScanText, language: ScanLanguage): Promise<UniversalScanResult>;
  findBrandEthics(brand: string, language: ScanLanguage): Promise<BrandEthics>;
}

/** What the model returns before the quality rules are applied. */
export interface RawScanAnswer {
  subject?: string;
  title?: string;
  brand?: string;
  verdict?: string;
  reason?: string;
  concerns?: string[];
  alternatives?: string[];
  ingredientsText?: string;
  gtin?: string;
}

const VERDICTS: DietVerdict[] = [
  "vegan",
  "probably_vegan",
  "vegetarian",
  "probably_vegetarian",
  "non_vegetarian",
  "unknown",
];

/** Applies the quality rules to a model answer. Pure, so it is unit-tested. */
export function finalizeScanAnswer(
  raw: RawScanAnswer,
  extras: { sources?: ScanSource[]; url?: string } = {},
): UniversalScanResult {
  const subject: ScanSubject = scanSubjectSchema.safeParse(raw.subject).success
    ? (raw.subject as ScanSubject)
    : "other";
  const gtin = raw.gtin && isValidGtin(raw.gtin) ? normalizeGtin(raw.gtin) : undefined;
  const base = {
    subject,
    title: raw.title?.trim() || "",
    brand: raw.brand?.trim() || undefined,
    concerns: (raw.concerns ?? []).filter(Boolean).slice(0, 6),
    alternatives: (raw.alternatives ?? []).filter(Boolean).slice(0, 4),
    gtin,
    menuUrl: subject === "menu" && extras.url ? extras.url : undefined,
    sources: extras.sources ?? [],
  };

  const labelText = raw.ingredientsText?.trim();
  if (subject === "ingredient_label" && labelText) {
    const analysis = classifyIngredients(labelText, { assurance: "label_based" });
    return {
      ...base,
      verdict: analysis.verdict,
      reason: analysis.reason,
      ingredientsText: labelText,
      findings: analysis.findings,
      traces: analysis.traces,
      assurance: "label_based",
    };
  }

  const verdict = VERDICTS.includes(raw.verdict as DietVerdict) ? (raw.verdict as DietVerdict) : "unknown";
  return {
    ...base,
    verdict: capAutomatedVerdict(verdict),
    reason: raw.reason?.trim() || "",
    ingredientsText: labelText || undefined,
    findings: [],
    traces: [],
    assurance: "unverified",
  };
}

function languageName(language: ScanLanguage) {
  return language === "ca" ? "Catalan" : "English";
}

const SCAN_RULES = `You help ethical vegans (antispeciesist: no animal use of any kind) decide about what they see.
Decide what is shown, as "subject":
- ingredient_label: a list of ingredients is readable. Transcribe it exactly in "ingredientsText" (including "may contain" statements); do not judge it, another system does.
- food: a food or drink product or dish without a readable ingredient list.
- cosmetic: cosmetics, hygiene, cleaning or household chemicals.
- clothing: clothes, shoes, bags, accessories, furniture or other material goods.
- activity: an activity, show, excursion, sport or event (e.g. horse riding, zoo, aquarium, circus, bullfight, dolphin show, camel or elephant ride, fishing, hunting, rodeo, races).
- place: a venue or business that is not a restaurant menu (shop, farm, sanctuary, museum...).
- menu: a restaurant or bar menu.
- other: anything else.
"verdict" for the subject:
- vegan: no animal products and no animal use. probably_vegan: likely, but something cannot be confirmed.
- vegetarian / probably_vegetarian: food with dairy, egg or honey but no slaughter.
- non_vegetarian: contains animal flesh, or (for non-food) uses animals or animal materials: leather, wool, silk, down, fur, animal testing, animals used for entertainment, riding, work or display.
- unknown: not enough information.
Be precise and conservative: never call something vegan when animal use is plausible and unconfirmed.
Sanctuaries that rescue animals without breeding, riding or selling them are vegan places.
"reason": one or two short sentences. "concerns": the specific animal-related issues (empty if none).
"alternatives": up to three vegan alternatives when the verdict is not vegan (e.g. visiting an animal sanctuary instead of horse riding).
"title": a short name of what is shown. "brand": brand if visible. "gtin": a barcode number only if clearly visible.`;

const SCAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, enum: [...scanSubjectSchema.options] },
    title: { type: Type.STRING },
    brand: { type: Type.STRING },
    verdict: { type: Type.STRING, enum: VERDICTS },
    reason: { type: Type.STRING },
    concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
    alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredientsText: { type: Type.STRING },
    gtin: { type: Type.STRING },
  },
  required: ["subject", "title", "verdict", "reason"],
};

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
type GenerateResult = Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;

function isRetryable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|503|resource_exhausted|unavailable|high demand|overload/i.test(message);
}

function isModelMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /404|not found|not supported/i.test(message);
}

/** Parses the first JSON object in a model's free-text answer (search-grounded calls cannot force JSON). */
export function parseJsonObject(text: string | undefined): Record<string, unknown> | undefined {
  if (!text) return undefined;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const value = JSON.parse(text.slice(start, end + 1));
    return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export class GeminiUniversalAnalyzer implements UniversalAnalyzer {
  private readonly brandCache = new Map<string, { value: BrandEthics; expiresAt: number }>();

  private client(): GoogleGenAI {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Automatic recognition is not configured. You can still scan a barcode or type the ingredients.");
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private async generate(feature: string, params: Omit<GenerateParams, "model">, models: string[]): Promise<GenerateResult> {
    const ai = this.client();
    let lastError: unknown;
    for (const model of [...new Set(models)]) {
      for (const delay of [0, 800]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const response = await ai.models.generateContent({ ...params, model });
          recordGeminiCall(feature, response);
          return response;
        } catch (error) {
          lastError = error;
          if (isModelMissing(error)) break;
          if (!isRetryable(error)) throw error;
        }
      }
    }
    throw lastError;
  }

  private models() {
    return [process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
  }

  async analyzeImage(image: ScanImage, language: ScanLanguage): Promise<UniversalScanResult> {
    const response = await this.generate(
      "scan_photo",
      {
        contents: [{
          parts: [
            { inlineData: { mimeType: image.mimetype, data: image.buffer.toString("base64") } },
            { text: `${SCAN_RULES}\nWrite "reason", "concerns" and "alternatives" in ${languageName(language)}. Keep "ingredientsText" in its original language.` },
          ],
        }],
        config: { responseMimeType: "application/json", responseSchema: SCAN_SCHEMA, temperature: 0 },
      },
      this.models(),
    );
    const raw = parseJsonObject(response.text) as RawScanAnswer | undefined;
    if (!raw) throw new Error("The photo could not be recognised. Try a clearer photo or scan the barcode.");
    return finalizeScanAnswer(raw);
  }

  async analyzeText(input: ScanText, language: ScanLanguage): Promise<UniversalScanResult> {
    const response = await this.generate(
      "scan_text",
      {
        contents: [`${SCAN_RULES}
Write "reason", "concerns" and "alternatives" in ${languageName(language)}.
${input.hint ? `Context: ${input.hint}\n` : ""}${input.url ? `Address: ${input.url}\n` : ""}Content:
"""
${input.text.slice(0, 8_000)}
"""`],
        config: { responseMimeType: "application/json", responseSchema: SCAN_SCHEMA, temperature: 0 },
      },
      this.models(),
    );
    const raw = parseJsonObject(response.text) as RawScanAnswer | undefined;
    if (!raw) throw new Error("This content could not be recognised.");
    return finalizeScanAnswer(raw, { url: input.url });
  }

  async findBrandEthics(brand: string, language: ScanLanguage): Promise<BrandEthics> {
    const key = `${brand.trim().toLowerCase()}|${language}`;
    const cached = this.brandCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const response = await this.generate(
      "brand",
      {
        contents: [`Use Google Search to find out whether the cosmetics or household brand "${brand}" tests on animals.
Look for current certifications (Leaping Bunny, PETA Beauty Without Bunnies, Cruelty Free International), sales where animal testing is required by law, and whether its parent company tests on animals.
Answer ONLY with JSON: {"status": "cruelty_free" | "tests_on_animals" | "unknown", "parentCompany": string or null, "summary": string}.
Use "cruelty_free" only if a recognised certification or an explicit, current no-testing policy covering the brand is found; otherwise "unknown".
Write "summary" in ${languageName(language)}, at most two sentences, naming the certification or source.`],
        config: { tools: [{ googleSearch: {} }], temperature: 0 },
      },
      [process.env.GEMINI_WEBSITE_MODEL ?? "gemini-3.1-flash-lite", "gemini-3.5-flash"],
    );

    const sources: ScanSource[] = [];
    for (const candidate of response.candidates ?? []) {
      for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
        const url = chunk.web?.uri;
        if (url && !sources.some((source) => source.url === url)) {
          sources.push({ url, title: chunk.web?.title ?? undefined });
        }
      }
    }
    const parsed = parseJsonObject(response.text);
    const status = parsed?.status === "cruelty_free" || parsed?.status === "tests_on_animals" ? parsed.status : "unknown";
    const value: BrandEthics = {
      brand,
      // A "cruelty free" answer without any search source is not trusted.
      status: status === "cruelty_free" && sources.length === 0 ? "unknown" : status,
      parentCompany: typeof parsed?.parentCompany === "string" && parsed.parentCompany ? parsed.parentCompany : undefined,
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
      sources: sources.slice(0, 5),
      checkedAt: new Date().toISOString(),
    };
    this.brandCache.set(key, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return value;
  }
}
