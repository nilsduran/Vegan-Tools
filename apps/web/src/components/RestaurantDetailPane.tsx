import { useEffect, useState } from "react";
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
  const name = restaurant.name.toLowerCase();
  const address = restaurant.address.toLowerCase();

  if (
    name.includes("vegan") ||
    name.includes("vegà") ||
    name.includes("plant-based")
  ) {
    return {
      type: "all_vegan",
      label: "100% Vegà",
      className: "badge-all-vegan",
    };
  }

  if (name.includes("vegetarian") || name.includes("vegetarià")) {
    return {
      type: "vegetarian",
      label: "Vegetarià",
      className: "badge-vegetarian",
    };
  }

  return {
    type: "vegan_options",
    label: "Opcions veganes",
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

// Extract cuisine tags from restaurant name or address if apparent
function getCuisineTag(restaurant: RestaurantCandidate): string | undefined {
  const name = restaurant.name.toLowerCase();
  if (name.includes("pizza") || name.includes("pizzeria")) return "Pizzeria";
  if (name.includes("burger")) return "Hamburgueseria";
  if (name.includes("sushi") || name.includes("ramen")) return "Japonès";
  if (name.includes("tapas") || name.includes("tapes")) return "Tapes";
  if (name.includes("bakery") || name.includes("pastisseria")) return "Forn / Cafeteria";
  if (name.includes("gelat") || name.includes("helad")) return "Gelateria";
  if (name.includes("mexic") || name.includes("taco")) return "Mexicà";
  if (name.includes("india") || name.includes("curry")) return "Indi";
  return undefined;
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
  const cuisine = getCuisineTag(restaurant);

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
            {cuisine && <span className="cuisine-badge">{cuisine}</span>}
          </div>
          <h2>{restaurant.name}</h2>
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
      </div>
    </div>
  );
}
