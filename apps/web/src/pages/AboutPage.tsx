/**
 * @file AboutPage.tsx
 * @description Public About page (/about) presenting Vegan Tools core principles,
 * ethical anti-speciesism, 100% safe space photography policy, zero-tracking privacy,
 * science-based nutrition (VeganHealth.org, NHS), and the open-source GitHub repository.
 */

import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  ExternalLink,
  EyeOff,
  Github,
  Heart,
  Leaf,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import { useDocumentHead } from "../utils/seo";

export function AboutPage() {
  useDocumentHead({
    title: tx("About Vegan Tools"),
    description: tx(
      "Safe space, privacy, and evidence-based vegan advocacy. Discover our core ethical principles and open-source code.",
    ),
    path: "/about",
    type: "website",
  });

  return (
    <div className="page about-page">
      {/* Back Navigation */}
      <nav className="values-nav" aria-label={tx("Navigation")}>
        <Link to="/" className="values-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tx("Back to Home")}</span>
        </Link>
      </nav>

      <div className="about-page-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem 0" }}>
        {/* Hero Section */}
        <header className="about-hero" style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            className="about-logo-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "rgba(22, 163, 74, 0.12)",
              color: "#16a34a",
              marginBottom: "1rem",
            }}
          >
            <Leaf size={30} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {tx("About Vegan Tools")}
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.6,
              color: "var(--color-text-secondary, #475569)",
              maxWidth: "640px",
              margin: "0 auto",
            }}
          >
            {tx(
              "A suite of free, independent, and ethical tools crafted to empower plant-based living, protect animal life, and uphold privacy and scientific evidence.",
            )}
          </p>
        </header>

        {/* 4 Core Pillars Grid */}
        <section className="about-pillars-section" aria-label={tx("Core Principles")}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.25rem", textAlign: "center" }}>
            {tx("Our Core Principles")}
          </h2>

          <div
            className="about-pillars-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginBottom: "3rem",
            }}
          >
            {/* Pillar 1: Anti-speciesism */}
            <article
              className="about-pillar-card"
              style={{
                backgroundColor: "var(--color-bg-card, #ffffff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  marginBottom: "1rem",
                }}
              >
                <Heart size={24} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {tx("Animal Liberation & Justice")}
              </h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--color-text-secondary, #475569)" }}>
                {tx(
                  "Veganism is fundamentally an ethical stance against animal exploitation, commodification, and speciesism. We believe every sentient non-human animal has their own subjective experience, dignity, and right to live free from harm.",
                )}
              </p>
            </article>

            {/* Pillar 2: 100% Safe Space */}
            <article
              className="about-pillar-card"
              style={{
                backgroundColor: "var(--color-bg-card, #ffffff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  marginBottom: "1rem",
                }}
              >
                <EyeOff size={24} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {tx("100% Safe Space Policy")}
              </h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--color-text-secondary, #475569)" }}>
                {tx(
                  "Zero exposure to imagery of animal slaughter, corpses, or suffering. Vegan Tools enforces strict media filtering so that every photo, dish, and restaurant illustration celebrates pure, vibrant plant foods without distress.",
                )}
              </p>
            </article>

            {/* Pillar 3: Zero-Tracking Privacy */}
            <article
              className="about-pillar-card"
              style={{
                backgroundColor: "var(--color-bg-card, #ffffff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  color: "#3b82f6",
                  marginBottom: "1rem",
                }}
              >
                <Lock size={24} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {tx("Zero-Tracking Privacy")}
              </h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--color-text-secondary, #475569)" }}>
                {tx(
                  "Your location and searches stay on your device. We do not use tracking cookies, behavioral analytics, or third-party advertising networks. GDPR compliance is built into our core architecture with zero cookies banners needed.",
                )}
              </p>
            </article>

            {/* Pillar 4: Rigor and Honesty with Ingredients */}
            <article
              className="about-pillar-card"
              style={{
                backgroundColor: "var(--color-bg-card, #ffffff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(168, 85, 247, 0.1)",
                  color: "#a855f7",
                  marginBottom: "1rem",
                }}
              >
                <CheckCircle2 size={24} aria-hidden="true" />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {tx("Rigor and honesty with ingredients")}
              </h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--color-text-secondary, #475569)" }}>
                {tx(
                  "We inspect ingredients with meticulous care, flagging hidden animal derivatives like cochineal (E120), gelatin, albumin, whey, or shellac. We apply strict precautionary standards to ensure that you can dine and shop with complete confidence.",
                )}
              </p>
            </article>
          </div>
        </section>

        {/* Open Source on GitHub Section */}
        <section
          className="about-github-section"
          style={{
            backgroundColor: "var(--color-bg-secondary, #f8fafc)",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(0, 0, 0, 0.06)",
              marginBottom: "1rem",
            }}
          >
            <Github size={28} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            {tx("Open Source on GitHub")}
          </h2>
          <p
            style={{
              fontSize: "0.98rem",
              lineHeight: 1.6,
              color: "var(--color-text-secondary, #475569)",
              maxWidth: "540px",
              margin: "0 auto 1.5rem",
            }}
          >
            {tx(
              "Vegan Tools is 100% free and open-source software. The entire codebase, database models, algorithms, and documentation are public for community audit, transparent verification, and contributions.",
            )}
          </p>
          <a
            href="https://github.com/nilsduran/Vegan-Tools"
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              textDecoration: "none",
            }}
          >
            <Github size={18} aria-hidden="true" />
            <span>{tx("View on GitHub")}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}
