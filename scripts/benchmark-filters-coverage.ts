// Sample of real Overpass / OpenStreetMap elements representing typical urban food scenes
async function analyzeOpenStreetMapFilterCoverage() {
  console.log(`\n======================================================`);
  console.log(`🔍 AUDITORIA DE COBERTURA DELS FILTRES A OPENSTREETMAP`);
  console.log(`======================================================\n`);

  // Query 250 real dining elements from Overpass in Barcelona + Metropolitan area
  const query = `[out:json][timeout:25];(
    node["amenity"~"restaurant|cafe|fast_food|bar|ice_cream|bakery"](41.37,2.14,41.42,2.20);
    way["amenity"~"restaurant|cafe|fast_food|bar|ice_cream|bakery"](41.37,2.14,41.42,2.20);
  );out center 250;`;

  const endpoint = "https://overpass-api.de/api/interpreter";
  console.log("📡 Descarregant mostra de 250 establiments reals d'OpenStreetMap...");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "VeganTools/0.1 (FilterAudit)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass returned status ${response.status}`);
  }

  const data = (await response.json()) as {
    elements?: Array<{
      type: string;
      id: number;
      tags?: Record<string, string>;
    }>;
  };

  const elements = (data.elements || []).filter((e) => e.tags && e.tags.name);
  console.log(`✅ Total establiments analitzats: ${elements.length}\n`);

  const tagStats: Record<string, { osmTagDirect: number; semanticInferred: number }> = {
    vegan: { osmTagDirect: 0, semanticInferred: 0 },
    restaurant: { osmTagDirect: 0, semanticInferred: 0 },
    cafe_bakery: { osmTagDirect: 0, semanticInferred: 0 },
    italian: { osmTagDirect: 0, semanticInferred: 0 },
    asian: { osmTagDirect: 0, semanticInferred: 0 },
    sushi: { osmTagDirect: 0, semanticInferred: 0 },
    burgers: { osmTagDirect: 0, semanticInferred: 0 },
    gluten_free: { osmTagDirect: 0, semanticInferred: 0 },
    ice_cream: { osmTagDirect: 0, semanticInferred: 0 },
    halal: { osmTagDirect: 0, semanticInferred: 0 },
    mediterranean: { osmTagDirect: 0, semanticInferred: 0 },
    catalan: { osmTagDirect: 0, semanticInferred: 0 },
    mexican: { osmTagDirect: 0, semanticInferred: 0 },
    tapas: { osmTagDirect: 0, semanticInferred: 0 },
    indian: { osmTagDirect: 0, semanticInferred: 0 },
  };

  let totalWithAnyCuisine = 0;
  let totalWithAnyDietTag = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || "").toLowerCase();
    const cuisine = (tags.cuisine || "").toLowerCase();
    const dietVegan = tags["diet:vegan"]?.toLowerCase();
    const dietGlutenFree = tags["diet:gluten_free"]?.toLowerCase();
    const dietHalal = tags["diet:halal"]?.toLowerCase();
    const amenity = (tags.amenity || "").toLowerCase();
    const shop = (tags.shop || "").toLowerCase();

    if (cuisine) totalWithAnyCuisine++;
    if (dietVegan || dietGlutenFree || dietHalal || tags["diet:vegetarian"]) totalWithAnyDietTag++;

    // 1. Direct OSM Tag presence
    if (dietVegan === "yes" || dietVegan === "only") tagStats.vegan.osmTagDirect++;
    if (amenity === "restaurant") tagStats.restaurant.osmTagDirect++;
    if (amenity === "cafe" || shop === "bakery" || shop === "pastry") tagStats.cafe_bakery.osmTagDirect++;
    if (cuisine.includes("italian") || cuisine.includes("pizza") || cuisine.includes("pasta")) tagStats.italian.osmTagDirect++;
    if (cuisine.includes("asian") || cuisine.includes("chinese") || cuisine.includes("japanese") || cuisine.includes("thai") || cuisine.includes("vietnamese")) tagStats.asian.osmTagDirect++;
    if (cuisine.includes("sushi") || cuisine.includes("japanese")) tagStats.sushi.osmTagDirect++;
    if (cuisine.includes("burger")) tagStats.burgers.osmTagDirect++;
    if (dietGlutenFree === "yes" || dietGlutenFree === "only") tagStats.gluten_free.osmTagDirect++;
    if (amenity === "ice_cream" || shop === "ice_cream" || cuisine.includes("ice_cream")) tagStats.ice_cream.osmTagDirect++;
    if (dietHalal === "yes" || dietHalal === "only" || cuisine.includes("halal")) tagStats.halal.osmTagDirect++;
    if (cuisine.includes("mediterranean")) tagStats.mediterranean.osmTagDirect++;
    if (cuisine.includes("catalan") || cuisine.includes("regional")) tagStats.catalan.osmTagDirect++;
    if (cuisine.includes("mexican")) tagStats.mexican.osmTagDirect++;
    if (cuisine.includes("tapas")) tagStats.tapas.osmTagDirect++;
    if (cuisine.includes("indian")) tagStats.indian.osmTagDirect++;

    // 2. Semantic matching with name and context (how VeganTools filters work)
    const isVegan = dietVegan === "yes" || dietVegan === "only" || name.includes("vegan") || name.includes("vegà") || name.includes("vegano");
    if (isVegan) tagStats.vegan.semanticInferred++;

    if (amenity === "restaurant" || name.includes("restaurant") || name.includes("bistro")) tagStats.restaurant.semanticInferred++;
    if (amenity === "cafe" || shop === "bakery" || name.includes("cafe") || name.includes("coffee") || name.includes("forn") || name.includes("pastisseria")) tagStats.cafe_bakery.semanticInferred++;
    if (cuisine.includes("italian") || cuisine.includes("pizza") || name.includes("pizza") || name.includes("pasta") || name.includes("trattoria") || name.includes("italian")) tagStats.italian.semanticInferred++;
    if (cuisine.includes("asian") || cuisine.includes("chinese") || cuisine.includes("japanese") || name.includes("ramen") || name.includes("wok") || name.includes("thai") || name.includes("sushi") || name.includes("asian")) tagStats.asian.semanticInferred++;
    if (cuisine.includes("sushi") || cuisine.includes("japanese") || name.includes("sushi") || name.includes("japo")) tagStats.sushi.semanticInferred++;
    if (cuisine.includes("burger") || name.includes("burger") || name.includes("hamburgues")) tagStats.burgers.semanticInferred++;
    if (dietGlutenFree === "yes" || dietGlutenFree === "only" || name.includes("gluten") || name.includes("celiac") || name.includes("celíac")) tagStats.gluten_free.semanticInferred++;
    if (amenity === "ice_cream" || shop === "ice_cream" || name.includes("gelat") || name.includes("helad") || name.includes("gelateria")) tagStats.ice_cream.semanticInferred++;
    if (dietHalal === "yes" || dietHalal === "only" || name.includes("halal") || cuisine.includes("halal")) tagStats.halal.semanticInferred++;
    if (cuisine.includes("mediterranean") || cuisine.includes("tapas") || name.includes("mediterran") || name.includes("tapas") || name.includes("paella") || name.includes("tapes")) tagStats.mediterranean.semanticInferred++;
    if (cuisine.includes("catalan") || name.includes("catalan") || name.includes("masia") || name.includes("calçot") || name.includes("can ") || name.includes("cal ")) tagStats.catalan.semanticInferred++;
    if (cuisine.includes("mexican") || name.includes("mexic") || name.includes("taco") || name.includes("burrito") || name.includes("cantina")) tagStats.mexican.semanticInferred++;
    if (cuisine.includes("tapas") || name.includes("tapas") || name.includes("tapes") || name.includes("pinchos") || name.includes("platets")) tagStats.tapas.semanticInferred++;
    if (cuisine.includes("indian") || name.includes("curry") || name.includes("india") || name.includes("tandoori") || name.includes("masala")) tagStats.indian.semanticInferred++;
  }

  console.log(`======================================================`);
  console.log(`📊 RESULTATS DE L'AUDITORIA REAL D'OPENSTREETMAP (N = ${elements.length} locals)`);
  console.log(`======================================================`);
  console.log(`📍 Establiments amb tag de cuina ('cuisine=*'):  ${totalWithAnyCuisine}/${elements.length} (${Math.round((totalWithAnyCuisine/elements.length)*100)}%)`);
  console.log(`🥗 Establiments amb tag dietètica ('diet:*'):    ${totalWithAnyDietTag}/${elements.length} (${Math.round((totalWithAnyDietTag/elements.length)*100)}%)`);
  console.log(`------------------------------------------------------`);
  console.log(`Filtre               Tag OSM Pura       Amb Inferència Semàntica (Nom + Context)`);
  console.log(`------------------------------------------------------`);
  for (const [filterId, stats] of Object.entries(tagStats)) {
    const osmPct = Math.round((stats.osmTagDirect / elements.length) * 100);
    const infPct = Math.round((stats.semanticInferred / elements.length) * 100);
    const filterName = filterId.padEnd(20);
    console.log(`${filterName} ${stats.osmTagDirect.toString().padStart(4)} (${osmPct.toString().padStart(2)}%)           ${stats.semanticInferred.toString().padStart(4)} (${infPct.toString().padStart(2)}%)`);
  }
  console.log(`======================================================\n`);
}

analyzeOpenStreetMapFilterCoverage().catch((err) => {
  console.error("Error executant l'auditoria de filtres:", err);
  process.exit(1);
});
