import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const distDir = path.resolve('apps/web/dist');
const outputDir = 'C:/Users/nils/.gemini/antigravity/brain/c5a7cb2d-76c1-4e81-8281-1f4386805a4a/mobile_screenshots';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(4176, async () => {
  try {
    const browser = await chromium.launch({ headless: true });

    // 1. Desktop view (1280x900)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:4176/recipes', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({ path: path.join(outputDir, '06_recipes_desktop.png') });

    // 2. Click on first recipe card to open Recipe Detail Modal
    const firstCard = desktopPage.locator('.recipe-card').first();
    await firstCard.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(outputDir, '06_recipes_detail_modal.png') });

    // 3. Click "Mode Cuina" inside modal to open Kitchen Mode
    const startKitchenBtn = desktopPage.locator('.start-kitchen-mode-btn');
    await startKitchenBtn.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(outputDir, '06_recipes_kitchen_mode.png') });

    // Close kitchen mode
    const closeKitchenBtn = desktopPage.locator('.kitchen-mode-close-btn');
    await closeKitchenBtn.click();
    await desktopPage.waitForTimeout(400);

    // Close detail modal
    const closeDetailBtn = desktopPage.locator('.recipe-detail-close-btn');
    if (await closeDetailBtn.isVisible()) {
      await closeDetailBtn.click();
      await desktopPage.waitForTimeout(400);
    }

    // 4. Switch to Veganizer tab
    const veganizerTab = desktopPage.locator('.recipe-tab-btn').nth(1);
    await veganizerTab.click();
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({ path: path.join(outputDir, '06_recipes_veganizer_tab.png') });

    // 5. Mobile view (390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:4176/recipes', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(outputDir, '06_recipes_mobile.png'), fullPage: true });

    console.log('Recipe showcase screenshots captured successfully!');
    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error capturing screenshots:', err);
    server.close();
    process.exit(1);
  }
});
