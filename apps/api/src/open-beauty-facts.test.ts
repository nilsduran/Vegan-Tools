import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupOpenBeautyFacts } from "./open-beauty-facts.js";

describe("Open Beauty Facts classification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts cruelty-free certifications and classifies vegan cosmetics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: 1,
              product: {
                product_name: "Botanical Lip Balm",
                brands: "Himalaya Herbal",
                labels_tags: ["en:not-tested-on-animals", "en:leaping-bunny", "en:vegan"],
                ingredients_text: "Ricinus communis seed oil, Cocos nucifera oil, Daucus carota seed oil.",
                last_modified_t: 1_782_000_000,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
      )
    );

    const product = await lookupOpenBeautyFacts("8901138509231");
    expect(product).toBeDefined();
    expect(product?.isBeautyProduct).toBe(true);
    expect(product?.crueltyFree).toBe(true);
    expect(product?.crueltyFreeCertifications).toContain("Not tested on animals");
    expect(product?.crueltyFreeCertifications).toContain("Leaping Bunny (CCIC)");
    expect(product?.verdict).toBe("vegan");
  });

  it("detects animal-derived ingredients like beeswax (Cera alba) in cosmetics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: 1,
              product: {
                product_name: "Beeswax Hand Salve",
                brands: "Example Care",
                labels_tags: ["en:not-tested-on-animals"],
                ingredients_text: "Aqua, Prunus amygdalus dulcis oil, Cera alba, Cetearyl alcohol.",
                last_modified_t: 1_782_000_000,
              },
            }),
            { status: 200 }
          )
      )
    );

    const product = await lookupOpenBeautyFacts("1234567890123");
    expect(product).toBeDefined();
    expect(product?.isBeautyProduct).toBe(true);
    expect(product?.crueltyFree).toBe(true);
    // Beeswax is vegetarian, not vegan
    expect(product?.verdict).toBe("vegetarian");
    expect(product?.reason).toContain("Beeswax");
  });

  it("returns undefined when product is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: 0,
            }),
            { status: 200 }
          )
      )
    );

    const product = await lookupOpenBeautyFacts("0000000000000");
    expect(product).toBeUndefined();
  });
});
