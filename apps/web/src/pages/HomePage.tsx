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
  CookingPot,
  Leaf,
  MapPin,
  ScanBarcode,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import {
  getApproximateLocation,
  getCuratedRestaurants,
  getRecentRestaurantMenus,
  type CachedRestaurantMenu,
} from "../api";
import {
  FEATURED_RESTAURANTS_BARCELONA,
  type RestaurantCandidate,
} from "@vegan-tools/domain";

export function HomePage() {
  // Location detection
  const [userCity, setUserCity] = useState<string>("Barcelona");
  const [featuredPlaces, setFeaturedPlaces] = useState<RestaurantCandidate[]>(
    FEATURED_RESTAURANTS_BARCELONA.slice(0, 8),
  );
  const [recentMenus, setRecentMenus] = useState<CachedRestaurantMenu[]>([]);

  useEffect(() => {
    let active = true;
    getApproximateLocation()
      .then((loc) => {
        if (!active) return;
        if (loc.city) setUserCity(loc.city);
        return getCuratedRestaurants({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      })
      .then((curated) => {
        if (!active || !curated || curated.length === 0) return;
        setFeaturedPlaces(curated.slice(0, 8));
      })
      .catch(() => {
        // Keep fallback
      });

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
              {tx("What do you want to eat today in")} {userCity}?
            </h1>
            <span className="home-location-badge">
              <MapPin size={15} aria-hidden="true" />
              <span>{userCity}</span>
            </span>
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
              <span className="home-hero-btn-sub">
                {tx("Identify animal derivatives and E-numbers instantly")}
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
              <span className="home-hero-btn-sub">
                {tx("OpenStreetMap pins and reviewed vegan menus")}
              </span>
            </div>
            <div className="home-hero-btn-icon-wrap" aria-hidden="true">
              <MapPin size={32} />
            </div>
          </Link>
        </section>

        {/* Featured 100% Vegan Places (Horizontal Scroll on Mobile, 4-col Grid on Desktop) */}
        <section className="home-section" aria-labelledby="featured-places-title">
          <div className="home-section-header">
            <div className="home-section-title-wrap">
              <Sparkles size={18} className="home-icon-sparkle" aria-hidden="true" />
              <h2 id="featured-places-title" className="home-section-title">
                {tx("Featured 100% vegan places")}
              </h2>
            </div>
            <Link to="/map" className="home-section-link">
              <span>{tx("See all on map")}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="home-featured-scroll-container">
            {featuredPlaces.map((place) => (
              <Link
                key={place.id}
                to={`/map?q=${encodeURIComponent(place.name)}`}
                className="home-place-card"
              >
                <div className="home-place-badge-row">
                  <span className="home-badge-vegan">
                    <Leaf size={12} aria-hidden="true" />
                    <span>{tx("100% Vegan")}</span>
                  </span>
                  {place.rating && (
                    <span className="home-badge-rating">
                      <span>★</span>
                      <span>{place.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
                <h3 className="home-place-name">{place.name}</h3>
                <p className="home-place-address">{place.address}</p>
                <div className="home-place-footer">
                  <span className="home-place-cuisine">
                    {place.cuisine ? place.cuisine.toUpperCase() : "VEGAN"}
                  </span>
                  <span className="home-place-action">
                    <span>{tx("Open")}</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Veganize Recipe Quick Card */}
        <section className="home-section">
          <Link to="/recipes" className="home-recipe-card">
            <div className="home-recipe-card-icon-wrap" aria-hidden="true">
              <CookingPot size={28} />
            </div>
            <div className="home-recipe-card-text">
              <h2 className="home-recipe-card-title">
                {tx("Veganize a recipe")}
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
    </div>
  );
}
