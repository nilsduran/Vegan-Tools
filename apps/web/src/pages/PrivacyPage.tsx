/**
 * @file PrivacyPage.tsx
 * @description Dedicated public Privacy Policy page (/privacy and /privacitat).
 * Formally documents our zero-tracking architecture, local-only location processing,
 * GDPR compliance, Supabase Auth handling, and data deletion rights.
 */

import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import { useDocumentHead } from "../utils/seo";

export function PrivacyPage() {
  useDocumentHead({
    title: tx("Privacy Policy"),
    description: tx(
      "Our strict zero-tracking privacy commitment, GDPR compliance, and transparent data policy.",
    ),
    path: "/privacy",
    type: "website",
  });

  return (
    <div className="page values-page privacy-page">
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
            <Lock size={14} aria-hidden="true" />
            <span>{tx("Privacy Policy")}</span>
          </span>
          <h1 className="values-title">
            {tx("Privacy & Zero-Tracking Policy")}
          </h1>
          <p className="values-lead">
            {tx(
              "Vegan Tools is engineered with privacy as a non-negotiable core value. We do not track you, sell your data, or use advertising profiling.",
            )}
          </p>
        </header>

        <div className="values-manifesto-body">
          {/* Section 1: Zero-Tracking */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("1. Zero Tracking & No Third-Party Cookies")}</h2>
              <p>
                {tx(
                  "We do not use tracking cookies, behavioral fingerprinting, or third-party advertising trackers (such as Google Analytics or Meta Pixel). Your navigation, searches, and interactions on Vegan Tools are completely private. Because we do not store tracking cookies, there is no annoying cookie banner to accept.",
                )}
              </p>
            </div>
          </section>

          {/* Section 2: Location Data */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <CheckCircle2 size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("2. Geolocation & Map Searches")}</h2>
              <p>
                {tx(
                  "When you permit Vegan Tools to access your location to find nearby restaurants, your coordinates are processed strictly in your browser and sent ephemerally to our open search engine (Nominatim / Photon / Geoapify) solely to rank proximity. We never record your GPS history, travel logs, or movement profiles on any server.",
                )}
              </p>
            </div>
          </section>

          {/* Section 3: User Accounts & Authentication */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <UserCheck size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("3. Authentication & Account Data")}</h2>
              <p>
                {tx(
                  "Authentication is optional and powered by Supabase. If you sign in (e.g. via Google OAuth), we only store your public email address, username, and user ID needed to associate your personal dining diary, reviews, and favorites. We never share this information with advertisers or data brokers.",
                )}
              </p>
            </div>
          </section>

          {/* Section 4: Data Rights & GDPR */}
          <section className="values-manifesto-section">
            <div className="values-section-icon" aria-hidden="true">
              <Lock size={22} />
            </div>
            <div className="values-section-text">
              <h2>{tx("4. Your Rights & Data Deletion (GDPR)")}</h2>
              <p>
                {tx(
                  "Under European GDPR and international privacy frameworks, you retain full ownership of your data. You may request full export or permanent deletion of your account and all associated dining logs and reviews at any time through your profile settings or by contacting us via our open-source GitHub repository.",
                )}
              </p>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
