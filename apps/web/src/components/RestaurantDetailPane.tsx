/**
 * @file RestaurantDetailPane.tsx
 * @description Detailed inspection pane for selected restaurant venues.
 * Displays opening hours, contact details, turn-by-turn navigation links, public transit estimates,
 * menu trigger actions, and community review threads.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import {
  Clock,
  ExternalLink,
  Globe,
  Info,
  Leaf,
  LoaderCircle,
  MapPin,
  Navigation,
  Upload,
  User,
  Utensils,
  X,
} from "lucide-react";
import { t, tx, useLanguage } from "../i18n";
import { getTransitEstimate, type TransitEstimate } from "../utils/transit";
import { getDirectionsUrl } from "../utils/navigation";

import { RestaurantReviews } from "./RestaurantReviews";

// Helper to determine the vegan status badge of the restaurant
function getVeganBadge(restaurant: RestaurantCandidate): {
  type: "all_vegan" | "vegetarian" | "vegan_options" | "general";
  label: string;
  className: string;
} {
  const name = (restaurant.name || "").toLowerCase();
  const tags = (restaurant.tags ?? []).map((t) => t.toLowerCase());
  const cuisine = (restaurant.cuisine ?? "").toLowerCase();

  const isAllVegan =
    Boolean(restaurant.isVegan) ||
    tags.includes("vegan") ||
    tags.includes("diet:vegan=only") ||
    cuisine === "vegan" ||
    name.includes("vegan") ||
    name.includes("vegà") ||
    name.includes("vegano") ||
    name.includes("vegana") ||
    name.includes("plant-based") ||
    name.includes("plant based") ||
    name.includes("100% vegetal");

  if (isAllVegan) {
    return {
      type: "all_vegan",
      label: tx("Vegan"),
      className: "badge-all-vegan",
    };
  }

  const isVegetarian =
    Boolean(restaurant.isVegetarian) ||
    tags.includes("vegetarian") ||
    tags.includes("diet:vegetarian=only") ||
    cuisine === "vegetarian" ||
    name.includes("vegetarian") ||
    name.includes("vegetarià") ||
    name.includes("vegetariano");

  if (isVegetarian) {
    return {
      type: "vegetarian",
      label: tx("Vegetarian"),
      className: "badge-vegetarian",
    };
  }

  return {
    type: "vegan_options",
    label: tx("Vegan options"),
    className: "badge-vegan-options",
  };
}

function formatDisplayAddress(address: string): string {
  if (!address) return "";
  return address
    .replace(/,\s*(?:Spain|España|Espanya|Catalunya|Catalonia|United Kingdom|France|Deutschland|Italy|Italia)$/i, "")
    .replace(/,\s*\d{4,5}\s+([^,]+)/, ", $1")
    .replace(/,\s*\d{4,5}/, "")
    .replace(/,\s*(?:Catalunya|Catalonia|Comunitat de Madrid|Andalucía|Valencia)$/i, "")
    .trim();
}

// Extract cuisine tags from restaurant cuisine, tags, notes or name (each distinct category gets its own tag)
export function getCuisineTags(restaurant: RestaurantCandidate): Array<{ icon: string; label: string }> {
  const name = (restaurant.name || "").toLowerCase();
  const tags = (restaurant.tags ?? []).map((t) => t.toLowerCase());
  const cuisine = (restaurant.cuisine ?? "").toLowerCase();
  const notes = ("notes" in restaurant && typeof (restaurant as Record<string, unknown>).notes === "string"
    ? (restaurant as Record<string, unknown>).notes as string
    : "").toLowerCase();
  const text = `${name} ${tags.join(" ")} ${cuisine} ${notes}`;

  const result: Array<{ icon: string; label: string }> = [];
  const addedLabels = new Set<string>();

  const addTag = (icon: string, label: string) => {
    if (!addedLabels.has(label)) {
      addedLabels.add(label);
      result.push({ icon, label });
    }
  };

  // 1. Brunch (sandwich icon)
  if (name.includes("asante") || text.includes("brunch") || text.includes("breakfast") || text.includes("esmorzar")) {
    addTag("🥪", "Brunch");
  }

  // 2. Coffee & Cafeteria (coffee cup icon)
  if (text.includes("cafe") || text.includes("cafè") || text.includes("cafeter") || text.includes("coffee") || text.includes("matcha") || text.includes("chai") || text.includes("morgentau")) {
    addTag("☕", "Cafeteria");
  }

  // 3. Fleca / Bakery (bread icon)
  if (text.includes("bakery") || text.includes("fleca") || text.includes("forn") || text.includes("panader") || text.includes("boulangerie") || text.includes("bread") || text.includes(" pa ")) {
    addTag("🥖", "Fleca");
  }

  // 4. Pastisseria / Pastry (croissant icon)
  if (name.includes("besneta") || name.includes("hanai") || text.includes("pastiss") || text.includes("pasteler") || text.includes("croissant") || text.includes("cake") || text.includes("pastry") || text.includes("dolç") || text.includes("pastissos")) {
    addTag("🥐", "Pastisseria");
  }

  // 5. Gelateria / Ice cream
  if (text.includes("ice_cream") || text.includes("gelat") || text.includes("helad") || text.includes("gelateria")) {
    addTag("🍦", "Gelateria");
  }

  // 6. Burgers
  if (name.includes("vrutal") || name.includes("mad mad") || name.includes("quinoa") || text.includes("burger") || text.includes("hamburg") || text.includes("junk food")) {
    addTag("🍔", "Burgers");
  }

  // 7. Pizza
  if (name.includes("blu bar") || text.includes("pizza") || text.includes("pizzeria")) {
    addTag("🍕", "Pizza");
  }

  // 8. Italian / Pasta
  if ((text.includes("itali") || text.includes("pasta") || text.includes("lasagn") || text.includes("spaghetti") || text.includes("ravioli")) && !text.includes("pizza")) {
    addTag("🍝", "Italian");
  }

  // 9. Mexican / Tacos
  if (name.includes("gallo santo") || text.includes("taco") || text.includes("mexic") || text.includes("burrito") || text.includes("quesadilla") || text.includes("guacamole")) {
    addTag("🌮", "Mexican");
  }

  // 10. Japanese & Sushi
  if (name.includes("roots & rolls") || name.includes("desoriente") || text.includes("sushi") || text.includes("maki") || text.includes("nigiri") || text.includes("japan") || text.includes("japones")) {
    addTag("🍣", "Japanese & Sushi");
  }

  // 11. Asian & Ramen
  if (text.includes("ramen") || text.includes("noodle") || text.includes("thai") || text.includes("viet") || text.includes("pho") || text.includes("pad thai") || text.includes("wok") || (text.includes("asian") && !text.includes("sushi"))) {
    addTag("🍜", "Asian & Ramen");
  }

  // 12. Kebab
  if (text.includes("kebab") || text.includes("shawarma") || text.includes("doner") || text.includes("döner")) {
    addTag("🥙", "Kebab");
  }

  // 13. Falafel & Middle Eastern
  if (name.includes("good shit") || text.includes("falafel") || text.includes("hummus") || text.includes("pita") || text.includes("orient") || text.includes("lebanese") || text.includes("libanes")) {
    addTag("🧆", "Falafel & Middle Eastern");
  }

  // 14. Paella & Rice
  if (name.includes("bubita") || text.includes("paella") || text.includes("arros") || text.includes("arroz") || text.includes("rice")) {
    addTag("🥘", "Paella & Rice");
  }

  // 15. Indian Cuisine
  if (text.includes("curry") || text.includes("india") || text.includes("masala") || text.includes("tandoori") || text.includes("nepal")) {
    addTag("🍛", "Indian Cuisine");
  }

  // 16. Tapas & Pinchos (olive icon)
  if (name.includes("perra verde") || name.includes("cactuscat") || text.includes("tapas") || text.includes("tapa") || text.includes("pincho") || text.includes("pintxo") || text.includes("platet") || text.includes("bistrot") || text.includes("mediterranean") || text.includes("spanish") || text.includes("catalan")) {
    addTag("🫒", "Tapas");
  }

  // 17. BBQ & Grill (grill flame - never meat)
  if (text.includes("grill") || text.includes("bbq") || text.includes("barbacoa") || text.includes("steak") || text.includes("brasa") || text.includes("parrilla")) {
    addTag("🔥", "Grill & BBQ");
  }

  // 18. Poke & Salads
  if (text.includes("poke") || text.includes("bowl") || text.includes("salad") || text.includes("amanida") || text.includes("ensalada") || text.includes("raw") || text.includes("organic")) {
    addTag("🥗", "Poke & Salads");
  }

  // 19. Beer / Craft beer
  if (name.includes("ale & hop") || text.includes("craft beer") || text.includes("cervesa") || text.includes("cerveza") || text.includes("brew") || text.includes("pub")) {
    addTag("🍺", "Craft Beer");
  }

  // 20. Cocktails & Bar
  if (text.includes("cocktail") || text.includes("coctel") || text.includes("copas") || text.includes("drinks") || tags.includes("bar") || tags.includes("pub")) {
    addTag("🍸", "Cocktails & Bar");
  }

  // 21. Dumplings & Gyoza
  if (text.includes("dumpling") || text.includes("gyoza") || text.includes("dim sum") || text.includes("chinese") || text.includes("xines")) {
    addTag("🥟", "Dumplings & Gyoza");
  }

  // Fallback if none matched
  if (result.length === 0) {
    result.push({ icon: "🍽️", label: "Dining" });
  }

  return result;
}

export function RestaurantDetailPane({
  restaurant,
  userCoords,
  onClose,
  onOpenMenu,
  onUploadMenu,
}: {
  restaurant: RestaurantCandidate;
  userCoords?: { lat: number; lng: number };
  onClose: () => void;
  onOpenMenu: (restaurant: RestaurantCandidate) => void;
  onUploadMenu: (restaurant: RestaurantCandidate) => void;
}) {
  const language = useLanguage();
  const [transit, setTransit] = useState<TransitEstimate>();
  const [showRatingInfo, setShowRatingInfo] = useState(false);

  // Approximate leaf score (e.g. 4.5 or 5 for vegan places, 4.0 for veg-friendly places)
  const isVeganPlace = getVeganBadge(restaurant).type === "all_vegan";
  const leafScore = isVeganPlace ? 4.8 : 4.2;

  useEffect(() => {
    if (!userCoords || !restaurant.latitude || !restaurant.longitude) {
      setTransit(undefined);
      return;
    }
    let cancelled = false;
    void getTransitEstimate(userCoords, {
      lat: restaurant.latitude,
      lng: restaurant.longitude,
    }).then((est) => {
      if (!cancelled) setTransit(est);
    });
    return () => {
      cancelled = true;
    };
  }, [userCoords, restaurant.latitude, restaurant.longitude]);

  const badge = getVeganBadge(restaurant);
  const cuisineTags = getCuisineTags(restaurant);

  const [loadingMenu, setLoadingMenu] = useState(false);

  const directionsUrl = getDirectionsUrl(restaurant);

  return (
    <div className="restaurant-detail-pane" role="region" aria-label={restaurant.name}>
      <header className="detail-pane-header">
        <div className="detail-pane-titles">
          <div className="detail-badges-row">
            <span className={`vegan-status-badge ${badge.className}`}>
              <Leaf aria-hidden="true" />
              <span>{badge.label}</span>
            </span>
            {cuisineTags.map((cuisine) => (
              <span key={cuisine.label} className="cuisine-badge">
                <span aria-hidden="true" style={{ marginRight: "0.25rem" }}>{cuisine.icon}</span>
                <span>{tx(cuisine.label)}</span>
              </span>
            ))}
          </div>
          <h2>
            <Link
              to={`/restaurant/${encodeURIComponent(restaurant.id)}`}
              className="detail-pane-title-link"
              title={tx("View full details")}
            >
              {restaurant.name}
            </Link>
          </h2>
        </div>
        <button
          type="button"
          className="detail-pane-close"
          onClick={onClose}
          aria-label={tx("Close")}
          title={tx("Close")}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="detail-pane-body">
        {/* Transit estimate badge if GPS is enabled */}
        {transit && (
          <div className={`detail-transit-banner ${transit.mode}`}>
            <span className="transit-mode-icon">
              {transit.mode === "walking" ? "🚶" : "🚗"}
            </span>
            <div className="transit-info">
              <strong>{transit.formattedDuration}</strong>
              <span>({transit.formattedDistance} {transit.mode === "walking" ? tx("a peu") : tx("en cotxe")})</span>
            </div>
          </div>
        )}

        {/* Community Reviews & Leaf Ratings Section */}
        <RestaurantReviews restaurant={restaurant} />

        {/* Address */}
        {restaurant.address && (
          <div className="detail-info-row">
            <MapPin aria-hidden="true" />
            <span>{formatDisplayAddress(restaurant.address)}</span>
          </div>
        )}

        {/* Opening Hours */}
        {restaurant.openingHours && (
          <div className="detail-info-row detail-hours-row">
            <Clock aria-hidden="true" />
            <span>{restaurant.openingHours}</span>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="detail-actions-grid">
          <button
            type="button"
            className="primary-button action-btn-menu"
            disabled={loadingMenu}
            onClick={async () => {
              setLoadingMenu(true);
              try {
                await onOpenMenu(restaurant);
              } finally {
                setLoadingMenu(false);
              }
            }}
          >
            {loadingMenu ? <LoaderCircle className="spin" /> : <Utensils aria-hidden="true" />}
            <span>{tx("Menu")}</span>
          </button>

          {restaurant.websiteUrl && (
            <a
              href={restaurant.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-button action-btn-web"
            >
              <Globe aria-hidden="true" />
              <span>{tx("Website")}</span>
            </a>
          )}

          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="secondary-button action-btn-map"
          >
            <Navigation aria-hidden="true" />
            <span>{tx("Directions")}</span>
          </a>

          <Link
            to={`/restaurant/${encodeURIComponent(restaurant.id)}`}
            className="secondary-button action-btn-page"
            title={tx("View full details")}
          >
            <Info aria-hidden="true" />
            <span>{tx("Full details")}</span>
          </Link>
        </div>

        {/* Add / Upload menu option */}
        <div className="detail-upload-card">
          <p>{tx("Vols afegir o actualitzar la carta d'aquest restaurant?")}</p>
          <button
            type="button"
            className="secondary-button compact-upload-btn"
            onClick={() => onUploadMenu(restaurant)}
          >
            <Upload aria-hidden="true" />
            <span>{tx("Puja la carta (fotos o PDF)")}</span>
          </button>
        </div>

        {/* Suggest edit link */}
        <div className="detail-suggest-row">
          <button
            type="button"
            className="detail-suggest-btn"
            onClick={() => {
              const subject = encodeURIComponent(`Vegan Tools: Suggeriment per a ${restaurant.name}`);
              const body = encodeURIComponent(
                `Hola! Vull suggerir una actualització o canvi per a "${restaurant.name}" (${restaurant.address || "adreça desconeguda"}):\n\n[Escriu aquí el suggeriment o novetat]`
              );
              window.open(`mailto:hola@vegantools.org?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            <Info aria-hidden="true" size={14} />
            <span>{tx("Suggest an edit")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
