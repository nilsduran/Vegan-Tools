/**
 * @file audit-curated-pins.mjs
 * @description Task 14: Systematic audit script for curated restaurant pins across all cities.
 * Validates:
 * 1. Strict plant-based ethics: isVegan === true for 100% of curated picks.
 * 2. Spatial validity: Latitude [-90, 90], Longitude [-180, 180].
 * 3. Opening hours syntax: Standard OSM opening hours parser compatibility.
 * 4. Safe-space media & web links: Verified HTTP/HTTPS format.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const featuredDir = fileURLToPath(new URL("../packages/domain/src/data/featured/", import.meta.url));

// Import domain opening hours parser
const { evaluateOpeningHours } = await import("../packages/domain/dist/index.js");

const jsonFiles = (await readdir(featuredDir)).filter((f) => f.endsWith(".json"));

let totalVenues = 0;
let totalHoursChecked = 0;
let totalImagesChecked = 0;
const errors = [];
const citySummaries = [];

for (const file of jsonFiles) {
  const cityName = basename(file, ".json");
  const filePath = join(featuredDir, file);
  const raw = await readFile(filePath, "utf8");
  const venues = JSON.parse(raw);

  if (!Array.isArray(venues)) {
    errors.push(`${file}: Expected array of restaurants, got ${typeof venues}`);
    continue;
  }

  let validHours = 0;
  let validImages = 0;

  for (const [idx, v] of venues.entries()) {
    totalVenues++;
    const prefix = `[${cityName} #${idx + 1} - ${v.name || "Unnamed"}]`;

    // 1. Mandatory ID and name
    if (!v.id || typeof v.id !== "string") errors.push(`${prefix}: Missing or invalid 'id'`);
    if (!v.name || typeof v.name !== "string") errors.push(`${prefix}: Missing or invalid 'name'`);

    // 2. Strict 100% Vegan check
    if (v.isVegan !== true) {
      errors.push(`${prefix}: VIOLATION OF ETHICAL RULE - isVegan must be strictly true!`);
    }

    // 3. Spatial Coordinates check
    if (typeof v.latitude !== "number" || v.latitude < -90 || v.latitude > 90) {
      errors.push(`${prefix}: Invalid latitude ${v.latitude}`);
    }
    if (typeof v.longitude !== "number" || v.longitude < -180 || v.longitude > 180) {
      errors.push(`${prefix}: Invalid longitude ${v.longitude}`);
    }

    // 4. Opening Hours validation
    if (v.openingHours) {
      try {
        const status = evaluateOpeningHours(v.openingHours);
        if (typeof status !== "boolean") {
          errors.push(`${prefix}: openingHours evaluation returned non-boolean: ${status}`);
        } else {
          validHours++;
          totalHoursChecked++;
        }
      } catch (err) {
        errors.push(`${prefix}: openingHours parsing crashed with '${v.openingHours}': ${err.message}`);
      }
    }

    // 5. Image URL validation
    if (v.imageUrl) {
      if (!/^https?:\/\//i.test(v.imageUrl)) {
        errors.push(`${prefix}: Invalid imageUrl protocol: ${v.imageUrl}`);
      } else {
        validImages++;
        totalImagesChecked++;
      }
    }

    // 6. Website URL validation
    if (v.websiteUrl && !/^https?:\/\//i.test(v.websiteUrl)) {
      errors.push(`${prefix}: Invalid websiteUrl protocol: ${v.websiteUrl}`);
    }
  }

  citySummaries.push({
    city: cityName,
    count: venues.length,
    withHours: validHours,
    withImages: validImages,
  });
}

console.log("\n🗺️ === Vegan Tools: Curated Pins & OpenStreetMap Audit ===");
console.table(citySummaries);
console.log(`Audited: ${citySummaries.length} city hubs | ${totalVenues} curated venues`);
console.log(`Verified Opening Hours: ${totalHoursChecked} | Verified Safe Space Images: ${totalImagesChecked}`);

if (errors.length > 0) {
  console.error(`\n❌ Found ${errors.length} audit error(s):`);
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("\n✅ 100% of curated restaurant pins passed all spatial, ethical, and syntax audits!\n");
}
