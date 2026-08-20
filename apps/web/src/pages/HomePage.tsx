import { ArrowRight, CookingPot, MapPin, ScanBarcode } from "lucide-react";
import { Link } from "react-router-dom";
import { t, tx } from "../i18n";

export function HomePage() {
  return (
    <div className="page home-page">
      <section className="hero">
        <h1>{t("tagline")}</h1>
        <p>
          {tx("Check products, find vegan places & menus and adapt recipes.")}
        </p>
      </section>

      <section className="tool-grid" aria-label={tx("Tools")}>
        <Link to="/scanner" className="tool-card">
          <ScanBarcode aria-hidden="true" />
          <h2>{t("openScanner")}</h2>
          <p>{t("scannerSummary")}</p>
          <span>{tx("Open tool")} <ArrowRight aria-hidden="true" /></span>
        </Link>
        <Link to="/map" className="tool-card">
          <MapPin aria-hidden="true" />
          <h2>{t("openMap")}</h2>
          <p>{t("mapSummary")}</p>
          <span>{tx("Open tool")} <ArrowRight aria-hidden="true" /></span>
        </Link>
        <Link to="/recipes" className="tool-card">
          <CookingPot aria-hidden="true" />
          <h2>{t("openRecipes")}</h2>
          <p>{t("recipesSummary")}</p>
          <span>{tx("Open tool")} <ArrowRight aria-hidden="true" /></span>
        </Link>
      </section>
    </div>
  );
}
