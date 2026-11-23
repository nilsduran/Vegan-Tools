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
import { downloadPublicUrl, extractVisibleText } from "./menu-discovery.js";

export type ScanLanguage = "ca" | "en";

export interface ScanImage {
  mimetype: string;
  buffer: Buffer;
}

export interface ScanText {
  /** Page title, description and visible text, or a product name and brand. */
  text: string;
  url?: string;
  /** Page title, shown as the source's name. */
  title?: string;
  /** Extra context for the model, e.g. "identified by barcode in Open Products Facts". */
  hint?: string;
}

/** What a web search found about a barcode the databases could not answer. */
export interface ProductResearch {
  found: boolean;
  productName?: string;
  brand?: string;
  category?: "food" | "cosmetic" | "household" | "clothing" | "other";
  /** Ingredient list exactly as published by the manufacturer or a shop. */
  ingredientsText?: string;
  manufacturerVeganClaim?: boolean;
  /** Only for products without an ingredient list (materials). */
  verdict?: DietVerdict;
  reason?: string;
  sources: ScanSource[];
}

export interface UniversalAnalyzer {
  analyzeImage(image: ScanImage, language: ScanLanguage): Promise<UniversalScanResult>;
  analyzeText(input: ScanText, language: ScanLanguage): Promise<UniversalScanResult>;
  findBrandEthics(brand: string, language: ScanLanguage): Promise<BrandEthics>;
  researchProduct(input: { gtin: string; productName?: string; brand?: string }): Promise<ProductResearch>;
  /** A product page that cannot be downloaded (shops often block it): identified by a web search. */
  researchLink(url: string, language: ScanLanguage): Promise<UniversalScanResult>;
}

/** Models answer the category in free text ("Sunscreen / Face Fluid"): map it to ours. */
export function productCategoryOf(value: unknown): ProductResearch["category"] {
  if (typeof value !== "string") return undefined;
  const text = value.toLowerCase();
  if (/cosmetic|skin|sun ?screen|sunscreen|spf|cream|lotion|shampoo|soap|deodorant|make-?up|lipstick|perfume|toothpaste|hygiene|beauty|hair|nail|crema|cosmètic|cosmétique/.test(text)) return "cosmetic";
  if (/detergent|cleaning|household|laundry|dish|cleaner|neteja|limpieza/.test(text)) return "household";
  if (/cloth|apparel|shoe|boot|sneaker|bag|jacket|garment|textile|fashion|roba|ropa|calçat/.test(text)) return "clothing";
  if (/food|drink|beverage|snack|beverage|aliment|comida|menjar|wine|beer|juice/.test(text)) return "food";
  return "other";
}

/** Normalises a search-grounded answer about a product. Pure, so it is unit-tested. */
export function finalizeProductResearch(parsed: Record<string, unknown> | undefined, sources: ScanSource[]): ProductResearch {
  const text = (value: unknown) => (typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "null" ? value.trim() : undefined);
  const category = productCategoryOf(parsed?.category);
  const verdict = VERDICTS.find((value) => value === parsed?.verdict);
  return {
    // Without any web source the answer is not trusted at all.
    found: parsed?.found === true && sources.length > 0,
    productName: text(parsed?.productName),
    brand: text(parsed?.brand),
    category,
    ingredientsText: text(parsed?.ingredientsText),
    manufacturerVeganClaim: parsed?.manufacturerVeganClaim === true,
    verdict,
    reason: text(parsed?.reason),
    sources: sources.slice(0, 5),
  };
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

/** Older-generation model that stays available when the newer ones are overloaded. */
export const BACKUP_MODEL = "gemini-2.5-flash";

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
  // A list read from a page (shop, manufacturer) is judged by the rules too,
  // never by the model's opinion; it is not the label in hand, so it stays
  // an automated answer.
  if ((subject === "food" || subject === "cosmetic") && labelText && labelText.split(/[,;]/).length >= 3) {
    const analysis = classifyIngredients(labelText, { assurance: "unverified" });
    return {
      ...base,
      verdict: capAutomatedVerdict(analysis.verdict),
      reason: analysis.reason,
      ingredientsText: labelText,
      findings: analysis.findings,
      traces: analysis.traces,
      assurance: "unverified",
    };
  }
  if (subject === "ingredient_label" && labelText) {
    const analysis = classifyIngredients(labelText, { assurance: "label_based", fromPhoto: true });
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

  let verdict = VERDICTS.includes(raw.verdict as DietVerdict) ? (raw.verdict as DietVerdict) : "unknown";
  // Models call dairy "non-vegetarian" despite the instructions. For food, that
  // verdict stands only if the rules find flesh (meat, fish, gelatine...) in the
  // model's own explanation; otherwise it is "probably vegetarian" (still not vegan).
  if (subject === "food" && verdict === "non_vegetarian") {
    const explanation = [raw.title, raw.reason, ...(raw.concerns ?? [])].filter(Boolean).join(", ");
    if (classifyIngredients(explanation).verdict !== "non_vegetarian") verdict = "probably_vegetarian";
  }
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
- ingredient_label: a photo where a list of ingredients is readable. Transcribe it exactly in "ingredientsText" (including "may contain" statements); do not judge it, another system does.
- food: a food or drink product or dish without a readable ingredient list.
- cosmetic: cosmetics, hygiene, cleaning or household chemicals.
- clothing: clothes, shoes, bags, accessories, furniture or other material goods.
- activity: an activity, show, excursion, sport or event (e.g. horse riding, zoo, aquarium, circus, bullfight, dolphin show, camel or elephant ride, fishing, hunting, rodeo, races).
- place: a venue or business that is not a restaurant menu (shop, farm, sanctuary, museum...).
- menu: a restaurant or bar menu.
- other: anything else.
"verdict" for the subject:
- vegan: no animal products and no animal use. probably_vegan: likely, but something cannot be confirmed.
- vegetarian / probably_vegetarian: food with dairy, egg or honey but no slaughter. Milk, egg or honey alone NEVER make a food non_vegetarian.
- non_vegetarian: contains animal flesh, or (for non-food) uses animals or animal materials: leather, wool, silk, down, fur, animal testing, animals used for entertainment, riding, work or display.
- unknown: not enough information.
Be precise and conservative: never call something vegan when animal use is plausible and unconfirmed.
Sanctuaries that rescue animals without breeding, riding or selling them are vegan places.
"reason": one or two short sentences. "concerns": the specific animal-related issues (empty if none).
"alternatives": up to three vegan alternatives when the verdict is not vegan (e.g. visiting an animal sanctuary instead of horse riding).
"title": a short name of what is shown. "brand": brand if visible. "gtin": a barcode number only if clearly visible.
For a food or cosmetic product page, copy its ingredient list exactly in "ingredientsText" when the page shows one (another system judges it).`;

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
  // Each balanced {...} block in order (models sometimes add prose or a second block).
  for (let start = text.indexOf("{"); start >= 0; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (char === "\\") index += 1;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const value = JSON.parse(text.slice(start, index + 1));
            if (value && typeof value === "object") return value as Record<string, unknown>;
          } catch {
            // Not valid JSON: try the next block.
          }
          break;
        }
      }
    }
  }
  return undefined;
}

function normalizeForMatch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Whether an ingredient list really appears on a page: most of its first ingredients
 * (at least 5 of the first 8) must be found in the page text.
 */
export function listAppearsInText(list: string, pageText: string): boolean {
  const page = ` ${normalizeForMatch(pageText)} `;
  const items = list
    .split(/[,;]/)
    .map((item) => normalizeForMatch(item.replace(/\([^)]*\)/g, "")))
    .filter((item) => item.length >= 3)
    .slice(0, 8);
  if (items.length < 3) return false;
  const found = items.filter((item) => page.includes(` ${item} `)).length;
  return found >= Math.min(5, items.length);
}

/** Web pages a search-grounded answer was based on. */
function groundingSources(response: GenerateResult): ScanSource[] {
  const sources: ScanSource[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
      const url = chunk.web?.uri;
      if (url && !sources.some((source) => source.url === url)) {
        sources.push({ url, title: chunk.web?.title ?? undefined });
      }
    }
  }
  return sources;
}

export class GeminiUniversalAnalyzer implements UniversalAnalyzer {
  constructor(private readonly download: typeof downloadPublicUrl = downloadPublicUrl) {}

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
    // The last model is an older generation kept as a backup: on 23 November 2026
    // the two newer backups answered 503 (overloaded) and 429 (quota) at once,
    // so every photo failed whenever the first model was busy.
    return [process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", BACKUP_MODEL];
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
    return finalizeScanAnswer(raw, {
      url: input.url,
      sources: input.url ? [{ url: input.url, title: input.title || undefined }] : [],
    });
  }

  async researchLink(url: string, language: ScanLanguage): Promise<UniversalScanResult> {
    const response = await this.generate(
      "scan_link_search",
      {
        contents: [`${SCAN_RULES}
Write "reason", "concerns" and "alternatives" in ${languageName(language)}.
The page at this address cannot be downloaded: ${url}
Use Google Search to find out which product or thing it is (the address often names it) and its ingredients or materials, from the manufacturer or shops.
Copy an ingredient list in "ingredientsText" only exactly as published. If you cannot identify it, use verdict "unknown".
Answer only with one JSON object with the keys: subject, title, brand, verdict, reason, concerns, alternatives, ingredientsText.`],
        config: { tools: [{ googleSearch: {} }], temperature: 0 },
      },
      this.models(),
    );
    const raw = parseJsonObject(response.text) as RawScanAnswer | undefined;
    if (!raw) throw new Error("This link could not be checked.");
    return finalizeScanAnswer(raw, { url, sources: groundingSources(response) });
  }

  async researchProduct(input: { gtin: string; productName?: string; brand?: string }): Promise<ProductResearch> {
    const known = [input.productName && `Name in a product database: ${input.productName}`, input.brand && `Brand: ${input.brand}`]
      .filter(Boolean)
      .join("\n");
    const params: [string, Omit<GenerateParams, "model">, string[]] = [
      "product_research",
      {
        contents: [`Use Google Search to identify the product with barcode (EAN/GTIN) ${input.gtin} and find its ingredient list.
${known}
If a product name is given, search by that name (and brand): it comes from a product database for this barcode, so the barcode itself need not appear on the page.
Prefer the manufacturer's website, then large retailers or pharmacies. For cosmetics the list is the INCI list.
Answer ONLY with JSON:
{"found": true or false, "productName": string, "brand": string, "category": "food" | "cosmetic" | "household" | "clothing" | "other",
 "ingredientsText": the complete ingredient list copied exactly from a page you found, or null,
 "manufacturerVeganClaim": true only if the manufacturer explicitly states the product is vegan,
 "verdict": for products without ingredients (clothing, shoes, objects) one of "vegan", "probably_vegan", "non_vegetarian", "unknown" based on their materials, else "unknown",
 "reason": one short English sentence about the materials, or null,
 "sourceUrl": the address of the page where you read the ingredient list, or null}
Never guess or reconstruct an ingredient list. If neither the barcode nor the given name can be matched to a specific product, answer {"found": false}.`],
        config: { tools: [{ googleSearch: {} }], temperature: 0 },
      },
      [process.env.GEMINI_WEBSITE_MODEL ?? "gemini-3.1-flash-lite", "gemini-3.5-flash", BACKUP_MODEL]
    ];
    // Search-grounded answers are sometimes empty: one more try before giving up.
    let response = await this.generate(...params);
    if (!response.text?.trim()) response = await this.generate(...params);
    if (!response.text?.trim()) {
      // Quota or search outage: a failure, not "no product found", so nothing gets cached.
      throw new Error("The product web search returned no answer.");
    }
    const parsed = parseJsonObject(response.text);
    const sources = groundingSources(response);
    const cited = typeof parsed?.sourceUrl === "string" ? parsed.sourceUrl : undefined;
    const list = typeof parsed?.ingredientsText === "string" ? parsed.ingredientsText : "";
    if (cited && list && (await this.listIsOnPage(cited, list))) {
      // The page the model cites really contains the list: that is the source to show.
      sources.unshift({ url: cited, title: new URL(cited).hostname });
    } else if (parsed && list) {
      // An ingredient list that cannot be found on a cited page may be invented.
      delete parsed.ingredientsText;
    }
    return finalizeProductResearch(parsed, sources);
  }

  /** Downloads the cited page (SSRF-protected) and checks that the ingredient list is really there. */
  private async listIsOnPage(url: string, list: string): Promise<boolean> {
    try {
      const page = await this.download(new URL(url));
      if (!page.mimetype.includes("html") && !page.mimetype.startsWith("text/")) return false;
      return listAppearsInText(list, extractVisibleText(page.buffer.toString("utf8")));
    } catch {
      return false;
    }
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

    const sources = groundingSources(response);
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
