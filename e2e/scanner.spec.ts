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

  await page.getByRole("tab", { name: /Camera/ }).click();
  await page.locator("#ingredients-text").fill("Ingredients: wheat flour, cod, olive oil, salt");
  await page.getByRole("button", { name: /Check ingredients/ }).click();
  await expect(page.locator(".verdict-non_vegetarian").first()).toBeVisible();
});

test("a restaurant menu QR code leads to the dishes I can order", async ({ page }) => {
  // Keep the fake camera from reading its barcode and leaving the page.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await mockJson(page, /\/v1\/menus\/discover$/, {
    id: "menu-e2e",
    editToken: "token",
    status: "ready",
    restaurantName: "Bar E2E",
    sourceLabel: "Website",
    sourceUrl: "https://bar-e2e.example/carta",
    sourceFiles: [],
    sourceCapturedAt: new Date().toISOString(),
    originalLanguage: "ca",
    sections: [
      {
        id: "s1",
        name: "Plats",
        items: [
          { id: "d1", originalName: "Amanida de cigrons", name: "Amanida de cigrons", verdict: "vegan", reason: "" },
          { id: "d2", originalName: "Croquetes de pernil", name: "Croquetes de pernil", verdict: "non_vegetarian", reason: "" },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    originalDeleteAt: new Date().toISOString(),
  });

  await page.goto("/scanner");
  await page.locator("#barcode").fill("https://bar-e2e.example/carta");
  await page.locator("#barcode").press("Enter");
  await page.getByRole("button", { name: /See what I can order|Mira què puc demanar/ }).click();

  await expect(page).toHaveURL(/\/scan\/menu\?url=/);
  await expect(page.getByText("Amanida de cigrons")).toBeVisible();
  await expect(page.getByText(/classified automatically|classificats automàticament/)).toBeVisible();
});

test("a misread barcode number is rejected instead of looked up", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await page.goto("/scanner");
  await page.locator("#barcode").fill("3017620422004");
  await page.locator("#barcode").press("Enter");
  await expect(page.getByRole("alert")).toContainText(/not valid|no és vàlid/);
  await expect(page).toHaveURL(/\/scanner$/);
});

test("the camera recognises an activity from a photo", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await mockJson(page, /\/v1\/scan\/photo/, {
    subject: "activity",
    title: "Horse riding",
    verdict: "non_vegetarian",
    reason: "Horses are used for riding.",
    concerns: ["Animals used for entertainment"],
    alternatives: ["Visit an animal sanctuary"],
    findings: [],
    traces: [],
    assurance: "unverified",
    sources: [],
  });

  await page.goto("/scanner");
  await page.getByRole("tab", { name: /Camera|Càmera/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "horse.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });

  await expect(page.getByRole("heading", { name: "Horse riding" })).toBeVisible();
  await expect(page.getByText("Visit an animal sanctuary")).toBeVisible();
  await expect(page.getByText(/Automatic recognition|Reconeixement automàtic/)).toBeVisible();
});

test("an unknown link can be checked and its page is classified", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await mockJson(page, /\/v1\/scan\/url$/, {
    subject: "activity",
    title: "Rutes a cavall",
    verdict: "non_vegetarian",
    reason: "Horses are ridden.",
    concerns: [],
    alternatives: [],
    findings: [],
    traces: [],
    assurance: "unverified",
    sources: [],
  });

  await page.goto("/scanner");
  await page.locator("#barcode").fill("https://hipica.example/");
  await page.locator("#barcode").press("Enter");
  await page.getByRole("button", { name: /Check this link|Comprova aquest enllaç/ }).click();
  await expect(page.getByRole("heading", { name: "Rutes a cavall" })).toBeVisible();
});
