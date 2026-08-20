import { Capacitor } from "@capacitor/core";
import { BookOpenText, CookingPot, Home, Leaf, ScanBarcode } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { setLanguage, t, tx, useLanguage } from "./i18n";
import { HomePage } from "./pages/HomePage";
import { MenuReaderPage } from "./pages/MenuReaderPage";
import { ProductScannerPage } from "./pages/ProductScannerPage";
import { PublicMenuPage } from "./pages/PublicMenuPage";
import { RecipeVeganizerPage } from "./pages/RecipeVeganizerPage";

function FlagUK() {
  return (
    <svg viewBox="0 0 60 40" width="21" height="14" aria-hidden="true" className="flag-icon">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="6.5" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3.5" />
      <path d="M30 0v40M0 20h60" stroke="#ffffff" strokeWidth="11" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="6.5" />
    </svg>
  );
}

function FlagCatalonia() {
  return (
    <svg viewBox="0 0 90 60" width="21" height="14" aria-hidden="true" className="flag-icon">
      <rect width="90" height="60" fill="#FCD116" />
      <rect y="6.667" width="90" height="6.667" fill="#D7141A" />
      <rect y="20" width="90" height="6.667" fill="#D7141A" />
      <rect y="33.333" width="90" height="6.667" fill="#D7141A" />
      <rect y="46.667" width="90" height="6.667" fill="#D7141A" />
    </svg>
  );
}

export function App() {
  const native = Capacitor.isNativePlatform();
  const language = useLanguage();
  const links = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/scanner", label: t("scanner"), icon: ScanBarcode },
    { to: "/menus", label: t("menus"), icon: BookOpenText },
    { to: "/recipes", label: t("recipes"), icon: CookingPot },
  ];
  return (
    <div className={`app-shell${native ? " native-app" : ""}`}>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span className="brand-mark"><Leaf aria-hidden="true" /></span>
          <span>{t("brand")}</span>
        </NavLink>
        {!native && (
          <nav aria-label={tx("Primary navigation")}>
            {links.slice(1).map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
        )}
        <div className="language-switcher" aria-label={language === "ca" ? "Idioma" : "Language"}>
          <button
            type="button"
            className={language === "en" ? "active" : ""}
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
            title="English"
            aria-label="English"
          >
            <FlagUK />
            <span className="sr-only">English</span>
          </button>
          <button
            type="button"
            className={language === "ca" ? "active" : ""}
            aria-pressed={language === "ca"}
            onClick={() => setLanguage("ca")}
            title="Català"
            aria-label="Català"
          >
            <FlagCatalonia />
            <span className="sr-only">Català</span>
          </button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menus" element={<MenuReaderPage />} />
          <Route path="/scanner" element={<ProductScannerPage />} />
          <Route path="/product/:gtin" element={<ProductScannerPage />} />
          <Route path="/recipes" element={<RecipeVeganizerPage />} />
          <Route path="/m/:slug" element={<PublicMenuPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <a href="https://nilsduran.github.io" target="_blank" rel="noreferrer">
          © 2026 Nils Duran
        </a>
      </footer>

      {native && (
        <nav className="bottom-nav" aria-label={tx("App navigation")}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
