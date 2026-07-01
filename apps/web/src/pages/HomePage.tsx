import { ArrowRight, BookOpenText, CookingPot, ScanBarcode } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "../i18n";

export function HomePage() {
  return (
    <div className="page home-page">
      <section className="hero">
        <h1>{t("tagline")}</h1>
        <p>
          Check products, understand restaurant menus and adapt recipes.
        </p>
      </section>

      <section className="tool-grid" aria-label="Tools">
        <Link to="/scanner" className="tool-card">
          <ScanBarcode aria-hidden="true" />
          <h2>{t("openScanner")}</h2>
          <p>{t("scannerSummary")}</p>
          <span>Open tool <ArrowRight aria-hidden="true" /></span>
        </Link>
        <Link to="/menus" className="tool-card">
          <BookOpenText aria-hidden="true" />
          <h2>{t("openMenu")}</h2>
          <p>{t("menusSummary")} Beta.</p>
          <span>Open tool <ArrowRight aria-hidden="true" /></span>
        </Link>
        <Link to="/recipes" className="tool-card">
          <CookingPot aria-hidden="true" />
          <h2>{t("openRecipes")}</h2>
          <p>{t("recipesSummary")}</p>
          <span>Open tool <ArrowRight aria-hidden="true" /></span>
        </Link>
      </section>
    </div>
  );
}
