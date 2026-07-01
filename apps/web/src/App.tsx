import { Capacitor } from "@capacitor/core";
import { BookOpenText, CookingPot, Home, Leaf, ScanBarcode } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { t } from "./i18n";
import { HomePage } from "./pages/HomePage";
import { MenuReaderPage } from "./pages/MenuReaderPage";
import { ProductScannerPage } from "./pages/ProductScannerPage";
import { PublicMenuPage } from "./pages/PublicMenuPage";
import { RecipeVeganizerPage } from "./pages/RecipeVeganizerPage";

const links = [
  { to: "/", label: t("home"), icon: Home },
  { to: "/scanner", label: t("scanner"), icon: ScanBarcode },
  { to: "/menus", label: t("menus"), icon: BookOpenText },
  { to: "/recipes", label: t("recipes"), icon: CookingPot },
];

export function App() {
  const native = Capacitor.isNativePlatform();
  return (
    <div className={`app-shell${native ? " native-app" : ""}`}>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span className="brand-mark"><Leaf aria-hidden="true" /></span>
          <span>{t("brand")}</span>
        </NavLink>
        {!native && (
          <nav aria-label="Primary navigation">
            {links.slice(1).map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menus" element={<MenuReaderPage />} />
          <Route path="/scanner" element={<ProductScannerPage />} />
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
        <nav className="bottom-nav" aria-label="App navigation">
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
