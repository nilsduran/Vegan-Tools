interface RegionBox {
  name: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

const REGIONS: RegionBox[] = [
  { name: "BCN - Eixample Esquerra", minLat: 41.380, minLon: 2.145, maxLat: 41.395, maxLon: 2.165 },
  { name: "BCN - Sant Gervasi", minLat: 41.398, minLon: 2.130, maxLat: 41.415, maxLon: 2.150 },
  { name: "Londres (Central)", minLat: 51.505, minLon: -0.145, maxLat: 51.520, maxLon: -0.120 },
  { name: "Karlsruhe (Alemanya)", minLat: 49.000, minLon: 8.380, maxLat: 49.020, maxLon: 8.420 },
  { name: "Berlín (Kreuzberg)", minLat: 52.485, minLon: 13.400, maxLat: 52.505, maxLon: 13.440 },
  { name: "París (Le Marais)", minLat: 48.850, minLon: 2.350, maxLat: 48.868, maxLon: 2.380 },
  { name: "NYC (Manhattan)", minLat: 40.715, minLon: -74.005, maxLat: 40.735, maxLon: -73.980 },
  { name: "Weehawken, NJ (EUA)", minLat: 40.760, minLon: -74.030, maxLat: 40.780, maxLon: -74.010 },
];

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runVeganBreakdownAudit() {
  console.log(`\n========================================================================`);
  console.log(`🌱 AUDITORIA DESGLOSSADA: 100% VEGÀ vs OPCIONS VEGANES`);
  console.log(`========================================================================\n`);

  const results: Array<{
    name: string;
    total: number;
    veganOnly: number;
    veganOptions: number;
    noVeganData: number;
  }> = [];

  for (let i = 0; i < REGIONS.length; i++) {
    const reg = REGIONS[i]!;
    if (i > 0) await sleep(2200);

    const query = `[out:json][timeout:20];(
      node["amenity"~"restaurant|cafe|fast_food|bar|ice_cream|bakery"](${reg.minLat},${reg.minLon},${reg.maxLat},${reg.maxLon});
      way["amenity"~"restaurant|cafe|fast_food|bar|ice_cream|bakery"](${reg.minLat},${reg.minLon},${reg.maxLat},${reg.maxLon});
    );out center 150;`;

    let data: { elements?: Array<{ tags?: Record<string, string> }> } | null = null;

    for (const endpoint of ENDPOINTS) {
      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "VeganTools/0.1 (VeganBreakdownAudit)",
          },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (resp.ok) {
          data = (await resp.json()) as {
            elements?: Array<{ tags?: Record<string, string> }>;
          };
          break;
        }
      } catch {
        // try next endpoint
      }
    }

    if (!data) {
      console.log(`⚠️ Sense dades per a ${reg.name}`);
      continue;
    }

    const elements = (data.elements || []).filter((e) => e.tags && e.tags.name);

    let veganOnly = 0;
    let veganOptions = 0;
    let noVeganData = 0;

    for (const el of elements) {
      const tags = el.tags || {};
      const name = (tags.name || "").toLowerCase();
      const cuisine = (tags.cuisine || "").toLowerCase();
      const dietVegan = tags["diet:vegan"]?.toLowerCase();
      const dietVegetarian = tags["diet:vegetarian"]?.toLowerCase();

      const is100PercentVegan =
        dietVegan === "only" ||
        cuisine === "vegan" ||
        name.includes("vegan junk food") ||
        name.includes("roots vegan") ||
        name.includes("mad mad vegan") ||
        name.includes("gallo santo") ||
        (name.includes("vegan") && !name.includes("opciones") && !name.includes("options"));

      const hasVeganOptions =
        !is100PercentVegan &&
        (dietVegan === "yes" ||
          cuisine.includes("vegan") ||
          dietVegetarian === "yes" ||
          dietVegetarian === "only" ||
          name.includes("vegetari"));

      if (is100PercentVegan) {
        veganOnly++;
      } else if (hasVeganOptions) {
        veganOptions++;
      } else {
        noVeganData++;
      }
    }

    results.push({
      name: reg.name,
      total: elements.length,
      veganOnly,
      veganOptions,
      noVeganData,
    });

    console.log(`✅ [${reg.name}] 100% Vegà: ${veganOnly} | Opcions: ${veganOptions} | Total: ${elements.length}`);
  }

  console.log(`\n========================================================================================================`);
  console.log(`📊 TAULA FINAL DESGLOSSADA: 100% VEGÀ vs OPCIONS VEGANES`);
  console.log(`========================================================================================================`);
  console.log(`Regió                   Total Locals   🌱 100% Vegà (%)       🌿 Amb Opcions Veganes (%)   Sense dades (%)`);
  console.log(`--------------------------------------------------------------------------------------------------------`);
  for (const r of results) {
    const onlyPct = Math.round((r.veganOnly / Math.max(1, r.total)) * 100);
    const optPct = Math.round((r.veganOptions / Math.max(1, r.total)) * 100);
    const noPct = Math.round((r.noVeganData / Math.max(1, r.total)) * 100);
    console.log(
      `${r.name.padEnd(23)} ${r.total.toString().padStart(5)}         ${r.veganOnly.toString().padStart(3)} (${onlyPct.toString().padStart(2)}%)                ${r.veganOptions.toString().padStart(3)} (${optPct.toString().padStart(2)}%)            ${r.noVeganData.toString().padStart(3)} (${noPct.toString().padStart(2)}%)`
    );
  }
  console.log(`========================================================================================================\n`);
}

runVeganBreakdownAudit().catch(console.error);
