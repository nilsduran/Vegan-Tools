import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrandEthics, UniversalScanResult } from "@vegan-tools/domain";
import { buildApp } from "../app.js";
import { MemoryRepository } from "../store.js";
import { finalizeScanAnswer, parseJsonObject, type UniversalAnalyzer } from "../universal-analyzer.js";
import { pageSummary } from "./scan.js";

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

  it("judges Open Products Facts products by name, capped and labelled as automatic", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) =>
      String(input).includes("openproductsfacts.org")
        ? new Response(JSON.stringify({ status: 1, product: { product_name: "Leather boots" } }), { status: 200 })
        : new Response(JSON.stringify({ status: 0 }), { status: 404 }),
    ));
    const analyzer = fakeAnalyzer({
      analyzeText: vi.fn().mockResolvedValue(
        finalizeScanAnswer({ subject: "clothing", title: "Leather boots", verdict: "non_vegetarian", reason: "Made of leather." }),
      ),
    });
    const app = await buildApp({ repo: new MemoryRepository(), universalAnalyzer: analyzer });
    const res = await app.inject({ method: "GET", url: "/v1/products/3017620422003" });
    expect(res.json()).toMatchObject({ category: "other", verdict: "non_vegetarian", assurance: "external" });
    await app.close();
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
