// @vitest-environment jsdom
/**
 * @file seo.test.ts
 * @description Unit tests for SEO and social sharing head manager.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { updateDocumentMetadata } from "./seo";

describe("seo metadata manager", () => {
  beforeEach(() => {
    document.title = "";
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("sets default document title and meta description in Catalan", () => {
    updateDocumentMetadata({}, "ca");
    expect(document.title).toBe("Vegan Tools — Eines per al dia a dia vegà");
    const desc = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(desc).toContain("Eines útils i basades en evidències");
    const ogLocale = document.querySelector('meta[property="og:locale"]')?.getAttribute("content");
    expect(ogLocale).toBe("ca_ES");
  });

  it("sets default document title and meta description in English", () => {
    updateDocumentMetadata({}, "en");
    expect(document.title).toBe("Vegan Tools — Useful tools for everyday vegan life");
    const desc = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(desc).toContain("Evidence-led tools");
    const ogLocale = document.querySelector('meta[property="og:locale"]')?.getAttribute("content");
    expect(ogLocale).toBe("en_US");
  });

  it("applies custom title, image, path, and canonical tag", () => {
    updateDocumentMetadata(
      {
        title: "Alive Restaurant",
        description: "100% vegan creative restaurant in Barcelona.",
        path: "/restaurant/alive-restaurant",
        image: "/featured/alive.jpg",
      },
      "en",
    );

    expect(document.title).toBe("Alive Restaurant · Vegan Tools");

    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    expect(canonical).toBe("https://vegantools.org/restaurant/alive-restaurant");

    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
    expect(ogUrl).toBe("https://vegantools.org/restaurant/alive-restaurant");

    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    expect(ogImage).toBe("https://vegantools.org/featured/alive.jpg");

    const twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute("content");
    expect(twitterCard).toBe("summary_large_image");
  });
});
