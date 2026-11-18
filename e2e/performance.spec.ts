import { gzipSync } from "node:zlib";
import { expect, test } from "./support/app";

/**
 * Speed budgets (see docs/architecture.md, "Quality and speed standard").
 *
 * JavaScript per route is the hard gate: it is deterministic and is what makes
 * a mid-range phone slow (download, parse and execute). Budgets sit a little
 * above the November 2026 sizes, so growth needs a deliberate decision: raise
 * the budget in the same change and say why.
 *
 * Timings run on a 4x CPU-throttled phone profile. CI machines vary, so their
 * ceilings are loose and catch regressions of several seconds, not tuning.
 */
const JS_BUDGET_KB: Record<string, number> = {
  "/": 320,
  "/scanner": 290,
  "/recipes": 305,
  "/resources": 290,
  "/map": 700, // includes the MapLibre vector basemap (~290 kB gzip)
};

test.describe("speed budgets", () => {
  test.skip(({ isMobile }) => !isMobile, "measured once, on the phone profile");

  for (const [route, budget] of Object.entries(JS_BUDGET_KB)) {
    test(`JavaScript for ${route} stays within ${budget} kB gzip`, async ({ page }) => {
      const sizes = new Map<string, number>();
      page.on("response", async (response) => {
        if (!response.url().endsWith(".js")) return;
        try {
          sizes.set(response.url(), gzipSync(await response.body()).length);
        } catch {
          // Response bodies of aborted requests are unavailable.
        }
      });
      await page.goto(route, { waitUntil: "networkidle" });
      const totalKb = Math.round([...sizes.values()].reduce((sum, size) => sum + size, 0) / 1024);
      test.info().annotations.push({ type: "js-kb-gzip", description: String(totalKb) });
      expect(totalKb, `JavaScript downloaded for ${route}`).toBeLessThanOrEqual(budget);
    });
  }

  test("the map and its basemap appear in time on a slow phone", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const started = Date.now();
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 12_000 });
    const mapMs = Date.now() - started;
    test.info().annotations.push({ type: "map-visible-ms", description: String(mapMs) });
    expect(mapMs).toBeLessThan(12_000);
  });

  test("the home page paints its main content in time on a slow phone", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      (window as unknown as { __lcp: number }).__lcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) (window as unknown as { __lcp: number }).__lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const lcp = Math.round(await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp));
    test.info().annotations.push({ type: "lcp-ms", description: String(lcp) });
    expect(lcp).toBeLessThan(6_000);
  });
});
