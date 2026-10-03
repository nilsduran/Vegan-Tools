/**
 * @file ValuesPage.tsx
 * @description Public manifesto and ethical commitments of Vegan Tools:
 * why this tool exists, safe space without animal exploitation images,
 * ingredient rigor, zero-tracking privacy, and open source collaboration.
 */

import { ArrowLeft, Heart, Shield, CheckCircle2, Lock, Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";

export function ValuesPage() {
  return (
    <div className="page values-page">
      {/* Back Navigation */}
      <nav className="values-nav" aria-label={tx("Navigation")}>
        <Link to="/" className="values-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tx("Back to Home")}</span>
        </Link>
      </nav>

      {/* Manifesto Container */}
      <article className="values-manifesto-container">
        <header className="values-manifesto-header">
          <span className="values-badge">
            <Heart size={14} aria-hidden="true" />
            <span>{tx("Ethical Manifesto & Values")}</span>
          </span>
          <h1 className="values-title">
            {tx("Why we created Vegan Tools")}
          </h1>
          <p className="values-lead">
            {tx(
              "A free, transparent, community-driven tool dedicated to animal liberation and to everyone who chooses to live without harming other sentient beings.",
            )}
          </p>
        </header>

        {/* Manifesto Content */}
        <div className="values-manifesto-body">
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <Heart size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("Animal ethics, not a temporary trend")}</h2>
              <p>
                {tx(
                  "Veganism is neither a temporary diet nor a commercial niche. It is a clear ethical conviction: profound respect for the life, dignity, and freedom of all animals. We started this project because we were tired of daily uncertainty: asking the server five times if the broth has bones, if the dough contains butter, or deciphering endless ingredient lists in tiny print at the supermarket. Vegan Tools exists to make this journey simpler, safer, and calmer.",
                )}
              </p>
            </div>
          </section>

          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <Shield size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("Safe Space")}</h2>
              <p>
                {tx(
                  "Most restaurant portals are designed for meat-eaters, displaying animal bodies and meat dishes prominently on the front page. At Vegan Tools, we uphold an uncompromising principle: this app is a visual safe haven. You will never encounter photographs of dead animals on the map or restaurant menus. If you scan a product barcode that turns out not to be vegan, its photo is blurred by default to respect your peace of mind.",
                )}
              </p>
            </div>
          </section>

          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <CheckCircle2 size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("Rigor and honesty with ingredients")}</h2>
              <p>
                {tx(
                  "We inspect ingredients down to the finest detail, especially hidden animal derivatives that often go unnoticed: insect cochineal (E120), pork or beef gelatin, albumen, milk whey, or shellac. We prefer to exercise caution and raise a doubt rather than greenlight an option that isn't truly vegan. On restaurant menus, we clearly distinguish 100% vegan dishes from those that require kitchen modifications.",
                )}
              </p>
            </div>
          </section>

          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <Lock size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("True privacy: zero ads, zero tracking")}</h2>
              <p>
                {tx(
                  "We have no investors asking for monetization metrics or agreements with advertising networks. We use no tracking cookies and never share your data with third parties. Your geolocation is only used to locate you on the map during searches and is never permanently stored on user profiles.",
                )}
              </p>
            </div>
          </section>

          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <Code2 size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("Open source and community")}</h2>
              <p>
                {tx(
                  "We believe in mutual aid and open collaboration. Vegan Tools is powered by incredible community projects like OpenStreetMap and Open Food Facts. The codebase is free and open-source, allowing anyone to inspect how it works, contribute improvements, or fork it to support other initiatives sharing the same values.",
                )}
              </p>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <footer className="values-manifesto-footer">
          <p>
            {tx(
              "If you want to collaborate, suggest a restaurant, contribute menus, or help with development, you are warmly invited to join our open community.",
            )}
          </p>
        </footer>
      </article>
    </div>
  );
}
