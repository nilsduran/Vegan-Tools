/**
 * @file HomePage.tsx
 * @description Main dashboard for Vegan Tools with a clean, unified single-column layout:
 * - Contextual greeting banner with automatic city detection.
 * - Primary quick action buttons (Scanner and Map).
 * - Featured 100% vegan dining spots carousel/grid.
 * - Culinary recipe veganization spotlight.
 */

import { useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronDown,
  CookingPot,
  Heart,
  MapPin,
  ScanBarcode,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import { useDocumentHead } from "../utils/seo";
import { getCuisineIcon } from "../components/RestaurantMap";
import { getCuisineTags } from "../components/RestaurantDetailPane";
import { CityPickerModal, type SelectedCity } from "../components/CityPickerModal";

export function extractNeighborhood(address?: string): string {
  if (!address) return "";
  const knownNeighborhoods = [
    "Gràcia", "Poblenou", "El Born", "Born", "Gòtic", "Barri Gòtic", "El Raval", "Raval",
    "Eixample", "L'Eixample", "Les Corts", "Sants", "Sarrià", "Sant Antoni",
    "Poble-sec", "Poble Sec", "Sant Martí", "Sant Andreu", "Horta", "Guinardó",
    "Ciutat Vella", "Barceloneta", "La Barceloneta", "Sagrada Família", "Vila de Gràcia",
    "Soho", "Camden", "Shoreditch", "Brixton", "Hackney", "Islington", "Kensington",
    "Kreuzberg", "Neukölln", "Friedrichshain", "Mitte", "Prenzlauer Berg",
    "Le Marais", "Montmartre", "Bastille", "Belleville",
    "Brooklyn", "Williamsburg", "Manhattan", "East Village", "Greenwich Village",
    "Barri Vell", "Eixample Sud", "Mercadal"
  ];

  for (const n of knownNeighborhoods) {
    const regex = new RegExp(`\\b${n}\\b`, "i");
    if (regex.test(address)) {
      return n;
    }
  }

  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (/^\d+$/.test(part)) continue;
    if (/^\d{4,5}/.test(part)) continue;
    const lower = part.toLowerCase();
    if (
      lower.includes("barcelona") ||
      lower.includes("london") ||
      lower.includes("berlin") ||
      lower.includes("paris") ||
      lower.includes("girona") ||
      lower.includes("new york") ||
      lower.includes("spain") ||
      lower.includes("espanya") ||
      lower.includes("españa")
    ) {
      continue;
    }
    return part;
  }

  return parts[0] || address || "";
}
import {
  getApproximateLocation,
  getCuratedRestaurants,
  getRecentRestaurantMenus,
  type CachedRestaurantMenu,
} from "../api";
import {
  FEATURED_CITY_HUBS,
  FEATURED_RESTAURANTS_BARCELONA,
  findClosestCityHub,
  type RestaurantCandidate,
} from "@vegan-tools/domain";

export function HomePage() {
  useDocumentHead({
    path: "/",
    type: "website",
  });

  // Location detection: starts with Barcelona default hub, snaps to nearest city hub
  const [userCity, setUserCity] = useState<string>("Barcelona");
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [featuredPlaces, setFeaturedPlaces] = useState<RestaurantCandidate[]>(
    FEATURED_RESTAURANTS_BARCELONA.slice(0, 8),
  );
  const [recentMenus, setRecentMenus] = useState<CachedRestaurantMenu[]>([]);

  const handleSelectCity = (city: SelectedCity) => {
    setUserCity(city.name);
    const hub = FEATURED_CITY_HUBS.find(
      (h) => h.id === city.hubId || h.name.toLowerCase() === city.name.toLowerCase(),
    );
    if (hub) {
      setFeaturedPlaces(hub.restaurants.slice(0, 8));
    }
    getCuratedRestaurants({ latitude: city.latitude, longitude: city.longitude })
      .then((curated) => {
        if (curated && curated.length > 0) {
          setFeaturedPlaces(curated.slice(0, 8));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;

    const applyCoords = (latitude: number, longitude: number) => {
      if (!active) return;
      const hub = findClosestCityHub(latitude, longitude);
      setUserCity(hub.name);
      setFeaturedPlaces(hub.restaurants.slice(0, 8));

      // Also query live curated endpoint for up-to-date hours / reviews
      getCuratedRestaurants({ latitude, longitude })
        .then((curated) => {
          if (!active || !curated || curated.length === 0) return;
          setFeaturedPlaces(curated.slice(0, 8));
        })
        .catch(() => {});
    };

    // Try browser geolocation if available with quick timeout, else fall back to IP
    if (typeof navigator !== "undefined" && "geolocation" in navigator && typeof navigator.geolocation.getCurrentPosition === "function") {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          getApproximateLocation()
            .then((loc) => applyCoords(loc.latitude, loc.longitude))
            .catch(() => applyCoords(41.3879, 2.1699));
        },
        { timeout: 3000, maximumAge: 300000 },
      );
    } else {
      getApproximateLocation()
        .then((loc) => applyCoords(loc.latitude, loc.longitude))
        .catch(() => applyCoords(41.3879, 2.1699));
    }

    getRecentRestaurantMenus()
      .then((recent) => {
        if (!active) return;
        setRecentMenus(recent.slice(0, 4));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-dashboard-layout">
      {/* =========================================================================
          MAIN COLUMN (Left on desktop, full-width on mobile)
          ========================================================================= */}
      <div className="home-main-col">
        {/* Contextual Greeting Banner */}
        <header className="home-greeting-banner">
          <div className="home-greeting-title-wrap">
            <h1 className="home-greeting-title">
              {tx("What do you want to eat today?")}
            </h1>
            <button
              type="button"
              className="home-location-badge home-location-btn"
              onClick={() => setIsCityPickerOpen(true)}
              title={tx("Change city")}
              aria-label={`${tx("Change city")}: ${userCity}`}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>{userCity}</span>
              <ChevronDown size={14} aria-hidden="true" style={{ opacity: 0.7 }} />
            </button>
          </div>
          <p className="home-greeting-subtitle">
            {tx(
              "Check ingredients in seconds, discover vegan-friendly restaurants on the map and veganize any recipe with ease.",
            )}
          </p>
        </header>

        {/* Hero Quick Actions */}
        <section
          className="home-hero-actions-grid"
          aria-label={tx("Primary actions")}
        >
          {/* Scanner Touch-First Button */}
          <Link to="/scanner" className="home-hero-btn home-hero-btn-scanner">
            <div className="home-hero-btn-content">
              <span className="home-hero-btn-label">
                <span className="mobile-only">{tx("Scan product")}</span>
                <span className="desktop-only">
                  {tx("Scan label or barcode")}
                </span>
              </span>
            </div>
            <div className="home-hero-btn-icon-wrap" aria-hidden="true">
              <ScanBarcode size={32} />
            </div>
          </Link>

          {/* Map Touch-First Button */}
          <Link to="/map" className="home-hero-btn home-hero-btn-map">
            <div className="home-hero-btn-content">
              <span className="home-hero-btn-label">
                <span className="mobile-only">{tx("Find restaurants")}</span>
                <span className="desktop-only">
                  {tx("Explore restaurants on map")}
                </span>
              </span>
            </div>
            <div className="home-hero-btn-icon-wrap" aria-hidden="true">
              <MapPin size={32} />
            </div>
          </Link>
        </section>

        {/* Featured Vegan Places (Horizontal Scroll on Mobile, 4-col Grid on Desktop) */}
        <section className="home-section" aria-labelledby="featured-places-title">
          <div className="home-section-header">
            <div className="home-section-title-wrap">
              <h2 id="featured-places-title" className="home-section-title">
                {tx("Featured")}
              </h2>
            </div>
            <Link to="/map" className="home-section-link">
              <span>{tx("See all on map")}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="home-featured-scroll-container">
            {featuredPlaces.map((place) => {
              const cuisineTags = getCuisineTags(place);
              const primaryCuisine = cuisineTags[0];
              const neighborhood = extractNeighborhood(place.address);

              return (
                <Link
                  key={place.id}
                  to={`/restaurant/${place.id}`}
                  className="home-place-card"
                >
                  <div className="home-place-cover">
                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="home-place-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="home-place-cover-placeholder" aria-hidden="true">
                        <span>{getCuisineIcon(place)}</span>
                      </div>
                    )}
                    {place.rating ? (
                      <span className="home-place-rating-badge">
                        <span>★</span>
                        <span>{place.rating.toFixed(1)}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="home-place-content">
                    <h3 className="home-place-name">{place.name}</h3>
                    <p className="home-place-address">{neighborhood}</p>
                    <div className="home-place-footer">
                      {primaryCuisine && (
                        <span className="home-badge-cuisine">
                          <span className="home-badge-icon" aria-hidden="true">{primaryCuisine.icon}</span>
                          <span>{tx(primaryCuisine.label)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recipes Quick Card */}
        <section className="home-section">
          <Link to="/recipes" className="home-recipe-card">
            <div className="home-recipe-card-icon-wrap" aria-hidden="true">
              <CookingPot size={28} />
            </div>
            <div className="home-recipe-card-text">
              <h2 className="home-recipe-card-title">
                {tx("Recipes")}
              </h2>
              <p className="home-recipe-card-desc">
                {tx(
                  "Paste any traditional recipe to get plant-based substitutions and tips instantly.",
                )}
              </p>
            </div>
            <div className="home-recipe-card-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>
          </Link>
        </section>

        {/* Resources & Ethics Quick Card */}
        <section className="home-section">
          <Link to="/resources" className="home-recipe-card home-resources-card">
            <div className="home-recipe-card-icon-wrap home-resources-card-icon-wrap" aria-hidden="true">
              <Heart size={28} />
            </div>
            <div className="home-recipe-card-text">
              <h2 className="home-recipe-card-title">
                {tx("Understand veganism")}
              </h2>
              <p className="home-recipe-card-desc">
                {tx(
                  "History from ancient origins to modern thinkers, debates, essential books, and documentaries.",
                )}
              </p>
            </div>
            <div className="home-recipe-card-arrow home-resources-card-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>
          </Link>
        </section>

        {/* Recent Community Activity Feed */}
        {recentMenus.length > 0 && (
          <section className="home-section home-recent-activity-section">
            <div className="home-section-header">
              <div className="home-section-title-wrap">
                <Utensils size={18} className="home-icon-utensils" aria-hidden="true" />
                <h2 className="home-section-title">
                  {tx("Recent community activity")}
                </h2>
              </div>
            </div>
            <div className="home-recent-activity-grid">
              {recentMenus.map((item) => (
                <Link
                  key={item.restaurant.id}
                  to={`/map?q=${encodeURIComponent(item.restaurant.name)}`}
                  className="home-recent-activity-card"
                >
                  <strong className="home-recent-activity-name">
                    {item.restaurant.name}
                  </strong>
                  <span className="home-recent-activity-addr">
                    {item.restaurant.address.split(",")[0]}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <CityPickerModal
        isOpen={isCityPickerOpen}
        onClose={() => setIsCityPickerOpen(false)}
        currentCity={userCity}
        onSelectCity={handleSelectCity}
      />
    </div>
  );
}
