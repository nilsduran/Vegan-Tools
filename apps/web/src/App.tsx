/**
 * @file App.tsx
 * @description Root application shell and routing architecture.
 * Configures lazy-loaded page routes, suspense boundaries, navigation bar, language switcher,
 * and authentication context.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { CookingPot, Home, Leaf, MapPin, ScanBarcode, Settings, User } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { t, tx, useLanguage } from "./i18n";
import { AuthProvider, useAuth } from "./auth";
import { useTheme } from "./theme";
import { OnboardingModal } from "./components/OnboardingModal";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const MenuReaderPage = lazy(() => import("./pages/MenuReaderPage").then((m) => ({ default: m.MenuReaderPage })));
const ProductScannerPage = lazy(() => import("./pages/ProductScannerPage").then((m) => ({ default: m.ProductScannerPage })));
const PublicMenuPage = lazy(() => import("./pages/PublicMenuPage").then((m) => ({ default: m.PublicMenuPage })));
const RecipeVeganizerPage = lazy(() => import("./pages/RecipeVeganizerPage").then((m) => ({ default: m.RecipeVeganizerPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const RestaurantDetailPage = lazy(() => import("./pages/RestaurantDetailPage").then((m) => ({ default: m.RestaurantDetailPage })));
const RestaurantMenuPage = lazy(() => import("./pages/RestaurantMenuPage").then((m) => ({ default: m.RestaurantMenuPage })));
const ValuesPage = lazy(() => import("./pages/ValuesPage").then((m) => ({ default: m.ValuesPage })));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage").then((m) => ({ default: m.ResourcesPage })));
const RecipeDetailPage = lazy(() => import("./pages/RecipeDetailPage").then((m) => ({ default: m.RecipeDetailPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="page-loading-skeleton" role="status" aria-live="polite">
      <div className="page-loading-spinner" />
      <span className="sr-only">Carregant…</span>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function OnboardingGate() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowModal(false);
      return;
    }
    const isDone = localStorage.getItem(`vegan_tools_onboarding_done_${user.id}`);
    const isNew = localStorage.getItem(`vegan_tools_new_signup_${user.id}`);
    if (isNew && !isDone) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [user]);

  if (!user || !showModal) return null;

  const handleDismiss = () => {
    localStorage.setItem(`vegan_tools_onboarding_done_${user.id}`, "true");
    localStorage.removeItem(`vegan_tools_new_signup_${user.id}`);
    setShowModal(false);
  };

  return (
    <OnboardingModal
      user={user}
      isOpen={showModal}
      onClose={handleDismiss}
      onComplete={handleDismiss}
    />
  );
}

export function App() {
  const native = Capacitor.isNativePlatform();
  const links = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/scanner", label: t("scanner"), icon: ScanBarcode },
    { to: "/map", label: t("map"), icon: MapPin },
    { to: "/recipes", label: t("recipes"), icon: CookingPot },
    { to: "/profile", label: tx("Profile"), icon: User },
  ];
  return (
    <AuthProvider>
      <ScrollToTop />
      <OnboardingGate />
      <div className={`app-shell${native ? " native-app" : ""}`}>
        <header className="site-header">
          <NavLink to="/" className="brand">
            <span className="brand-mark"><Leaf aria-hidden="true" /></span>
            <span>{t("brand")}</span>
          </NavLink>
          {!native && (
            <nav className="desktop-nav" aria-label={tx("Primary navigation")}>
              <NavLink to="/scanner">{t("scanner")}</NavLink>
              <NavLink to="/map">{t("map")}</NavLink>
              <NavLink to="/recipes">{t("recipes")}</NavLink>
              <NavLink to="/resources">{tx("Resources")}</NavLink>
              <NavLink to="/profile">{tx("Profile")}</NavLink>
            </nav>
          )}
        </header>

        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MenuReaderPage />} />
              <Route path="/menus" element={<MenuReaderPage />} />
              <Route path="/scanner" element={<ProductScannerPage />} />
              <Route path="/product/:gtin" element={<ProductScannerPage />} />
              <Route path="/recipes" element={<RecipeVeganizerPage />} />
              <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
              <Route path="/receptes/:slug" element={<RecipeDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/configuracio" element={<SettingsPage />} />
              <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
              <Route path="/restaurant/:id/menu" element={<RestaurantMenuPage />} />
              <Route path="/menu/:id" element={<RestaurantMenuPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/sobre" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/privacitat" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/condicions" element={<TermsPage />} />
              <Route path="/m/:slug" element={<PublicMenuPage />} />
            </Routes>
          </Suspense>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav" aria-label={tx("App navigation")}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <footer className="site-footer">
          <div className="site-footer-content">
            <div className="site-footer-links">
              <NavLink to="/resources" className="site-footer-link">
                {tx("Resources")}
              </NavLink>
              <span className="site-footer-dot" aria-hidden="true">•</span>
              <NavLink to="/about" className="site-footer-link">
                {tx("About")}
              </NavLink>
              <span className="site-footer-dot" aria-hidden="true">•</span>
              <NavLink to="/privacy" className="site-footer-link">
                {tx("Privacy")}
              </NavLink>
              <span className="site-footer-dot" aria-hidden="true">•</span>
              <NavLink to="/terms" className="site-footer-link">
                {tx("Terms")}
              </NavLink>
            </div>
            <a href="https://nilsduran.github.io" target="_blank" rel="noreferrer" className="site-footer-copy">
              © 2026 Nils Duran
            </a>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
