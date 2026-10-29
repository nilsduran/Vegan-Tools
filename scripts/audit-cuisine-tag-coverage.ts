import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface FeaturedRestaurant {
  cuisine?: string;
  tags?: string[];
}

interface TagStats {
  tag: string;
  venues: number;
  cities: number;
  sources: Set<string>;
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const featuredDirectory = join(scriptDirectory, "..", "packages", "domain", "src", "data", "featured");
const files = readdirSync(featuredDirectory).filter((file) => file.endsWith(".json")).sort();
const stats = new Map<string, TagStats>();
const venuesByCity = new Map<string, number>();
let venueCount = 0;

for (const file of files) {
  const city = basename(file, ".json");
  const restaurants = JSON.parse(readFileSync(join(featuredDirectory, file), "utf8")) as FeaturedRestaurant[];
  venuesByCity.set(city, restaurants.length);

  for (const restaurant of restaurants) {
    venueCount += 1;
    const values = new Set([
      ...(restaurant.cuisine ? [restaurant.cuisine] : []),
      ...(restaurant.tags ?? []),
    ]);

    for (const rawValue of values) {
      const tag = rawValue.trim().toLowerCase();
      if (!tag) continue;
      const current = stats.get(tag) ?? {
        tag,
        venues: 0,
        cities: 0,
        sources: new Set<string>(),
      };
      current.venues += 1;
      current.sources.add(restaurant.cuisine === rawValue ? "cuisine" : "tags");
      stats.set(tag, current);
    }
  }
}

for (const stat of stats.values()) {
  stat.cities = files.filter((file) => {
    const restaurants = JSON.parse(readFileSync(join(featuredDirectory, file), "utf8")) as FeaturedRestaurant[];
    return restaurants.some((restaurant) =>
      new Set([
        ...(restaurant.cuisine ? [restaurant.cuisine] : []),
        ...(restaurant.tags ?? []),
      ]).has(stat.tag),
    );
  }).length;
}

const transversalTags = new Set([
  "vegan", "vegetarian", "gluten_free", "organic", "fine_dining", "brunch",
  "cocktails", "wine_bar", "fast_food", "cafe", "bakery", "pastry", "ice_cream",
]);
const editorialTags = new Set([
  "featured", "michelin_guide", "michelin_bib_gourmand", "historic", "art",
  "family", "concept_store", "non_profit", "patio", "rural", "zero_waste",
]);
const broadAliases = new Map([
  ["burgers", "burger"],
  ["tacos", "mexican"],
  ["pasta", "italian"],
  ["noodles", "asian"],
  ["ramen", "asian"],
  ["sushi", "japanese"],
  ["dumplings", "chinese"],
  ["dim_sum", "chinese"],
  ["doner", "kebab"],
  ["artisan_gelato", "ice_cream"],
  ["cafe_bakery", "cafe/bakery"],
]);

function classify(tag: string, venues: number): string {
  if (editorialTags.has(tag)) return "editorial";
  if (transversalTags.has(tag)) return "transversal";
  if (broadAliases.has(tag)) return `agrupar → ${broadAliases.get(tag)}`;
  if (venues < 3) return "rara → agrupar/revisar";
  return "principal";
}

console.log("# Cuisine and restaurant tag coverage");
console.log(`Catalog: ${venueCount} venues across ${files.length} city files`);
console.log("");
console.log("| Tag | Venues | Coverage | Cities | Source | Proposed treatment |");
console.log("|---|---:|---:|---:|---|---|");

for (const stat of [...stats.values()].sort((a, b) => b.venues - a.venues || a.tag.localeCompare(b.tag))) {
  const coverage = `${((stat.venues / venueCount) * 100).toFixed(1)}%`;
  const source = [...stat.sources].sort().join(" + ");
  console.log(`| \`${stat.tag}\` | ${stat.venues} | ${coverage} | ${stat.cities} | ${source} | ${classify(stat.tag, stat.venues)} |`);
}

console.log("");
console.log("## City coverage");
console.log("| City file | Venues |");
console.log("|---|---:|");
for (const [city, count] of venuesByCity) {
  console.log(`| \`${city}\` | ${count} |`);
}
