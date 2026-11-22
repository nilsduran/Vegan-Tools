import { describe, expect, it } from "vitest";
import { classifyScannedCode } from "./scanned-code.js";

describe("classifyScannedCode", () => {
  it("accepts barcodes with a valid check digit", () => {
    expect(classifyScannedCode("3017620422003")).toEqual({ kind: "product", gtin: "3017620422003" });
    expect(classifyScannedCode(" 3017 6204 22003 ")).toEqual({ kind: "product", gtin: "3017620422003" });
    expect(classifyScannedCode("96385074")).toEqual({ kind: "product", gtin: "96385074" });
  });

  it("rejects barcode-like numbers with a wrong check digit (misreads)", () => {
    expect(classifyScannedCode("3017620422004")).toEqual({ kind: "invalid_gtin", digits: "3017620422004" });
  });

  it("reads the GTIN from GS1 Digital Link QR codes", () => {
    expect(classifyScannedCode("https://id.gs1.org/01/03017620422003/10/ABC")).toEqual({
      kind: "product",
      gtin: "03017620422003",
    });
    expect(classifyScannedCode("https://brand.example/01/3017620422003")).toEqual({ kind: "product", gtin: "3017620422003" });
  });

  it("reads the GTIN from Open Food / Beauty Facts links", () => {
    expect(classifyScannedCode("https://world.openfoodfacts.org/product/3017620422003/nutella")).toEqual({
      kind: "product",
      gtin: "3017620422003",
    });
    expect(classifyScannedCode("https://es.openbeautyfacts.org/product/3600523614462")).toMatchObject({ kind: "product" });
  });

  it("recognises restaurant menu links", () => {
    expect(classifyScannedCode("https://restaurant.example/carta")).toMatchObject({ kind: "menu_url" });
    expect(classifyScannedCode("https://example.com/files/menu-hivern.pdf")).toMatchObject({ kind: "menu_url" });
    expect(classifyScannedCode("https://qrmenu.example/abc123")).toMatchObject({ kind: "menu_url" });
    expect(classifyScannedCode("www.restaurant.example/menu")).toMatchObject({ kind: "menu_url", url: "https://www.restaurant.example/menu" });
  });

  it("keeps other links and text apart", () => {
    expect(classifyScannedCode("https://example.com/about")).toEqual({ kind: "url", url: "https://example.com/about" });
    expect(classifyScannedCode("WIFI:S:Cafe;T:WPA;P:secret;;")).toMatchObject({ kind: "text" });
    expect(classifyScannedCode("javascript:alert(1)")).toMatchObject({ kind: "text" });
  });
});
