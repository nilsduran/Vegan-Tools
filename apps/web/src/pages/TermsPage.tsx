/**
 * @file TermsPage.tsx
 * @description Dedicated public Terms of Service page (/terms and /condicions).
 * Outlines open-source licensing (GPLv3), Safe Space ethical community standards,
 * allergy/medical disclaimers, and user contributions.
 */

import { ArrowLeft, BookOpen, EyeOff, FileText, HeartHandshake, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import { useDocumentHead } from "../utils/seo";

export function TermsPage() {
  useDocumentHead({
    title: tx("Terms of Service"),
    description: tx(
      "Terms of service, community rules, safe space policy, and open-source licensing for Vegan Tools.",
    ),
    path: "/terms",
    type: "website",
  });

  return (
    <div className="page values-page terms-page">
      {/* Back Navigation */}
      <nav className="values-nav" aria-label={tx("Navigation")}>
        <Link to="/" className="values-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tx("Back to Home")}</span>
        </Link>
      </nav>

      <article className="values-manifesto-container">
        <header className="values-manifesto-header">
          <span className="values-badge">
            <FileText size={14} aria-hidden="true" />
            <span>{tx("Terms of Service")}</span>
          </span>
          <h1 className="values-title">
            {tx("Terms of Service & Community Charter")}
          </h1>
          <p className="values-lead">
            {tx(
              "Vegan Tools is a free, non-profit community platform built to support ethical vegan living and animal liberation.",
            )}
          </p>
        </header>

        <div className="values-manifesto-body">
          {/* Section 1: Ethical Safe Space */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <EyeOff size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("1. 100% Safe Space Policy")}</h2>
              <p>
                {tx(
                  "Vegan Tools is an uncompromising safe haven. Uploading, submitting, or displaying any photography or media depicting animal slaughter, animal corpses, meat, fish, poultry, or suffering is strictly prohibited. Any contributed reviews or media violating this rule will be permanently deleted without notice.",
                )}
              </p>
            </div>
          </section>

          {/* Section 2: Allergy Disclaimer */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <ShieldAlert size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("2. Allergen & Medical Disclaimer")}</h2>
              <p>
                {tx(
                  "Vegan Tools is an ethical orientation guide for plant-based living, not a certified medical or clinical service. We cannot guarantee the absence of cross-contamination or allergen traces in restaurant kitchens or food processing facilities. Individuals with severe allergies or celiac disease must always verify food preparation directly with venue staff.",
                )}
              </p>
            </div>
          </section>

          {/* Section 3: Community Contributions */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <HeartHandshake size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("3. Community Contributions & Reviews")}</h2>
              <p>
                {tx(
                  "By sharing dining logs, menu corrections, or reviews, you agree that your contributions are truthful, respectful, and intended to assist fellow vegans. Defamatory content, commercial spam, and bad-faith reviews are strictly prohibited.",
                )}
              </p>
            </div>
          </section>

          {/* Section 4: Open Source & Free Software */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <BookOpen size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("4. Open Source Software & Warranty")}</h2>
              <p>
                {tx(
                  "Vegan Tools is provided free of charge under open-source terms. The service is provided 'as is', without warranty of any kind. You can review, audit, or contribute to our codebase transparently on GitHub.",
                )}
              </p>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
