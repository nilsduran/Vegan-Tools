import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const distDir = path.resolve('apps/web/dist');
const outputDir = process.env.SCREENSHOT_DIR || 'C:/Users/nils/.gemini/antigravity/brain/c5a7cb2d-76c1-4e81-8281-1f4386805a4a/mobile_screenshots';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const targetFilter = process.argv[2]?.toLowerCase();

// Simple static file server
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

server.listen(4173, async () => {
  console.log('Preview server running on http://localhost:4173');
  try {
    const browser = await chromium.launch({ headless: true });
    const isDesktop = process.argv[3] === 'desktop' || targetFilter === 'desktop';
    const context = await browser.newContext(
      isDesktop
        ? { viewport: { width: 1280, height: 850 } }
        : {
            viewport: { width: 390, height: 844 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
          }
    );

    const page = await context.newPage();

    // 1. Home page
    if (!targetFilter || targetFilter === 'home') {
      console.log('Capturing Home Page...');
      await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '01_home_mobile.png'), fullPage: true });
    }

    // 2. Map Page - default collapsed / pins loaded
    if (!targetFilter || targetFilter === 'map') {
      console.log('Capturing Map Page (initial)...');
      await page.goto('http://localhost:4173/map', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outputDir, '02_map_initial_mobile.png') });

      console.log('Capturing Map Page (search list)...');
      const searchInput = page.locator('input[type="text"][placeholder*="Cerca"], input[type="text"][placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('pizza');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outputDir, '03_map_search_mobile.png') });
      }

      console.log('Capturing Map Pane...');
      await page.goto('http://localhost:4173/map?place=asante-bcn', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outputDir, '04_map_detail_mobile.png') });
    }

    // 5. Scanner Page
    if (!targetFilter || targetFilter === 'scanner') {
      console.log('Capturing Scanner Page...');
      await page.goto('http://localhost:4173/scanner', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '05_scanner_mobile.png'), fullPage: true });
    }

    // 6. Recipes Page
    if (!targetFilter || targetFilter === 'recipes') {
      console.log('Capturing Recipes Page...');
      await page.goto('http://localhost:4173/recipes', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '06_recipes_mobile.png'), fullPage: true });
    }

    // 7. Profile Page
    if (!targetFilter || targetFilter === 'profile') {
      console.log('Capturing Profile Page...');
      await page.goto('http://localhost:4173/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '07_profile_mobile.png'), fullPage: true });
    }

    // 8. Resources Page
    if (!targetFilter || targetFilter === 'resources') {
      console.log('Capturing Resources Page...');
      await page.goto('http://localhost:4173/resources', { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
          img.loading = 'eager';
        });
        await Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resolve) => {
                  img.onload = img.onerror = resolve;
                })
            )
        );
      });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '08_resources_mobile.png'), fullPage: true });
    }

    console.log('Screenshots captured successfully!');
    await browser.close();
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    server.close();
  }
});
