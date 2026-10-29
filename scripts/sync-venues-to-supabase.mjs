/**
 * @file sync-venues-to-supabase.mjs
 * @description Idempotent synchronization script: seeds authoritative curated restaurants
 * and registers known permanently closed tombstones directly into Supabase PostgreSQL + PostGIS.
 * 
 * Usage:
 *   node scripts/sync-venues-to-supabase.mjs
 * 
 * Requirements:
 *   SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in environment or .env
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env if present
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn("\n⚠️  SUPABASE_URL o SUPABASE_SECRET_KEY no estan definits a l'entorn ni al fitxer .env.");
  console.info("💡 Per aplicar l'esquema de dades manualment:");
  console.info("   1. Obre el panell de Supabase a https://supabase.com/dashboard");
  console.info("   2. Ves a 'SQL Editor' -> 'New query'");
  console.info("   3. Copia i enganxa el contingut de: supabase/migrations/202610100001_venues_and_events.sql");
  console.info("   4. Fes clic a 'Run' per crear les taules i extensions PostGIS.\n");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dynamic import of domain datasets
const { FEATURED_RESTAURANTS, KNOWN_CLOSED_VENUE_IDS, isPermanentlyClosedVenue } = await import("../packages/domain/dist/index.js");

console.log("\n🌱 === Sincronització de Restaurants i Tombstones a Supabase ===");
console.log(`📡 URL de Supabase: ${supabaseUrl}`);

async function runSync() {
  let inserted = 0;
  let updated = 0;
  let tombstonesRegistered = 0;

  // 1. Ingest active verified restaurants
  for (const venue of FEATURED_RESTAURANTS) {
    if (isPermanentlyClosedVenue(venue)) {
      continue;
    }

    const payload = {
      id: venue.id,
      name: venue.name,
      address: venue.address || "",
      city_hub: venue.id.split("-").pop() || "general",
      latitude: venue.latitude,
      longitude: venue.longitude,
      location: `POINT(${venue.longitude} ${venue.latitude})`,
      classification: venue.isVegan ? "100_percent_vegan" : venue.isVegetarian ? "vegetarian" : "veg_friendly",
      is_featured: venue.isFeatured ?? false,
      status: "verified_active",
      cuisine_type: venue.cuisine || "mediterranean",
      tags: venue.tags || [],
      website_url: venue.websiteUrl || null,
      opening_hours: venue.openingHours || null,
      rating: venue.rating || null,
      image_url: venue.imageUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("venues").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn(`   ⚠️ Error sincronitzant ${venue.name} (${venue.id}): ${error.message}`);
    } else {
      inserted++;
    }
  }

  // 2. Register tombstones in venue_external_mappings
  for (const closedId of KNOWN_CLOSED_VENUE_IDS) {
    const { error } = await supabase.from("venue_external_mappings").upsert(
      {
        provider: "vegan_tools",
        external_id: closedId,
        venue_id: closedId,
        is_blacklisted: true,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "provider,external_id" },
    );

    if (!error) {
      tombstonesRegistered++;
    }
  }

  console.log(`\n✅ Sincronització completada amb èxit:`);
  console.log(`   - Restaurants actius verificats sincronitzats: ${inserted}`);
  console.log(`   - Tombstones permanents blindats a la BD: ${tombstonesRegistered}\n`);
}

runSync().catch((err) => {
  console.error("❌ Error en la sincronització:", err);
  process.exit(1);
});
