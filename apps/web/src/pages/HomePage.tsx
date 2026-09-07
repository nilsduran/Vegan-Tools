/**
 * @file HomePage.tsx
 * @description Main dashboard for Vegan Tools with responsive dual layout:
 * - Mobile (<980px): Touch-first culinary action hub with quick tools, horizontal venue carousels, and recipe card.
 * - Desktop (>=980px): The StoryGraph style two-column layout with main activity cards, instant E-number checker widget, and Safe Space pledge.
 */

import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CookingPot,
  ExternalLink,
  Heart,
  HelpCircle,
  Leaf,
  MapPin,
  ScanBarcode,
  Search,
  Shield,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { t, tx, useLanguage } from "../i18n";
import {
  getApproximateLocation,
  getCuratedRestaurants,
  getRecentRestaurantMenus,
  type CachedRestaurantMenu,
} from "../api";
import {
  FEATURED_RESTAURANTS_BARCELONA,
  lookupIngredients,
  type RestaurantCandidate,
} from "@vegan-tools/domain";

export function HomePage() {
  const language = useLanguage();
  const navigate = useNavigate();

  // Location detection
  const [userCity, setUserCity] = useState<string>("Barcelona");
  const [featuredPlaces, setFeaturedPlaces] = useState<RestaurantCandidate[]>(
    FEATURED_RESTAURANTS_BARCELONA.slice(0, 8),
  );
  const [recentMenus, setRecentMenus] = useState<CachedRestaurantMenu[]>([]);

  // Additive / E-number checker widget
  const [eQuery, setEQuery] = useState("");
  const [eFinding, setEFinding] = useState<{
    status: "vegan" | "non_vegan" | "caution" | "unknown";
    name: string;
    reason: string;
  } | null>(null);

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

  const handleAdditiveCheck = (e: FormEvent) => {
    e.preventDefault();
    const q = eQuery.trim();
    if (!q) {
      setEFinding(null);
      return;
    }
    const findings = lookupIngredients(q);
    if (findings.length > 0) {
      const top = findings[0]!;
      setEFinding({
        status:
          top.status === "non_vegetarian"
            ? "non_vegan"
            : top.status === "ambiguous" || top.status === "vegetarian"
            ? "caution"
            : "vegan",
        name: top.name,
        reason: top.reason,
      });
    } else {
      setEFinding({
        status: "unknown",
        name: q,
        reason: tx("No conclusive evidence found for this specific code."),
      });
    }
  };

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
      </div>

      {/* =========================================================================
          SIDEBAR COLUMN (Right on desktop, flows at bottom on mobile)
          ========================================================================= */}
      <aside className="home-sidebar-col" aria-label={tx("Community & Values")}>
        {/* Ethical Commitment & Safe Space Card */}
        <div className="home-side-card home-ethical-side-card">
          <div className="home-side-card-header">
            <Shield size={20} className="home-icon-shield" aria-hidden="true" />
            <h2 className="home-side-card-title">
              {tx("Ethical Commitment & Safe Space")}
            </h2>
          </div>
          <p className="home-side-card-desc">
            {tx(
              "Zero tolerance for images of animal cruelty or meat. 100% plant-based sanctuary for animal liberation.",
            )}
          </p>
          <ul className="home-side-card-list">
            <li>
              <CheckCircle2 size={16} className="home-check-green" aria-hidden="true" />
              <span>{tx("100% Safe Space")}</span>
            </li>
            <li>
              <CheckCircle2 size={16} className="home-check-green" aria-hidden="true" />
              <span>{tx("Privacy & Zero Tracking")}</span>
            </li>
            <li>
              <CheckCircle2 size={16} className="home-check-green" aria-hidden="true" />
              <span>{tx("99% Evidence Standard")}</span>
            </li>
          </ul>
        </div>

        {/* Quick E-number / Additive Checker Widget */}
        <div className="home-side-card home-additive-card">
          <div className="home-side-card-header">
            <Search size={18} className="home-icon-search" aria-hidden="true" />
            <h2 className="home-side-card-title">
              {tx("Quick E-number & additive checker")}
            </h2>
          </div>
          <form onSubmit={handleAdditiveCheck} className="home-additive-form">
            <div className="home-additive-input-wrap">
              <input
                type="text"
                value={eQuery}
                onChange={(e) => setEQuery(e.target.value)}
                placeholder={tx("Check an E-number (e.g. E120, E904, E471)...")}
                aria-label={tx("Check an E-number (e.g. E120, E904, E471)...")}
                className="home-additive-input"
              />
              {eQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setEQuery("");
                    setEFinding(null);
                  }}
                  className="home-additive-clear"
                  aria-label={tx("Clear")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="home-additive-submit">
              {tx("Check")}
            </button>
          </form>

          {eFinding && (
            <div
              className={`home-additive-result home-additive-${eFinding.status}`}
              role="status"
            >
              <div className="home-additive-result-badge">
                {eFinding.status === "vegan" && (
                  <>
                    <Check size={14} />
                    <span>{tx("Vegan")}</span>
                  </>
                )}
                {eFinding.status === "non_vegan" && (
                  <>
                    <X size={14} />
                    <span>{tx("Non-vegan")}</span>
                  </>
                )}
                {eFinding.status === "caution" && (
                  <>
                    <HelpCircle size={14} />
                    <span>{tx("Check origin")}</span>
                  </>
                )}
                {eFinding.status === "unknown" && (
                  <>
                    <HelpCircle size={14} />
                    <span>{tx("Unknown")}</span>
                  </>
                )}
              </div>
              <strong className="home-additive-result-name">
                {eFinding.name}
              </strong>
              <p className="home-additive-result-reason">{eFinding.reason}</p>
            </div>
          )}
        </div>

        {/* Recent Community Activity Feed */}
        {recentMenus.length > 0 && (
          <div className="home-side-card home-recent-menus-card">
            <div className="home-side-card-header">
              <Utensils size={18} className="home-icon-utensils" aria-hidden="true" />
              <h2 className="home-side-card-title">
                {tx("Recent community activity")}
              </h2>
            </div>
            <ul className="home-recent-menus-list">
              {recentMenus.map((item) => (
                <li key={item.restaurant.id} className="home-recent-menu-item">
                  <Link
                    to={`/map?q=${encodeURIComponent(item.restaurant.name)}`}
                    className="home-recent-menu-link"
                  >
                    <span className="home-recent-menu-name">
                      {item.restaurant.name}
                    </span>
                    <span className="home-recent-menu-addr">
                      {item.restaurant.address.split(",")[0]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
