// Script to count native OSM tags across real food POIs
async function auditNativeOSMTags() {
  console.log("Extreient tots els tags nadius d'OpenStreetMap...");

  const query = `[out:json][timeout:20];(
    node["amenity"~"restaurant|cafe|fast_food|bar|ice_cream|bakery"](41.375,2.145,41.405,2.185);
  );out center 300;`;

  const endpoint = "https://overpass-api.de/api/interpreter";
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "VeganTools/0.1 (NativeTagAudit)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!resp.ok) {
    throw new Error(`Status ${resp.status}`);
  }

  const data = (await resp.json()) as { elements?: Array<{ tags?: Record<string, string> }> };
  const elements = data.elements || [];
  console.log(`Analitzant ${elements.length} establiments reals d'OpenStreetMap...\n`);

  const cuisineCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};
  const dietCounts: Record<string, number> = {};
  const amenityCounts: Record<string, number> = {};

  for (const el of elements) {
    const tags = el.tags || {};

    // 1. Amenity / Shop
    if (tags.amenity) amenityCounts[`amenity=${tags.amenity}`] = (amenityCounts[`amenity=${tags.amenity}`] || 0) + 1;
    if (tags.shop) amenityCounts[`shop=${tags.shop}`] = (amenityCounts[`shop=${tags.shop}`] || 0) + 1;

    // 2. Cuisines
    if (tags.cuisine) {
      const parts = tags.cuisine.split(";").map((s) => s.trim().toLowerCase());
      for (const p of parts) {
        if (p) cuisineCounts[p] = (cuisineCounts[p] || 0) + 1;
      }
    }

    // 3. Functional features
    if (tags.outdoor_seating) featureCounts[`outdoor_seating=${tags.outdoor_seating}`] = (featureCounts[`outdoor_seating=${tags.outdoor_seating}`] || 0) + 1;
    if (tags.takeaway) featureCounts[`takeaway=${tags.takeaway}`] = (featureCounts[`takeaway=${tags.takeaway}`] || 0) + 1;
    if (tags.delivery) featureCounts[`delivery=${tags.delivery}`] = (featureCounts[`delivery=${tags.delivery}`] || 0) + 1;
    if (tags.wheelchair) featureCounts[`wheelchair=${tags.wheelchair}`] = (featureCounts[`wheelchair=${tags.wheelchair}`] || 0) + 1;
    if (tags.internet_access) featureCounts[`internet_access=${tags.internet_access}`] = (featureCounts[`internet_access=${tags.internet_access}`] || 0) + 1;
    if (tags.smoking) featureCounts[`smoking=${tags.smoking}`] = (featureCounts[`smoking=${tags.smoking}`] || 0) + 1;
    if (tags.organic) featureCounts[`organic=${tags.organic}`] = (featureCounts[`organic=${tags.organic}`] || 0) + 1;
    if (tags.air_conditioning) featureCounts[`air_conditioning=${tags.air_conditioning}`] = (featureCounts[`air_conditioning=${tags.air_conditioning}`] || 0) + 1;
    if (tags.toilets) featureCounts[`toilets=${tags.toilets}`] = (featureCounts[`toilets=${tags.toilets}`] || 0) + 1;
    if (tags.drive_through) featureCounts[`drive_through=${tags.drive_through}`] = (featureCounts[`drive_through=${tags.drive_through}`] || 0) + 1;

    // 4. Diet tags
    for (const key of Object.keys(tags)) {
      if (key.startsWith("diet:")) {
        const val = tags[key]?.toLowerCase();
        dietCounts[`${key}=${val}`] = (dietCounts[`${key}=${val}`] || 0) + 1;
      }
    }
  }

  const sortedCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]);
  const sortedFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]);
  const sortedDiets = Object.entries(dietCounts).sort((a, b) => b[1] - a[1]);
  const sortedAmenities = Object.entries(amenityCounts).sort((a, b) => b[1] - a[1]);

  console.log(`======================================================`);
  console.log(`🏢 TIPUS D'ESTABLIMENT NADIUS ('amenity=*' / 'shop=*')`);
  console.log(`======================================================`);
  for (const [a, count] of sortedAmenities) {
    console.log(`${a.padEnd(25)} : ${count}`);
  }

  console.log(`\n======================================================`);
  console.log(`🍳 CUINES NADIUES D'OSM ('cuisine=*')`);
  console.log(`======================================================`);
  for (const [c, count] of sortedCuisines) {
    console.log(`cuisine=${c.padEnd(25)} : ${count}`);
  }

  console.log(`\n======================================================`);
  console.log(`🛠️ CARACTERÍSTIQUES D'ESPAI I SERVEI NADIUES`);
  console.log(`======================================================`);
  for (const [f, count] of sortedFeatures) {
    console.log(`${f.padEnd(30)} : ${count}`);
  }

  console.log(`\n======================================================`);
  console.log(`🌱 ETIQUETES DIETÈTIQUES NADIUES ('diet:*')`);
  console.log(`======================================================`);
  for (const [d, count] of sortedDiets) {
    console.log(`${d.padEnd(30)} : ${count}`);
  }
}

auditNativeOSMTags().catch(console.error);
