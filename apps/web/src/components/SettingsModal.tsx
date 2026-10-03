/**
 * @file SettingsModal.tsx
 * @description Modal dialog for app-wide settings: Language, Theme (Light/Dark/System),
 * and Dietary & Lifestyle Identity (Vegan, Vegetarian, Non-veg).
 */

import { Check, Laptop, Moon, Settings, Sun, X } from "lucide-react";
import { setLanguage, tx, useLanguage } from "../i18n";
import { useTheme, type ThemeMode } from "../theme";
import { useLifestyle, type LifestyleIdentity } from "../lifestyle";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function FlagUK() {
  return (
    <svg
      viewBox="0 0 60 40"
      width="24"
      height="16"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}
    >
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
    <svg
      viewBox="0 0 90 60"
      width="24"
      height="16"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}
    >
      <rect width="90" height="60" fill="#FCD116" />
      <rect y="6.667" width="90" height="6.667" fill="#D7141A" />
      <rect y="20" width="90" height="6.667" fill="#D7141A" />
      <rect y="33.333" width="90" height="6.667" fill="#D7141A" />
      <rect y="46.667" width="90" height="6.667" fill="#D7141A" />
    </svg>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const language = useLanguage();
  const { theme, setTheme } = useTheme();
  const { lifestyle, setLifestyle } = useLifestyle();

  if (!isOpen) return null;

  return (
    <div
      className="auth-dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div
        className="auth-dialog-modal settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px", padding: "1.75rem 1.5rem" }}
      >
        <button
          type="button"
          className="auth-dialog-close-btn"
          onClick={onClose}
          aria-label={tx("Close")}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <header className="auth-dialog-header" style={{ marginBottom: "1.4rem" }}>
          <div className="auth-dialog-leaf-badge">
            <Settings size={22} aria-hidden="true" />
          </div>
          <h2 id="settings-dialog-title" style={{ fontSize: "1.35rem", margin: "0.4rem 0 0.2rem" }}>
            {tx("Settings")}
          </h2>
          <p className="auth-dialog-subtitle" style={{ fontSize: "0.88rem", margin: 0 }}>
            {tx("Customize your Vegan Tools experience")}
          </p>
        </header>

        <div className="settings-modal-sections" style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
          {/* Section 1: Language */}
          <section className="settings-section">
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                display: "block",
                marginBottom: "0.55rem",
              }}
            >
              {tx("Language")}
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <button
                type="button"
                className={`settings-option-btn ${language === "ca" ? "active" : ""}`}
                onClick={() => setLanguage("ca")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "10px",
                  border: language === "ca" ? "2px solid var(--green)" : "1px solid var(--line)",
                  background: language === "ca" ? "var(--green-light)" : "var(--bg-subtle)",
                  color: language === "ca" ? "var(--green-dark)" : "var(--text-primary)",
                  fontWeight: language === "ca" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <FlagCatalonia />
                  <span>Català</span>
                </div>
                {language === "ca" && <Check size={16} style={{ color: "var(--green)" }} />}
              </button>

              <button
                type="button"
                className={`settings-option-btn ${language === "en" ? "active" : ""}`}
                onClick={() => setLanguage("en")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "10px",
                  border: language === "en" ? "2px solid var(--green)" : "1px solid var(--line)",
                  background: language === "en" ? "var(--green-light)" : "var(--bg-subtle)",
                  color: language === "en" ? "var(--green-dark)" : "var(--text-primary)",
                  fontWeight: language === "en" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <FlagUK />
                  <span>English</span>
                </div>
                {language === "en" && <Check size={16} style={{ color: "var(--green)" }} />}
              </button>
            </div>
          </section>

          {/* Section 2: Visual Theme */}
          <section className="settings-section">
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                display: "block",
                marginBottom: "0.55rem",
              }}
            >
              {tx("Theme")}
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {[
                { id: "light" as ThemeMode, label: tx("Light"), icon: Sun },
                { id: "dark" as ThemeMode, label: tx("Dark"), icon: Moon },
                { id: "system" as ThemeMode, label: tx("System"), icon: Laptop },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`settings-option-btn ${isSelected ? "active" : ""}`}
                    onClick={() => setTheme(id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.7rem 0.5rem",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid var(--green)" : "1px solid var(--line)",
                      background: isSelected ? "var(--green-light)" : "var(--bg-subtle)",
                      color: isSelected ? "var(--green-dark)" : "var(--text-primary)",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={18} style={{ color: isSelected ? "var(--green)" : "var(--muted)" }} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Lifestyle / Dietary Identity */}
          <section className="settings-section">
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              {tx("Dietary & Lifestyle Identity")}
            </span>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.6rem 0" }}>
              {tx("Choose how you identify to personalize your experience.")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {[
                {
                  id: "vegan" as LifestyleIdentity,
                  label: tx("Vegan"),
                  emoji: "🌿",
                  desc: "100% plant-based & ethical",
                },
                {
                  id: "vegetarian" as LifestyleIdentity,
                  label: tx("Vegetarian"),
                  emoji: "🧀",
                  desc: "Plant-based with dairy/eggs",
                },
                {
                  id: "non-veg" as LifestyleIdentity,
                  label: tx("Non Veg"),
                  emoji: "🍽️",
                  desc: "Exploring vegan options",
                },
              ].map(({ id, label, emoji, desc }) => {
                const isSelected = lifestyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`settings-option-btn ${isSelected ? "active" : ""}`}
                    onClick={() => setLifestyle(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 0.9rem",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid var(--green)" : "1px solid var(--line)",
                      background: isSelected ? "var(--green-light)" : "var(--bg-subtle)",
                      color: isSelected ? "var(--green-dark)" : "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{emoji}</span>
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: "0.92rem" }}>
                          {label}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} style={{ color: "var(--green)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 4: Data & Privacy (GDPR) */}
          <section className="settings-section">
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              {tx("Data & Privacy (GDPR)")}
            </span>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.6rem 0" }}>
              {tx("Export all your personal logs, reviews and saved lists in an open format.")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  try {
                    const exportPayload = {
                      exportedAt: new Date().toISOString(),
                      lifestyle: localStorage.getItem("vegan_tools_lifestyle_identity") || "vegan",
                      theme: localStorage.getItem("vegan-tools-theme") || "system",
                      language: localStorage.getItem("vegan-tools-language") || "ca",
                      diaryLogs: JSON.parse(localStorage.getItem("vegan_tools_diary_logs") || "[]"),
                      userLists: JSON.parse(localStorage.getItem("vegan_tools_user_lists") || "[]"),
                      recentProductScans: JSON.parse(localStorage.getItem("recent_product_scans_v1") || "[]"),
                      authSession: JSON.parse(localStorage.getItem("vegan_tools_auth_session") || "null"),
                    };
                    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `vegan-tools-data-${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    alert("Error exporting data");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📥 {tx("Download my data (JSON)")}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  localStorage.removeItem("restaurant_menus_cache");
                  localStorage.removeItem("recent_product_scans_v1");
                  alert(tx("Local cache cleared successfully!"));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🧹 {tx("Clear local cache")}
              </button>
            </div>

            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.65rem 0.75rem",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
              }}
            >
              <strong>🛡️ {tx("Zero-Tracking Guarantee")}:</strong>{" "}
              {tx("No cookies, no advertising profiling, no Google Analytics or tracking pixels.")}
            </div>
          </section>

          {/* Section 5: Legal & App Version */}
          <footer
            style={{
              paddingTop: "0.8rem",
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "var(--muted)",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/privacy";
                }}
                style={{ textDecoration: "underline" }}
              >
                {tx("Privacy Policy")}
              </a>
              <span>•</span>
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/terms";
                }}
                style={{ textDecoration: "underline" }}
              >
                {tx("Terms")}
              </a>
              <span>•</span>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/about";
                }}
                style={{ textDecoration: "underline" }}
              >
                {tx("About")}
              </a>
            </div>
            <span>v0.1.0 • FOSS</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
