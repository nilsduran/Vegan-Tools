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
    <div className="page home-page" style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Hero Header */}
      <section className="hero" style={{ textAlign: "center", padding: "2.5rem 1rem 2rem 1rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#ecfdf5", color: "#047857", padding: "0.35rem 0.85rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", border: "1px solid #a7f3d0" }}>
          <Sparkles size={16} aria-hidden="true" />
          <span>{language === "ca" ? "Eines ètiques per al teu dia a dia vegà" : "Ethical tools for your daily vegan journey"}</span>
        </div>

        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.75rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "0 0 1rem 0" }}>
          {t("tagline")}
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#475569", maxWidth: "620px", margin: "0 auto 1.8rem auto", lineHeight: 1.5 }}>
          {language === "ca"
            ? "Comprova ingredients amb la càmera, descobreix restaurants 100% vegans i adapta qualsevol recepta en segons."
            : "Check ingredients in seconds, discover vegan-friendly restaurants on the map and veganize any recipe with ease."}
        </p>

        {/* Quick Search Bar */}
        <form onSubmit={handleQuickSearch} style={{ maxWidth: "560px", margin: "0 auto", display: "flex", gap: "0.5rem", background: "#ffffff", padding: "0.4rem", borderRadius: "1rem", border: "1.5px solid #cbd5e1", boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "0.6rem", color: "#94a3b8" }}>
            <Search size={20} aria-hidden="true" />
          </div>
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder={language === "ca" ? "Cerca un restaurant, ciutat o codi de barres…" : "Search restaurant, city or barcode…"}
            aria-label={tx("Search")}
            style={{ flex: 1, border: "none", outline: "none", fontSize: "0.95rem", padding: "0.5rem", background: "transparent" }}
          />
          <button
            type="submit"
            className="primary-button"
            style={{ borderRadius: "0.75rem", padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}
          >
            <span>{tx("Search")}</span>
          </button>
        </form>
      </section>

      {/* Main Feature Cards Grid */}
      <section className="tool-grid" aria-label={tx("Tools")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", margin: "1.5rem 0 3rem 0" }}>
        {/* Scanner Card */}
        <Link to="/scanner" className="tool-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.2rem", padding: "1.75rem", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", transition: "transform 0.2s, box-shadow 0.2s" }}>
          <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "0.9rem", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.2rem" }}>
            <ScanBarcode size={28} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
            {t("openScanner")}
          </h2>
          <p style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 1.25rem 0", flex: 1 }}>
            {language === "ca"
              ? "Escaneja el codi de barres o fes una foto a l'etiqueta d'ingredients per detectar additius i derivats animals."
              : "Scan barcodes or take photos of ingredient labels to instantly flag animal derivatives and E-numbers."}
          </p>
          <span style={{ fontWeight: 600, color: "#047857", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>

        {/* Map Card */}
        <Link to="/map" className="tool-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.2rem", padding: "1.75rem", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", transition: "transform 0.2s, box-shadow 0.2s" }}>
          <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "0.9rem", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.2rem" }}>
            <MapPin size={28} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
            {t("openMap")}
          </h2>
          <p style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 1.25rem 0", flex: 1 }}>
            {language === "ca"
              ? "Mapa gastronòmic amb pins HappyCow, filtres per cuina (pizza, burger, ramen, sushi) i anàlisi de cartes."
              : "Gastronomic map with HappyCow pins, cuisine filters (pizza, burger, ramen, sushi) and menu analysis."}
          </p>
          <span style={{ fontWeight: 600, color: "#d97706", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>

        {/* Recipes Card */}
        <Link to="/recipes" className="tool-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.2rem", padding: "1.75rem", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", transition: "transform 0.2s, box-shadow 0.2s" }}>
          <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "0.9rem", background: "#f3e8ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.2rem" }}>
            <CookingPot size={28} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
            {t("openRecipes")}
          </h2>
          <p style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 1.25rem 0", flex: 1 }}>
            {language === "ca"
              ? "Receptari mestre i veganitzador intel·ligent per transformar canelons, crema catalana o rebosteria."
              : "Master vegan recipes and smart converter to adapt traditional dishes, sauces and pastries."}
          </p>
          <span style={{ fontWeight: 600, color: "#9333ea", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
            <span>{tx("Open tool")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* Ethical Commitment Banner */}
      <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "1.75rem 2rem", margin: "1rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" }}>
          <Shield size={22} style={{ color: "#059669" }} aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
            {language === "ca" ? "Compromís Ètic i Antiespecista" : "Ethical Commitment & Safe Space"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong style={{ fontSize: "0.9rem", color: "#334155", display: "block" }}>
                {language === "ca" ? "Espai Segur 100%" : "100% Safe Space"}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {language === "ca"
                  ? "Tolerància zero amb imatges de carn o crueltat animal."
                  : "Zero tolerance for images of animal cruelty or meat."}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong style={{ fontSize: "0.9rem", color: "#334155", display: "block" }}>
                {language === "ca" ? "Privacitat i Zero Tracking" : "Privacy & Zero Tracking"}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {language === "ca"
                  ? "Sense cookies publicitàries ni perfils invasius de geolocalització."
                  : "No tracking cookies or invasive profiling."}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
            <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0, marginTop: "0.2rem" }} aria-hidden="true" />
            <div>
              <strong style={{ fontSize: "0.9rem", color: "#334155", display: "block" }}>
                {language === "ca" ? "Precisió del 99%" : "99% Evidence Standard"}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {language === "ca"
                  ? "Jerarquia d'evidències contrastades per avalar cada ingredient."
                  : "Scientific evidence hierarchy to verify ingredients."}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
