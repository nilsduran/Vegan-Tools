import { SCANNED_GTIN } from "./support/barcode-video";
import { expect, mockJson, test } from "./support/app";

const product = {
  gtin: SCANNED_GTIN,
  productName: "E2E oat drink",
  brand: "Test brand",
  verdict: "vegan",
  assurance: "external",
  definitive: false,
  reason: "Open Food Facts marks this product as vegan and no conflicting ingredient was found.",
  matchedIngredients: [],
  findings: [],
  classifierVersion: "e2e",
  traces: [],
  revision: 1,
  evidence: [],
};

test("scans a barcode with the camera and shows the product", async ({ page }) => {
  await mockJson(page, new RegExp(`/v1/products/${SCANNED_GTIN}$`), product);
  const started = Date.now();
  await page.goto("/scanner");

  // The fake camera shows an EAN-13; the app must read it, not report a
  // missing permission (the bug of November 2026 on devices without a
  // native BarcodeDetector).
  await expect(page.getByText(/Camera access is unavailable|barcode reader could not start/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "E2E oat drink" })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(new RegExp(`/product/${SCANNED_GTIN}$`));
  test.info().annotations.push({ type: "scan-to-result-ms", description: String(Date.now() - started) });
});

test("explains how to enable a denied camera and still allows typing ingredients", async ({ page }) => {
  // Without this the fake camera reads the barcode and leaves the page.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await page.goto("/scanner");
  await expect(page.getByText(/Camera access is unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: /How to enable camera/ })).toBeVisible();

  await page.getByRole("tab", { name: /Ingredients/ }).click();
  await page.locator("#ingredients-text").fill("Ingredients: wheat flour, cod, olive oil, salt");
  await page.getByRole("button", { name: /Check ingredients/ }).click();
  await expect(page.locator(".verdict-non_vegetarian").first()).toBeVisible();
});
