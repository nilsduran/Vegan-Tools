interface RegionBox {
  name: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

interface OSMElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
}

const REGIONS: RegionBox[] = [
  { name: "Barcelona", minLat: 41.360, minLon: 2.090, maxLat: 41.435, maxLon: 2.230 },
  { name: "Paris", minLat: 48.810, minLon: 2.250, maxLat: 48.910, maxLon: 2.420 },
  { name: "New York", minLat: 40.680, minLon: -74.080, maxLat: 40.800, maxLon: -73.900 },
  { name: "Toronto", minLat: 43.600, minLon: -79.550, maxLat: 43.750, maxLon: -79.250 },
];

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function splitTagValues(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

async function fetchRegion(region: RegionBox): Promise<OSMElement[] | null> {
  const query = `[out:json][timeout:45];(
    nwr["amenity"~"^(restaurant|cafe|fast_food|bar|ice_cream|bakery|pub)$"](${region.minLat},${region.minLon},${region.maxLat},${region.maxLon});
    nwr["shop"~"^(bakery|confectionery|coffee|pastry|ice_cream)$"](${region.minLat},${region.minLon},${region.maxLat},${region.maxLon});
  );out tags;`;

  for (const endpoint of ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "VeganTools/0.1 (RestaurantTaxonomyAudit)",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(75_000),
        });
        if (response.ok) {
          const payload = (await response.json()) as { elements?: OSMElement[] };
          return payload.elements ?? [];
        }
      } catch {
        if (attempt < 2) await sleep(3000);
      }
    }
  }

  return null;
}

async function main() {
  const elementsById = new Map<string, { region: string; element: OSMElement }>();
  const tagCounts = new Map<string, { venues: Set<string>; fields: Set<string> }>();
  const fieldCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();

  for (const [index, region] of REGIONS.entries()) {
    if (index > 0) await sleep(2200);
    const elements = await fetchRegion(region);
    if (!elements) {
      console.warn(`⚠️ Could not fetch ${region.name}; continuing with the remaining regions.`);
      continue;
    }
    let namedCount = 0;

    for (const element of elements) {
      const tags = element.tags ?? {};
      if (!tags.name?.trim()) continue;
      const key = `${element.type}/${element.id}`;
      if (elementsById.has(key)) continue;
      elementsById.set(key, { region: region.name, element });
      namedCount += 1;

      for (const field of ["amenity", "shop", "cuisine", "diet:vegan", "diet:vegetarian"]) {
        if (tags[field]) fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
      }

      for (const field of ["amenity", "shop", "cuisine"]) {
        for (const value of splitTagValues(tags[field] ?? "")) {
          const stat = tagCounts.get(value) ?? { venues: new Set<string>(), fields: new Set<string>() };
          stat.venues.add(key);
          stat.fields.add(field);
          tagCounts.set(value, stat);
        }
      }
    }

    regionCounts.set(region.name, namedCount);
    console.log(`✅ ${region.name}: ${namedCount} named venues`);
  }

  const total = elementsById.size;
  console.log("");
  console.log("# General restaurant taxonomy coverage");
  console.log(`OSM sample: ${total} named venues across ${REGIONS.length} regions`);
  console.log("");
  console.log("| Tag/value | Venues | Coverage | Regions | OSM fields |");
  console.log("|---|---:|---:|---:|---|");

  const sortedTags = [...tagCounts.entries()]
    .sort(([, a], [, b]) => b.venues.size - a.venues.size);
  for (const [tag, stat] of sortedTags) {
    const regions = new Set<string>();
    for (const { region, element } of elementsById.values()) {
      const values = ["amenity", "shop", "cuisine"].flatMap((field) => splitTagValues(element.tags?.[field] ?? ""));
      if (values.includes(tag)) regions.add(region);
    }
    console.log(
      `| \`${tag}\` | ${stat.venues.size} | ${((stat.venues.size / total) * 100).toFixed(1)}% | ${regions.size} | ${[...stat.fields].sort().join(" + ")} |`,
    );
  }

  console.log("");
  console.log("## Field coverage");
  console.log("| OSM field | Venues | Coverage |");
  console.log("|---|---:|---:|");
  for (const [field, count] of fieldCounts) {
    console.log(`| \`${field}\` | ${count} | ${((count / total) * 100).toFixed(1)}% |`);
  }

  console.log("");
  console.log("## Region sample sizes");
  console.log("| Region | Named venues |");
  console.log("|---|---:|");
  for (const [region, count] of regionCounts) {
    console.log(`| ${region} | ${count} |`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
