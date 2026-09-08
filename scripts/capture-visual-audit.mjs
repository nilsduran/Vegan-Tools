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
    await mobilePage.waitForSelector(".home-dashboard-layout", { timeout: 8000 });
    await mobilePage.waitForTimeout(600);
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

    console.log("Capturing Mobile Restaurant Detail Page...");
    await mobilePage.goto(`${baseUrl}/restaurant/featured-roots-bcn`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: resolve(outputDir, "mobile-restaurant-detail.png"),
      fullPage: true,
    });

    await mobileContext.close();

    // 2. Desktop Viewport (1280x800)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    const desktopPage = await desktopContext.newPage();

    // Inject demo diary logs and top 4 favorites into localStorage for visual audit
    await desktopPage.addInitScript(() => {
      window.localStorage.setItem(
        "vegan_tools_top4_restaurants_v1",
        JSON.stringify([
          "featured-asante-bcn",
          "featured-vrutal-bcn",
          "featured-blubar-bcn",
          "featured-madmadvegan-bcn",
        ])
      );
      window.localStorage.setItem(
        "vegan_tools_diary_logs_v1",
        JSON.stringify([
          {
            id: "v1",
            restaurantId: "featured-roots-bcn",
            restaurantName: "Roots Vegan",
            visitDate: "2026-09-08",
            rating: 5.0,
            notes: "Best vegan burger in town. Fantastic brioche bun and truffle fries.",
            dishesTried: ["Roots Burger", "Truffle Fries"],
          },
          {
            id: "v2",
            restaurantId: "featured-santoni-bcn",
            restaurantName: "Santoni Vegan Bakery & Cafe",
            visitDate: "2026-09-05",
            rating: 4.5,
            notes: "Warm vegan croissants and oat flat white.",
            dishesTried: ["Cornetto pistacchio", "Flat White"],
          },
          {
            id: "v3",
            restaurantId: "featured-gallosanto-bcn",
            restaurantName: "Gallo Santo",
            visitDate: "2026-08-28",
            rating: 4.5,
            notes: "Delicious jackfruit and pastor tacos with margaritas.",
            dishesTried: ["Tacos al Pastor", "Guacamole"],
          },
          {
            id: "v4",
            restaurantId: "featured-desoriente-bcn",
            restaurantName: "Desoriente",
            visitDate: "2026-08-15",
            rating: 4.0,
            notes: "Plant-based sushi rolls and spicy ramen.",
            dishesTried: ["Rainbow Roll", "Spicy Miso Ramen"],
          },
        ])
      );
    });

    console.log("Capturing Desktop Home Page...");
    await desktopPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForSelector(".home-dashboard-layout", { timeout: 8000 });
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-home.png"),
      fullPage: true,
    });

    console.log("Capturing Desktop Restaurant Detail Page...");
    await desktopPage.goto(`${baseUrl}/restaurant/featured-roots-bcn`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-restaurant-detail.png"),
      fullPage: true,
    });

    console.log("Capturing Desktop Profile Page with Diary & Top 4...");
    await desktopPage.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: resolve(outputDir, "desktop-profile.png"),
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
