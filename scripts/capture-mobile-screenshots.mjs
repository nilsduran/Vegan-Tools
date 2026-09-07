import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const distDir = path.resolve('apps/web/dist');
const outputDir = 'C:/Users/nils/.gemini/antigravity/brain/83f4bf08-b62e-403b-a669-c97b86260c02/mobile_screenshots';

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
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 / standard mobile
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();

    // 1. Home page
    console.log('Capturing Home Page...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, '01_home_mobile.png'), fullPage: true });

    // 2. Map Page - default collapsed / pins loaded
    console.log('Capturing Map Page (initial)...');
    await page.goto('http://localhost:4173/map', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outputDir, '02_map_initial_mobile.png') });

    // 3. Map Page - open search list
    console.log('Capturing Map Page (search list)...');
    const searchInput = page.locator('input[type=\"text\"][placeholder*=\"Cerca\"], input[type=\"text\"][placeholder*=\"Search\"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('pizza');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '03_map_search_mobile.png') });
    }

    // 4. Map Page - Restaurant Detail Pane (place=featured-asante-bcn)
    console.log('Capturing Map Detail Pane...');
    await page.goto('http://localhost:4173/map?place=featured-asante-bcn', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, '04_map_detail_mobile.png') });

    // 5. Scanner Page
    console.log('Capturing Scanner Page...');
    await page.goto('http://localhost:4173/scanner', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, '05_scanner_mobile.png'), fullPage: true });

    // 6. Recipes Page
    console.log('Capturing Recipes Page...');
    await page.goto('http://localhost:4173/recipes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, '06_recipes_mobile.png'), fullPage: true });

    // 7. Profile Page
    console.log('Capturing Profile Page...');
    await page.goto('http://localhost:4173/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, '07_profile_mobile.png'), fullPage: true });

    console.log('All screenshots captured successfully!');
    await browser.close();
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    server.close();
  }
});
