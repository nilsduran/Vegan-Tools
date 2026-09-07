import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  CookingPot,
  ExternalLink,
  Heart,
  Leaf,
  MapPin,
  ScanBarcode,
  Search,
  Shield,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { t, tx, useLanguage } from "../i18n";

export function HomePage() {
  const language = useLanguage();
  const navigate = useNavigate();
  const [quickQuery, setQuickQuery] = useState("");

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (!q) return;

    // If numerical barcode, jump to scanner product lookup
    if (/^\d{8,14}$/.test(q)) {
      navigate(`/product/${q}`);
    } else {
      // Jump to restaurant search on map
      navigate(`/map?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="page home-page home-container">
      {/* Hero Header */}
      <section className="hero home-hero">
        <div className="home-badge">
          <Sparkles size={16} aria-hidden="true" />
          <span>{tx("Ethical tools for your daily vegan journey")}</span>
        </div>

        <h1 className="home-hero-title">
          {t("tagline")}
        </h1>
        <p className="home-hero-subtitle">
          {tx("Check ingredients in seconds, discover vegan-friendly restaurants on the map and veganize any recipe with ease.")}
        </p>

        {/* Quick Search Bar */}
        <form onSubmit={handleQuickSearch} className="home-search-form">
          <div className="home-search-icon-wrap">
            <Search size={20} aria-hidden="true" />
          </div>
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder={tx("Search restaurant, city or barcode…")}
            aria-label={tx("Search")}
            className="home-search-input"
          />
          <button
            type="submit"
            className="primary-button home-search-button"
          >
            <span>{tx("Search")}</span>
          </button>
        </form>
      </section>

      {/* Main Feature Cards Grid */}
      <section className="tool-grid home-tool-grid" aria-label={tx("Tools")}>
        {/* Scanner Card */}
        <Link to="/scanner" className="tool-card home-tool-card">
          <div className="home-tool-icon-wrap home-tool-icon-green">
            <ScanBarcode size={28} aria-hidden="true" />
          </div>
          <h2 className="home-tool-title">
            {t("openScanner")}
          </h2>
          <p className="home-tool-desc">
            {tx("Scan barcodes or take photos of ingredient labels to instantly flag animal derivatives and E-numbers.")}
          </p>
          <span className="tool-card-action home-tool-action home-tool-action-green">
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>

        {/* Map Card */}
        <Link to="/map" className="tool-card home-tool-card">
          <div className="home-tool-icon-wrap home-tool-icon-amber">
            <MapPin size={28} aria-hidden="true" />
          </div>
          <h2 className="home-tool-title">
            {t("openMap")}
          </h2>
          <p className="home-tool-desc">
            {tx("Gastronomic map with collaborative OpenStreetMap pins, cuisine filters and menu analysis.")}
          </p>
          <span className="tool-card-action home-tool-action home-tool-action-amber">
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>

        {/* Recipes Card */}
        <Link to="/recipes" className="tool-card home-tool-card">
          <div className="home-tool-icon-wrap home-tool-icon-purple">
            <CookingPot size={28} aria-hidden="true" />
          </div>
          <h2 className="home-tool-title">
            {t("openRecipes")}
          </h2>
          <p className="home-tool-desc">
            {tx("Master vegan recipes and smart converter to adapt traditional dishes, sauces and pastries.")}
          </p>
          <span className="tool-card-action home-tool-action home-tool-action-purple">
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* Ethical Commitment Banner */}
      <section className="home-ethical-banner">
        <div className="home-ethical-header">
          <Shield size={22} style={{ color: "#059669" }} aria-hidden="true" />
          <h3>
            {tx("Ethical Commitment & Safe Space")}
          </h3>
        </div>
        <div className="home-ethical-grid">
          <div className="home-ethical-item">
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong>
                {tx("100% Safe Space")}
              </strong>
              <span>
                {tx("Zero tolerance for images of animal cruelty or meat.")}
              </span>
            </div>
          </div>

          <div className="home-ethical-item">
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong>
                {tx("Privacy & Zero Tracking")}
              </strong>
              <span>
                {tx("No tracking cookies or invasive profiling.")}
              </span>
            </div>
          </div>

          <div className="home-ethical-item">
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong>
                {tx("99% Evidence Standard")}
              </strong>
              <span>
                {tx("Scientific evidence hierarchy to verify ingredients.")}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
