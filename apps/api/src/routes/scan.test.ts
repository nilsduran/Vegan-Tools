import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrandEthics, UniversalScanResult } from "@vegan-tools/domain";
import { buildApp } from "../app.js";
import { MemoryRepository } from "../store.js";
import { finalizeScanAnswer, parseJsonObject, type UniversalAnalyzer } from "../universal-analyzer.js";
import { addressWords, judgedFromAddressOnly, pageSummary } from "./scan.js";

const horseRiding: UniversalScanResult = finalizeScanAnswer({
  subject: "activity",
  title: "Horse riding excursion",
  verdict: "non_vegetarian",
  reason: "Horses are used for riding.",
  concerns: ["Animals used for entertainment"],
  alternatives: ["Visit an animal sanctuary"],
});

function fakeAnalyzer(overrides: Partial<UniversalAnalyzer> = {}): UniversalAnalyzer {
  return {
    analyzeImage: vi.fn().mockResolvedValue(horseRiding),
    analyzeText: vi.fn().mockResolvedValue(horseRiding),
    findBrandEthics: vi.fn().mockResolvedValue({
      brand: "Brand",
      status: "cruelty_free",
      summary: "Leaping Bunny certified.",
      sources: [{ url: "https://example.org/leaping-bunny" }],
      checkedAt: "2026-11-22T00:00:00.000Z",
    } satisfies BrandEthics),
    researchProduct: vi.fn().mockResolvedValue({ found: false, sources: [] }),
    researchLink: vi.fn().mockRejectedValue(new Error("not used")),
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("finalizeScanAnswer (quality rules)", () => {
  it("never lets automatic identification say a definitive vegan", () => {
    expect(finalizeScanAnswer({ subject: "food", title: "Crackers", verdict: "vegan", reason: "" }).verdict).toBe("probably_vegan");
    expect(finalizeScanAnswer({ subject: "food", title: "Cake", verdict: "vegetarian", reason: "" }).verdict).toBe("probably_vegetarian");
    expect(horseRiding).toMatchObject({ verdict: "non_vegetarian", assurance: "unverified" });
  });

  it("judges an ingredient label with the rule engine, not the model", () => {
    const result = finalizeScanAnswer({
      subject: "ingredient_label",
      title: "Label",
      verdict: "vegan",
      reason: "model opinion",
      ingredientsText: "Wheat flour, butter, salt",
    });
    expect(result).toMatchObject({ verdict: "vegetarian", assurance: "label_based" });
    expect(result.reason).not.toBe("model opinion");
  });

  it("judges an ingredient list found on a product page with the rules, never above probably vegan", () => {
    // The model called a milk spread non-vegetarian; the rules know milk is vegetarian.
    const spread = finalizeScanAnswer({
      subject: "food",
      title: "Hazelnut spread",
      verdict: "non_vegetarian",
      reason: "model opinion",
      ingredientsText: "Sugar, palm oil, hazelnuts 13%, skimmed milk powder 8.7%, cocoa",
    });
    expect(spread).toMatchObject({ verdict: "probably_vegetarian", assurance: "unverified" });
    expect(spread.reason).not.toBe("model opinion");
    const drink = finalizeScanAnswer({ subject: "food", title: "Soy drink", verdict: "vegan", ingredientsText: "Water, hulled soya beans 8%, sugar, calcium phosphate" });
    expect(drink.verdict).toBe("probably_vegan");
  });

  it("keeps non-vegetarian for food only when the explanation names flesh", () => {
    const dairy = finalizeScanAnswer({ subject: "food", title: "Milk chocolate coated biscuits", verdict: "non_vegetarian", reason: "Coated with milk chocolate, which contains dairy." });
    expect(dairy.verdict).toBe("probably_vegetarian");
    const gummies = finalizeScanAnswer({ subject: "food", title: "Fruit gummies", verdict: "non_vegetarian", reason: "Contains gelatine." });
    expect(gummies.verdict).toBe("non_vegetarian");
    const tuna = finalizeScanAnswer({ subject: "food", title: "Tuna salad", verdict: "non_vegetarian", reason: "Contains fish." });
    expect(tuna.verdict).toBe("non_vegetarian");
  });

  it("drops unknown subjects, verdicts and invalid barcodes", () => {
    const result = finalizeScanAnswer({ subject: "spaceship", title: "x", verdict: "maybe", gtin: "3017620422004" });
    expect(result).toMatchObject({ subject: "other", verdict: "unknown" });
    expect(result.gtin).toBeUndefined();
  });

  it("parses JSON wrapped in prose", () => {
    expect(parseJsonObject('Sure: {"status":"unknown"} done')).toEqual({ status: "unknown" });
    expect(parseJsonObject("no json")).toBeUndefined();
  });
});

describe("scan routes", () => {
  it("analyses a photo", async () => {
    const analyzer = fakeAnalyzer();
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: analyzer });
    const boundary = "----vt";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/v1/scan/photo?language=ca",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ subject: "activity", verdict: "non_vegetarian" });
    expect(analyzer.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({ mimetype: "image/jpeg" }), "ca");
    await app.close();
  });

  it("rejects links that are not public web addresses", async () => {
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: fakeAnalyzer() });
    const res = await app.inject({ method: "POST", url: "/v1/scan/url", payload: { url: "3017620422003" } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("checks a brand", async () => {
    const analyzer = fakeAnalyzer();
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: analyzer });
    const res = await app.inject({ method: "GET", url: "/v1/brands/cruelty-free?name=Brand,%20Parent&language=en" });
    expect(res.json()).toMatchObject({ status: "cruelty_free" });
    expect(analyzer.findBrandEthics).toHaveBeenCalledWith("Brand", "en");
    await app.close();
  });

  it("judges products without ingredient data from a web search, capped and labelled as automatic", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) =>
      String(input).includes("openproductsfacts.org")
        ? new Response(JSON.stringify({ status: 1, product: { product_name: "Leather boots" } }), { status: 200 })
        : new Response(JSON.stringify({ status: 0 }), { status: 404 }),
    ));
    const analyzer = fakeAnalyzer({
      researchProduct: vi.fn().mockResolvedValue({
        found: true,
        productName: "Leather boots",
        category: "clothing",
        verdict: "non_vegetarian",
        reason: "Made of leather.",
        sources: [{ url: "https://shop.example/boots" }],
      }),
    });
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: analyzer });
    const res = await app.inject({ method: "GET", url: "/v1/products/3017620422003" });
    expect(res.json()).toMatchObject({ category: "other", verdict: "non_vegetarian", assurance: "unverified" });
    await app.close();
  });
});

describe("links to pages that cannot be downloaded", () => {
  it("identifies the product with a web search instead of failing", async () => {
    const researched = finalizeScanAnswer(
      { subject: "clothing", title: "Merino wool jumper", verdict: "non_vegetarian", reason: "Made of wool." },
      { sources: [{ url: "https://example.org/jumper" }] },
    );
    const researchLink = vi.fn().mockResolvedValue(researched);
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: fakeAnalyzer({ researchLink }) });
    // Shops often answer automated downloads with 403.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));
    const res = await app.inject({
      method: "POST",
      url: "/v1/scan/url",
      payload: { url: "https://93.184.216.34/p/merino-wool-jumper", language: "ca" },
    });
    expect(res.statusCode).toBe(200);
    expect(researchLink).toHaveBeenCalledWith("https://93.184.216.34/p/merino-wool-jumper", "ca");
    expect(res.json()).toMatchObject({ title: "Merino wool jumper", verdict: "non_vegetarian" });
    await app.close();
  });

  it("says the link could not be checked when the search fails and the address says nothing", async () => {
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: fakeAnalyzer() });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));
    const res = await app.inject({ method: "POST", url: "/v1/scan/url", payload: { url: "https://93.184.216.34/p/x" } });
    expect(res.statusCode).toBe(503);
    expect(res.json().message).toBe("This link could not be checked.");
    await app.close();
  });
});

describe("judging a product from its address alone", () => {
  it("keeps the descriptive words of the address", () => {
    expect(addressWords("https://www.carrefour.es/supermercado/galletas-con-chocolate-con-leche-oreo-246-g/R-590209211/p"))
      .toBe("carrefour.es: galletas con chocolate con leche oreo");
    expect(addressWords("https://shop.example/p/R-123")).toBe("");
  });

  it("can say not vegan, but never vegan, from a name", () => {
    const wool = finalizeScanAnswer({ subject: "clothing", title: "Merino jumper", verdict: "non_vegetarian", reason: "Wool." });
    expect(judgedFromAddressOnly(wool, "en").verdict).toBe("non_vegetarian");
    const cookies = finalizeScanAnswer({ subject: "food", title: "Cookies", verdict: "vegan", reason: "Plant-based." });
    expect(judgedFromAddressOnly(cookies, "ca")).toMatchObject({ verdict: "unknown" });
  });
});

describe("pageSummary", () => {
  it("keeps title, description and visible text", () => {
    const summary = pageSummary(
      '<html><head><title>Rutes a cavall</title><meta name="description" content="Excursions amb cavalls"></head><body><script>x()</script><p>Reserva ara</p></body></html>',
    );
    expect(summary).toContain("Title: Rutes a cavall");
    expect(summary).toContain("Description: Excursions amb cavalls");
    expect(summary).toContain("Reserva ara");
    expect(summary).not.toContain("x()");
  });
});
