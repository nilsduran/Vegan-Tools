interface RegionBox {
  name: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

const REGIONS: RegionBox[] = [
  { name: "BCN - Sant Gervasi", minLat: 41.398, minLon: 2.130, maxLat: 41.415, maxLon: 2.150 },
  { name: "BCN - Sarrià", minLat: 41.395, minLon: 2.115, maxLat: 41.408, maxLon: 2.130 },
  { name: "BCN - Eixample Esquerra", minLat: 41.380, minLon: 2.145, maxLat: 41.395, maxLon: 2.165 },
  { name: "Londres (Central)", minLat: 51.505, minLon: -0.145, maxLat: 51.520, maxLon: -0.120 },
  { name: "Pinner (UK Suburb)", minLat: 51.585, minLon: -0.400, maxLat: 51.605, maxLon: -0.370 },
  { name: "Karlsruhe (Alemanya)", minLat: 49.000, minLon: 8.380, maxLat: 49.020, maxLon: 8.420 },
  { name: "París (Le Marais)", minLat: 48.850, minLon: 2.350, maxLat: 48.868, maxLon: 2.380 },
  { name: "NYC (Manhattan)", minLat: 40.715, minLon: -74.005, maxLat: 40.735, maxLon: -73.980 },
  { name: "Weehawken, NJ (EUA)", minLat: 40.760, minLon: -74.030, maxLat: 40.780, maxLon: -74.010 },
  { name: "Berlín (Kreuzberg)", minLat: 52.485, minLon: 13.400, maxLat: 52.505, maxLon: 13.440 },
];

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runMultiRegionAudit() {
  console.log(`\n========================================================================`);
  console.log(`🌍 AUDITORIA GLOBAL D'OPENSTREETMAP EN 10 RECTANGLES DEL MÓN`);
  console.log(`========================================================================\n`);

  const results: Array<{
    name: string;
    total: number;
    withCuisine: number;
    withDiet: number;
    vegan: number;
    italian: number;
    asian: number;
    sushi: number;
    burger: number;
    glutenFree: number;
    iceCream: number;
    halal: number;
    mexican: number;
    indian: number;
  }> = [];

  for (let i = 0; i < REGIONS.length; i++) {
    const reg = REGIONS[i]!;
    if (i > 0) await sleep(2200); // polite delay to respect Overpass quotas

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
            "User-Agent": "VeganTools/0.1 (MultiRegionAudit)",
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
      console.log(`⚠️ No s'han pogut obtenir dades per a ${reg.name}`);
      continue;
    }

    const elements = (data.elements || []).filter((e) => e.tags && e.tags.name);

    let withCuisine = 0;
    let withDiet = 0;
    let vegan = 0;
    let italian = 0;
    let asian = 0;
    let sushi = 0;
    let burger = 0;
    let glutenFree = 0;
    let iceCream = 0;
    let halal = 0;
    let mexican = 0;
    let indian = 0;

    for (const el of elements) {
      const tags = el.tags || {};
      const name = (tags.name || "").toLowerCase();
      const cuisine = (tags.cuisine || "").toLowerCase();
      const dietVegan = tags["diet:vegan"]?.toLowerCase();
      const dietGlutenFree = tags["diet:gluten_free"]?.toLowerCase();
      const dietHalal = tags["diet:halal"]?.toLowerCase();
      const amenity = (tags.amenity || "").toLowerCase();
      const shop = (tags.shop || "").toLowerCase();

      if (cuisine) withCuisine++;
      if (dietVegan || dietGlutenFree || dietHalal || tags["diet:vegetarian"]) withDiet++;

      // Combined tag + semantic inference
      if (dietVegan === "yes" || dietVegan === "only" || name.includes("vegan") || name.includes("vegà")) vegan++;
      if (cuisine.includes("italian") || cuisine.includes("pizza") || name.includes("pizza") || name.includes("pasta") || name.includes("trattoria")) italian++;
      if (cuisine.includes("asian") || cuisine.includes("chinese") || cuisine.includes("thai") || cuisine.includes("vietnamese") || name.includes("ramen") || name.includes("wok") || name.includes("thai")) asian++;
      if (cuisine.includes("sushi") || cuisine.includes("japanese") || name.includes("sushi")) sushi++;
      if (cuisine.includes("burger") || name.includes("burger") || name.includes("hamburgues")) burger++;
      if (dietGlutenFree === "yes" || dietGlutenFree === "only" || name.includes("gluten") || name.includes("celiac") || name.includes("celíac")) glutenFree++;
      if (amenity === "ice_cream" || shop === "ice_cream" || cuisine.includes("ice_cream") || name.includes("gelat") || name.includes("helad") || name.includes("eis") || name.includes("glace")) iceCream++;
      if (dietHalal === "yes" || dietHalal === "only" || cuisine.includes("halal") || name.includes("halal")) halal++;
      if (cuisine.includes("mexican") || name.includes("mexic") || name.includes("taco") || name.includes("burrito")) mexican++;
      if (cuisine.includes("indian") || name.includes("curry") || name.includes("india") || name.includes("tandoori")) indian++;
    }

    results.push({
      name: reg.name,
      total: elements.length,
      withCuisine,
      withDiet,
      vegan,
      italian,
      asian,
      sushi,
      burger,
      glutenFree,
      iceCream,
      halal,
      mexican,
      indian,
    });

    console.log(`✅ [${reg.name}] Analitzats ${elements.length} locals (Cuisine: ${Math.round((withCuisine/Math.max(1, elements.length))*100)}% | Diet: ${Math.round((withDiet/Math.max(1, elements.length))*100)}%)`);
  }

  console.log(`\n========================================================================================================`);
  console.log(`📊 TAULA COMPARATIVA DE COBERTURA EN ELS 10 RECTANGLES`);
  console.log(`========================================================================`);
  console.log(`Regió                   Locals  Cuisine%  Diet%   Vegà  Italià  Asiàtic Sushi Burger GlutenF Gelats Halal Mexicà Indi`);
  console.log(`--------------------------------------------------------------------------------------------------------`);
  for (const r of results) {
    const cpct = Math.round((r.withCuisine / Math.max(1, r.total)) * 100);
    const dpct = Math.round((r.withDiet / Math.max(1, r.total)) * 100);
    console.log(
      `${r.name.padEnd(23)} ${r.total.toString().padStart(5)}   ${cpct.toString().padStart(3)}%   ${dpct.toString().padStart(3)}%   ` +
      `${r.vegan.toString().padStart(4)}  ${r.italian.toString().padStart(6)}  ${r.asian.toString().padStart(7)} ${r.sushi.toString().padStart(5)} ${r.burger.toString().padStart(6)} ` +
      `${r.glutenFree.toString().padStart(7)} ${r.iceCream.toString().padStart(6)} ${r.halal.toString().padStart(5)} ${r.mexican.toString().padStart(6)} ${r.indian.toString().padStart(4)}`
    );
  }
  console.log(`========================================================================================================\n`);
}

runMultiRegionAudit().catch(console.error);
