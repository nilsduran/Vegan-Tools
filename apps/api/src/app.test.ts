import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { MemoryRepository } from "./store.js";
import type { MenuAnalyzer } from "./menu-analyzer.js";
import type { IngredientExtractor } from "./ingredient-extractor.js";

describe("API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("rejects an invalid GTIN before external lookup", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({ method: "GET", url: "/v1/products/3017620422004" });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("requires authentication for product evidence", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/products/3017620422003/evidence",
      payload: { ingredientsText: "milk" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("classifies a pasted ingredient list without authentication", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/ingredients/classify",
      payload: { ingredientsText: "Sugar, cocoa butter, milk powder" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verdict).toBe("vegetarian");
    expect(response.json().findings[0].id).toBe("milk");
    await app.close();
  });

  it("veganizes a recipe with deterministic substitutions", async () => {
    const app = await buildApp(new MemoryRepository());
    const response = await app.inject({
      method: "POST",
      url: "/v1/recipes/veganize",
      payload: { recipeText: "2 eggs\n100 ml milk" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().substitutions).toHaveLength(2);
    await app.close();
  });

  it("extracts editable ingredient text from a photo", async () => {
    const extractor: IngredientExtractor = {
      async extract() {
        return "Cocoa, sugar, milk powder";
      },
    };
    const app = await buildApp(new MemoryRepository(), undefined, extractor);
    const boundary = "ingredient-photo-boundary";
    const multipartBody = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="label.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      `fake-image\r\n` +
      `--${boundary}--\r\n`,
    );
    const response = await app.inject({
      method: "POST",
      url: "/v1/ingredients/extract",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ingredientsText).toContain("milk powder");
    await app.close();
  });

  it("downloads and extracts an Open Food Facts ingredient image on demand", async () => {
    const repo = new MemoryRepository();
    await repo.saveProduct({
      gtin: "3017620422003",
      productName: "Breadsticks",
      ingredientsImageUrl: "https://images.openfoodfacts.org/images/products/label.jpg",
      verdict: "probably_vegan",
      assurance: "external",
      definitive: false,
      reason: "Plant-based category.",
      matchedIngredients: [],
      findings: [],
      classifierVersion: "test",
      traces: [],
      revision: 1,
      evidence: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      new Uint8Array([1, 2, 3]),
      { status: 200, headers: { "Content-Type": "image/jpeg" } },
    )));
    const extractor: IngredientExtractor = {
      async extract() {
        return "Wheat flour, olive oil, salt";
      },
    };
    const app = await buildApp(repo, undefined, extractor);
    const response = await app.inject({
      method: "POST",
      url: "/v1/products/3017620422003/ingredients/extract",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ingredientsText).toContain("Wheat flour");
    await app.close();
  });

  it("creates, reviews, publishes, and reads a public menu without leaking its token", async () => {
    const analyzer: MenuAnalyzer = {
      async analyze(menu) {
        return {
          ...menu,
          status: "ready",
          restaurantName: "Test Kitchen",
          sections: [
            {
              id: "section-1",
              name: "Mains",
              items: [
                {
                  id: "item-1",
                  originalName: "Amanida",
                  name: "Salad",
                  description: "",
                  price: "9 €",
                  verdict: "unknown",
                  reason: "Ingredients are incomplete.",
                },
              ],
            },
          ],
        };
      },
    };
    const app = await buildApp(new MemoryRepository(), analyzer);
    const boundary = "vegan-tools-test-boundary";
    const multipartBody = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="files"; filename="menu.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `Sample menu\r\n` +
      `--${boundary}--\r\n`,
    );
    const created = await app.inject({
      method: "POST",
      url: "/v1/menus/analyses",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody,
    });
    expect(created.statusCode).toBe(202);
    const draft = created.json();
    await new Promise((resolve) => setImmediate(resolve));

    const reviewed = await app.inject({
      method: "GET",
      url: `/v1/menus/analyses/${draft.id}?token=${encodeURIComponent(draft.editToken)}`,
    });
    expect(reviewed.json().status).toBe("ready");

    const published = await app.inject({
      method: "POST",
      url: `/v1/menus/${draft.id}/publish?token=${encodeURIComponent(draft.editToken)}`,
    });
    expect(published.statusCode).toBe(200);
    const slug = published.json().publicSlug;

    const publicMenu = await app.inject({
      method: "GET",
      url: `/v1/public/menus/${slug}`,
    });
    expect(publicMenu.statusCode).toBe(200);
    expect(publicMenu.json().restaurantName).toBe("Test Kitchen");
    expect(publicMenu.json()).not.toHaveProperty("editToken");
    await app.close();
  });
});
