/**
 * Emoji for a restaurant's main cuisine, used by map pins and restaurant cards.
 *
 * Kept outside RestaurantMap so pages without a map (home, restaurant detail)
 * do not pull in the map component and Leaflet just to draw an emoji.
 */
import type { RestaurantCandidate } from "@vegan-tools/domain";

export function getCuisineIcon(restaurant: RestaurantCandidate): string {
  const name = (restaurant.name || "").toLowerCase();
  const tags = (restaurant.tags ?? []).map((t) => t.toLowerCase());
  const cuisine = (restaurant.cuisine ?? "").toLowerCase();
  const notes = ("notes" in restaurant && typeof (restaurant as Record<string, unknown>).notes === "string"
    ? (restaurant as Record<string, unknown>).notes as string
    : "").toLowerCase();
  const text = `${name} ${tags.join(" ")} ${cuisine} ${notes}`;

  // 1. Tacos / Mexican
  if (
    name.includes("gallo santo") ||
    text.includes("taco") ||
    text.includes("mexic") ||
    text.includes("burrito") ||
    text.includes("quesadilla") ||
    text.includes("guacamole")
  ) {
    return "🌮";
  }

  // 2. Pizza
  if (
    name.includes("blu bar") ||
    text.includes("pizza") ||
    text.includes("pizzeria") ||
    text.includes("focaccia") ||
    text.includes("calzone")
  ) {
    return "🍕";
  }

  // 3. Burger
  if (
    name.includes("vrutal") ||
    name.includes("mad mad") ||
    name.includes("quinoa") ||
    name.includes("junk food") ||
    text.includes("burger") ||
    text.includes("hamburg") ||
    text.includes("fries") ||
    text.includes("patates")
  ) {
    return "🍔";
  }

  // 4. Sushi & Japanese
  if (
    name.includes("roots & rolls") ||
    name.includes("desoriente") ||
    text.includes("sushi") ||
    text.includes("maki") ||
    text.includes("nigiri") ||
    text.includes("japan") ||
    text.includes("japones")
  ) {
    return "🍣";
  }

  // 5. Ramen & Asian noodles
  if (
    text.includes("ramen") ||
    text.includes("noodle") ||
    text.includes("thai") ||
    text.includes("viet") ||
    text.includes("pho") ||
    text.includes("pad thai") ||
    text.includes("wok") ||
    text.includes("asian") ||
    text.includes("asiat")
  ) {
    return "🍜";
  }

  // 6. Kebab
  if (
    text.includes("kebab") ||
    text.includes("shawarma") ||
    text.includes("doner") ||
    text.includes("döner")
  ) {
    return "🥙";
  }

  // 7. Falafel & Middle Eastern
  if (
    name.includes("good shit") ||
    text.includes("falafel") ||
    text.includes("hummus") ||
    text.includes("pita") ||
    text.includes("orient") ||
    text.includes("lebanese") ||
    text.includes("libanes")
  ) {
    return "🧆";
  }

  // 8. Brunch (sandwich icon)
  if (
    name.includes("asante") ||
    text.includes("brunch") ||
    text.includes("breakfast") ||
    text.includes("esmorzar")
  ) {
    return "🥪";
  }

  // 9. Fleca / Bakery (bread icon)
  if (
    text.includes("bakery") ||
    text.includes("fleca") ||
    text.includes("forn") ||
    text.includes("panader") ||
    text.includes("boulangerie") ||
    text.includes("bread") ||
    text.includes(" pa ")
  ) {
    return "🥖";
  }

  // 10. Pastisseria / Pastry (croissant icon)
  if (
    name.includes("besneta") ||
    name.includes("hanai") ||
    text.includes("pastiss") ||
    text.includes("pasteler") ||
    text.includes("croissant") ||
    text.includes("cake") ||
    text.includes("pastry") ||
    text.includes("dolç") ||
    text.includes("pastissos")
  ) {
    return "🥐";
  }

  // 11. Ice cream / Gelateria
  if (
    text.includes("ice_cream") ||
    text.includes("gelat") ||
    text.includes("helad") ||
    text.includes("gelateria")
  ) {
    return "🍦";
  }

  // 12. Coffee / Cafeteria
  if (
    text.includes("cafe") ||
    text.includes("cafè") ||
    text.includes("cafeter") ||
    text.includes("coffee") ||
    text.includes("matcha") ||
    text.includes("chai") ||
    text.includes("morgentau")
  ) {
    return "☕";
  }

  // 13. Paella / Rice
  if (
    name.includes("bubita") ||
    text.includes("paella") ||
    text.includes("arros") ||
    text.includes("arroz") ||
    text.includes("rice")
  ) {
    return "🥘";
  }

  // 14. Curry / Indian
  if (
    text.includes("curry") ||
    text.includes("india") ||
    text.includes("masala") ||
    text.includes("tandoori") ||
    text.includes("nepal")
  ) {
    return "🍛";
  }

  // 15. Pasta / Italian
  if (
    text.includes("pasta") ||
    text.includes("lasagn") ||
    text.includes("spaghetti") ||
    text.includes("ravioli") ||
    text.includes("gnocchi")
  ) {
    return "🍝";
  }

  // 16. Tapas & Pinchos (olive icon)
  if (
    name.includes("perra verde") ||
    name.includes("cactuscat") ||
    text.includes("tapas") ||
    text.includes("tapa") ||
    text.includes("pincho") ||
    text.includes("pintxo") ||
    text.includes("platet") ||
    text.includes("bistrot") ||
    text.includes("mediterranean") ||
    text.includes("mediterran") ||
    text.includes("spanish") ||
    text.includes("catalan")
  ) {
    return "🫒";
  }

  // 17. BBQ / Grill / Steakhouse (grill flame - never meat)
  if (
    text.includes("grill") ||
    text.includes("bbq") ||
    text.includes("barbacoa") ||
    text.includes("steak") ||
    text.includes("brasa") ||
    text.includes("parrilla")
  ) {
    return "🔥";
  }

  // 18. Poke bowls & Salads / Healthy (salad bowl icon)
  if (
    text.includes("poke") ||
    text.includes("bowl") ||
    text.includes("salad") ||
    text.includes("amanida") ||
    text.includes("ensalada") ||
    text.includes("healthy") ||
    text.includes("raw") ||
    text.includes("organic") ||
    text.includes("macrobiotic")
  ) {
    return "🥗";
  }

  // 19. Beer / Craft beer
  if (
    name.includes("ale & hop") ||
    text.includes("beer") ||
    text.includes("cervesa") ||
    text.includes("cerveza") ||
    text.includes("brew") ||
    text.includes("craft beer") ||
    text.includes("pub")
  ) {
    return "🍺";
  }

  // 20. Cocktails / Drinks Bar
  if (
    text.includes("cocktail") ||
    text.includes("coctel") ||
    text.includes("copas") ||
    text.includes("drinks") ||
    tags.includes("bar") ||
    tags.includes("pub")
  ) {
    return "🍸";
  }

  // 21. Dumplings
  if (
    text.includes("dumpling") ||
    text.includes("gyoza") ||
    text.includes("dim sum") ||
    text.includes("chinese") ||
    text.includes("xines")
  ) {
    return "🥟";
  }

  // Fallback for unclassified venues: cutlery without plate (🍴)
  return "🍴";
}

export function getCuisineIcons(restaurant: RestaurantCandidate): string[] {
  return [getCuisineIcon(restaurant)];
}
