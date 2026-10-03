/**
 * @file SettingsPage.tsx
 * @description Dedicated Account & Settings page.
 * Manages user account (username, email), dietary & lifestyle identity, app language,
 * visual theme, GDPR data export, cache clearing, and account deletion.
 */

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Download,
  Edit2,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../auth";
import { setLanguage, tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";
import { useLifestyle, type LifestyleIdentity } from "../lifestyle";
import { useTheme, type ThemeMode } from "../theme";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  RestaurantBadgeIcon,
} from "../components/DietIcons";
import { FlagCatalonia, FlagUK } from "../components/FlagIcons";

export function SettingsPage() {
  const language = useLanguage();
  useDocumentHead({
    title: tx("Account & Settings"),
    description: tx("Manage your Vegan Tools account, dietary preferences, language, and privacy settings."),
    path: "/settings",
    type: "website",
  });
  const navigate = useNavigate();
  const { user, token, signOut, updateUsername } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lifestyle, setLifestyle } = useLifestyle();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim() === user?.username) {
      setIsEditingUsername(false);
      return;
    }
    setUsernameSaving(true);
    setUsernameError(null);
    setUsernameSuccess(null);
    try {
      const res = await updateUsername(newUsername.trim());
      if (res?.error) {
        setUsernameError(res.error);
      } else {
        setUsernameSuccess(tx("Username updated successfully!"));
        setIsEditingUsername(false);
        setTimeout(() => setUsernameSuccess(null), 3000);
      }
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "Error updating username.");
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleExportData = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user?.id,
          username: user?.username,
          email: user?.email,
        },
        lifestyle: localStorage.getItem("vegan_tools_lifestyle_identity") || "vegan",
        theme: localStorage.getItem("vegan-tools-theme") || "system",
        language: localStorage.getItem("vegan-tools-language") || "ca",
        top4Restaurants: JSON.parse(localStorage.getItem(`vegan_tools_top4_${user?.id || "guest"}`) || "[]"),
        diaryLogs: JSON.parse(localStorage.getItem(`vegan_tools_diary_${user?.id || "guest"}`) || "[]"),
        userLists: JSON.parse(localStorage.getItem("vegan_tools_user_lists") || "[]"),
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vegan-tools-${user?.username || "user"}-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Error exporting data");
    }
  };

  const handleDeleteAccount = () => {
    const confirmation = confirm(
      tx("Are you sure you want to delete your account? All your personal logs and reviews will be permanently deleted.")
    );
    if (!confirmation) return;

    try {
      if (user?.id) {
        localStorage.removeItem(`vegan_tools_diary_${user.id}`);
        localStorage.removeItem(`vegan_tools_top4_${user.id}`);
      }
      localStorage.removeItem("vegan_tools_user_lists");
      void signOut();
      navigate("/");
    } catch {
      alert("Error deleting account.");
    }
  };

  return (
    <div className="page narrow-page profile-container" style={{ maxWidth: "680px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header with back navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <Link
          to="/profile"
          className="secondary-button"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", fontSize: "0.88rem" }}
        >
          <ArrowLeft size={16} />
          <span>{tx("Profile")}</span>
        </Link>
        {user && (
          <button
            type="button"
            className="secondary-button"
            onClick={signOut}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", fontSize: "0.88rem" }}
          >
            <LogOut size={16} />
            <span>{tx("Sign out")}</span>
          </button>
        )}
      </div>

      <header className="page-heading" style={{ textAlign: "left", marginBottom: "1.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Settings size={26} style={{ color: "var(--green)" }} />
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>{tx("Account & Settings")}</h1>
        </div>
      </header>

      {/* Unauthenticated notice */}
      {!user && (
        <section
          className="profile-reviews-section profile-reviews-card"
          style={{ padding: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}
        >
          <p style={{ margin: "0 0 1rem 0", color: "var(--muted)" }}>
            {tx("Sign in or create an account to manage your profile and account settings.")}
          </p>
          <Link to="/profile" className="primary-button" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <UserIcon size={16} />
            <span>{tx("Sign in / Create account")}</span>
          </Link>
        </section>
      )}

      {/* Section 1: Account (Only shown when authenticated) */}
      {user && (
        <section
          className="profile-reviews-section profile-reviews-card"
          style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
        >
          <h2 style={{ fontSize: "1.15rem", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserIcon size={18} style={{ color: "var(--green)" }} />
            <span>{tx("Account")}</span>
          </h2>

          {usernameSuccess && (
            <div className="auth-alert success" style={{ marginBottom: "1rem" }}>
              <Check size={16} />
              <span>{usernameSuccess}</span>
            </div>
          )}
          {usernameError && (
            <div className="auth-alert error" style={{ marginBottom: "1rem" }}>
              <span>{usernameError}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Username Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--line)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block" }}>
                  {tx("Username")}
                </span>
                <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>
                  {user.username}
                </strong>
              </div>

              {!isEditingUsername && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setNewUsername(user.username);
                    setIsEditingUsername(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
                >
                  <Edit2 size={14} />
                  <span>{tx("Edit username")}</span>
                </button>
              )}
            </div>

            {/* Editing Username Form */}
            {isEditingUsername && (
              <form onSubmit={handleUsernameSubmit} style={{ padding: "1rem", borderRadius: "10px", border: "1px solid var(--green)", background: "var(--green-light)" }}>
                <label htmlFor="settings-username-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  {tx("Choose a public username")}
                </label>
                <input
                  id="settings-username-input"
                  type="text"
                  required
                  autoFocus
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  minLength={3}
                  maxLength={25}
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    width: "100%",
                    boxSizing: "border-box",
                    fontSize: "0.95rem",
                    marginBottom: "0.4rem",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                  }}
                />
                <p style={{ margin: "0 0 0.8rem 0", fontSize: "0.76rem", color: "var(--muted)" }}>
                  {tx("Letters, numbers, underscores and dots. Maximum 2 changes per month.")}
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setIsEditingUsername(false);
                      setUsernameError(null);
                    }}
                    disabled={usernameSaving}
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
                  >
                    <span>{tx("Cancel")}</span>
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={usernameSaving || newUsername.trim().length < 3 || newUsername.trim() === user.username}
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
                  >
                    <Check size={14} />
                    <span>{usernameSaving ? tx("Saving…") : tx("Save username")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Email (Readonly) */}
            {user.email && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--line)",
                }}
              >
                <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block" }}>
                  {tx("Email address")}
                </span>
                <span style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 2: Dietary & Lifestyle Identity */}
      <section
        className="profile-reviews-section profile-reviews-card"
        style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
      >
        <label
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            display: "block",
            marginBottom: "0.3rem",
          }}
        >
          {tx("Dietary & Lifestyle Identity")}
        </label>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 0.85rem 0" }}>
          {tx("Choose how you identify to personalize your experience.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
          {[
            {
              id: "vegan" as LifestyleIdentity,
              label: tx("Vegan"),
              icon: <VeganBadgeIcon size={20} />,
            },
            {
              id: "vegetarian" as LifestyleIdentity,
              label: tx("Vegetarian"),
              icon: <VegetarianBadgeIcon size={20} />,
            },
            {
              id: "non-veg" as LifestyleIdentity,
              label: tx("Non Veg"),
              icon: <RestaurantBadgeIcon size={20} />,
            },
          ].map(({ id, label, icon }) => {
            const isSelected = lifestyle === id;
            return (
              <button
                key={id}
                type="button"
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: "0.92rem" }}>
                    {label}
                  </span>
                </div>
                {isSelected && <Check size={18} style={{ color: "var(--green)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 3: Language */}
      <section
        className="profile-reviews-section profile-reviews-card"
        style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
      >
        <label
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            display: "block",
            marginBottom: "0.6rem",
          }}
        >
          {tx("Language")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", maxWidth: "420px" }}>
          <button
            type="button"
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
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FlagUK />
              <span>English</span>
            </div>
            {language === "en" && <Check size={16} style={{ color: "var(--green)" }} />}
          </button>

          <button
            type="button"
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
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <FlagCatalonia />
              <span>Català</span>
            </div>
            {language === "ca" && <Check size={16} style={{ color: "var(--green)" }} />}
          </button>
        </div>
      </section>

      {/* Section 4: Visual Theme */}
      <section
        className="profile-reviews-section profile-reviews-card"
        style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
      >
        <label
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            display: "block",
            marginBottom: "0.6rem",
          }}
        >
          {tx("Theme")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", maxWidth: "420px" }}>
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
                }}
              >
                <Icon size={18} style={{ color: isSelected ? "var(--green)" : "var(--muted)" }} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 5: Data & Privacy (GDPR) */}
      <section
        className="profile-reviews-section profile-reviews-card"
        style={{ padding: "1.5rem" }}
      >
        <label
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted)",
            display: "block",
            marginBottom: "0.3rem",
          }}
        >
          {tx("Data & Privacy (GDPR)")}
        </label>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 0.8rem 0" }}>
          {tx("Export all your personal logs, reviews and saved lists in an open format.")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.6rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Download size={16} />
            <span>{tx("Download my data (JSON)")}</span>
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
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.6rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>🧹 {tx("Clear local cache")}</span>
          </button>

          {user && (
            <button
              type="button"
              className="settings-delete-btn"
              onClick={handleDeleteAccount}
            >
              <Trash2 size={16} />
              <span>{tx("Delete account and data")}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
