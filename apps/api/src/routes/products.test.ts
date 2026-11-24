import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { MemoryRepository } from "../store.js";

const GTIN = "3017620422003";

function stubDatabases(found: Partial<Record<"food" | "beauty" | "products", object>>) {
  const hosts = { food: "openfoodfacts.org", beauty: "openbeautyfacts.org", products: "openproductsfacts.org" };
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    for (const [key, host] of Object.entries(hosts)) {
      const product = found[key as keyof typeof hosts];
      if (url.includes(host) && product) {
        return new Response(JSON.stringify({ status: 1, product }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ status: 0 }), { status: 404 });
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /v1/products/:gtin across the Open Facts databases", () => {
  it("prefers the food database when several know the barcode", async () => {
    stubDatabases({
      food: { product_name: "Oat drink", ingredients_text: "water, oats", labels_tags: ["en:vegan"] },
      products: { product_name: "Should not win" },
    });
    const app = await buildApp({ repo: new MemoryRepository() });
    const res = await app.inject({ method: "GET", url: `/v1/products/${GTIN}` });
    expect(res.json()).toMatchObject({ productName: "Oat drink", category: "food" });
    await app.close();
  });

  it("identifies other products without guessing a verdict", async () => {
    stubDatabases({ products: { product_name: "Leather boots", brands: "Brand" } });
    const app = await buildApp({ repo: new MemoryRepository() });
    const res = await app.inject({ method: "GET", url: `/v1/products/${GTIN}` });
    expect(res.json()).toMatchObject({ productName: "Leather boots", category: "other", verdict: "unknown" });
    await app.close();
  });

  it("returns an unknown result when no database knows the barcode", async () => {
    stubDatabases({});
    const app = await buildApp({ repo: new MemoryRepository() });
    const res = await app.inject({ method: "GET", url: `/v1/products/${GTIN}` });
    expect(res.json()).toMatchObject({ verdict: "unknown", assurance: "unverified" });
    await app.close();
  });

  it("does not cache a product when the web search fails, so it is retried", async () => {
    stubDatabases({ food: { product_name: "Face fluid" } });
    const repo = new MemoryRepository();
    const researchProduct = vi.fn().mockRejectedValue(new Error("quota"));
    const analyzer = { analyzeImage: vi.fn(), analyzeText: vi.fn(), findBrandEthics: vi.fn(), researchProduct, researchLink: vi.fn() };
    const app = await buildApp({ repo, universalAnalyzer: analyzer });
    await app.inject({ method: "GET", url: `/v1/products/${GTIN}` });
    await app.inject({ method: "GET", url: `/v1/products/${GTIN}` });
    expect(researchProduct).toHaveBeenCalledTimes(2);
    await app.close();
  });
});
