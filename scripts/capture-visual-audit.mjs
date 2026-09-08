import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "../brain-screenshots");
mkdirSync(outputDir, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for dev server at ${url}`);
}

async function run() {
  console.log("Starting Vite dev server...");
  const devProcess = spawn("npx", ["vite", "--port", "5173"], {
    cwd: resolve(__dirname, "../apps/web"),
    shell: true,
    stdio: "pipe",
  });

  try {
    const port = 5173;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Waiting for ${baseUrl}...`);
    await waitForServer(baseUrl);
    console.log("Dev server is ready. Launching Playwright browser...");

    const browser = await chromium.launch({ headless: true });

    // 1. Mobile Viewport (iPhone 14 standard: 390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();

    console.log("Capturing Mobile Home Page...");
    await mobilePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await mobilePage.screenshot({
      path: resolve(outputDir, "mobile-home.png"),
      fullPage: true,
    });

    console.log("Capturing Mobile Map Page...");
    await mobilePage.goto(`${baseUrl}/map`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({
      path: resolve(outputDir, "mobile-map.png"),
    });

    console.log("Capturing Mobile Scanner Page...");
    await mobilePage.goto(`${baseUrl}/scanner`, { waitUntil: "domcontentloaded" });
    await mobilePage.screenshot({
      path: resolve(outputDir, "mobile-scanner.png"),
    });

    await mobileContext.close();

    // 2. Desktop Viewport (1280x800)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    const desktopPage = await desktopContext.newPage();

    console.log("Capturing Desktop Home Page...");
    await desktopPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-home.png"),
      fullPage: true,
    });

    console.log("Capturing Desktop Map Page...");
    await desktopPage.goto(`${baseUrl}/map`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-map.png"),
    });

    console.log("Capturing Desktop Map Filters Drawer...");
    await desktopPage.click(".funnel-pill");
    await desktopPage.waitForTimeout(400);
    // Toggle 100% Vegan (green) and Vegan Options (blue)
    await desktopPage.click(".pill-vegan");
    await desktopPage.waitForTimeout(200);
    await desktopPage.click(".pill-vegan-options");
    await desktopPage.waitForTimeout(300);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-map-filters.png"),
    });

    console.log("Capturing Desktop Map Pin Hover with Tooltip...");
    await desktopPage.goto(`${baseUrl}/map`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1500);
    const pin = desktopPage.locator(".vegan-map-pin-wrapper").first();
    await pin.hover();
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-map-hover.png"),
    });

    await desktopContext.close();
    await browser.close();

    console.log(`All screenshots successfully captured in ${outputDir}`);
  } finally {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(devProcess.pid), "/f", "/t"]);
    } else {
      devProcess.kill();
    }
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
