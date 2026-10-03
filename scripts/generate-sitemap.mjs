/**
 * @file generate-sitemap.mjs
 * @description Generates a static sitemap.xml in apps/web/public/ for SEO discovery.
 * Includes canonical routes and all curated restaurant profile URLs.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://vegantools.org";
const featuredDir = fileURLToPath(new URL("../packages/domain/src/data/featured/", import.meta.url));
const outputPath = fileURLToPath(new URL("../apps/web/public/sitemap.xml", import.meta.url));

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/map", priority: "0.9", changefreq: "daily" },
  { path: "/scanner", priority: "0.8", changefreq: "weekly" },
  { path: "/recipes", priority: "0.8", changefreq: "weekly" },
  { path: "/resources", priority: "0.8", changefreq: "weekly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.5", changefreq: "monthly" },
  { path: "/profile", priority: "0.5", changefreq: "monthly" },
];

async function generateSitemap() {
  const jsonFiles = (await readdir(featuredDir)).filter((f) => f.endsWith(".json"));
  const restaurantIds = new Set();

  for (const file of jsonFiles) {
    const filePath = join(featuredDir, file);
    const raw = await readFile(filePath, "utf8");
    const venues = JSON.parse(raw);
    if (Array.isArray(venues)) {
      for (const v of venues) {
        if (v.id) restaurantIds.add(v.id);
      }
    }
  }

  const entries = [
    ...staticRoutes.map((route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`),
    ...Array.from(restaurantIds).sort().map((id) => `  <url>
    <loc>${BASE_URL}/restaurant/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  await writeFile(outputPath, xml, "utf8");
  console.log(`✓ Generated sitemap.xml with ${entries.length} URLs at ${outputPath}`);
}

generateSitemap().catch((err) => {
  console.error("Error generating sitemap.xml:", err);
  process.exit(1);
});
