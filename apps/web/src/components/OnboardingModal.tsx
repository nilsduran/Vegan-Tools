import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, User, X } from "lucide-react";
import { setLanguage, tx, useLanguage, type Language } from "../i18n";
import { useLifestyle, type LifestyleIdentity } from "../lifestyle";
import { useAuth, type AuthUser } from "../auth";
import { FlagCatalonia, FlagUK } from "./FlagIcons";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  RestaurantBadgeIcon,
} from "./DietIcons";

export interface OnboardingModalProps {
  user: AuthUser;
  isOpen?: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialStep?: 1 | 2 | 3;
}

export function OnboardingModal({
  user,
  isOpen = true,
  onClose,
  onComplete,
  initialStep = 1,
}: OnboardingModalProps) {
  const language = useLanguage();
  const { updateUsername } = useAuth();
  const { lifestyle, setLifestyle } = useLifestyle();

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [chosenUsername, setChosenUsername] = useState(
    user.username && !user.username.startsWith("vegi_") ? user.username : ""
  );
  const [selectedLifestyle, setSelectedLifestyle] = useState<LifestyleIdentity>(lifestyle || "vegan");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      if (chosenUsername.trim() && chosenUsername.trim() !== user.username) {
        const res = await updateUsername(chosenUsername.trim());
        if (res?.error) {
          setErrorMsg(res.error);
          setStep(2);
          setSaving(false);
          return;
        }
      }
      setLifestyle(selectedLifestyle);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`vegan_tools_onboarding_done_${user.id}`, "true");
      }
      onComplete?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving profile setup.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`vegan_tools_onboarding_done_${user.id}`, "true");
    }
    onClose();
  };

  return (
    <div className="auth-dialog-backdrop" onClick={handleSkip} role="presentation">
      <div
        className="auth-dialog-modal onboarding-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{ maxWidth: "440px" }}
      >
        <button
          type="button"
          className="auth-dialog-close-btn"
          onClick={handleSkip}
          aria-label={tx("Close")}
        >
          <X aria-hidden="true" />
        </button>

        {/* Step Indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                style={{
                  width: "28px",
                  height: "4px",
                  borderRadius: "2px",
                  background: step >= num ? "var(--green, #059669)" : "var(--line, #e2e8f0)",
                  transition: "background 0.2s ease",
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>
            {step === 1
              ? "Step 1 of 3"
              : step === 2
              ? tx("Step 2 of 3")
              : tx("Step 3 of 3")}
          </span>
        </div>

        {errorMsg && (
          <div className="auth-alert error" style={{ marginBottom: "1rem" }}>
            {errorMsg}
          </div>
        )}

        {/* Step 1: Language (In English by default as requested) */}
        {step === 1 && (
          <div>
            <header className="auth-dialog-header" style={{ textAlign: "left", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>🌍</div>
              <h2 id="onboarding-title" style={{ margin: "0 0 0.35rem 0", fontSize: "1.3rem" }}>
                Choose your preferred language
              </h2>
              <p style={{ margin: 0, color: "var(--muted, #64748b)", fontSize: "0.88rem", lineHeight: 1.45 }}>
                Select your language for restaurant menus, ingredient scans, and community reviews.
              </p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage("en");
                  setLanguage("en");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: selectedLanguage === "en" ? "2px solid var(--green, #059669)" : "1px solid var(--line, #e2e8f0)",
                  background: selectedLanguage === "en" ? "var(--green-light, rgba(5, 150, 105, 0.08))" : "var(--bg-subtle, #f8fafc)",
                  color: selectedLanguage === "en" ? "var(--green-dark, #065f46)" : "var(--text-primary, #0f172a)",
                  fontWeight: selectedLanguage === "en" ? 700 : 500,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <FlagUK width={24} height={16} />
                  <span>English</span>
                </div>
                {selectedLanguage === "en" && <Check size={18} style={{ color: "var(--green, #059669)" }} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage("ca");
                  setLanguage("ca");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: selectedLanguage === "ca" ? "2px solid var(--green, #059669)" : "1px solid var(--line, #e2e8f0)",
                  background: selectedLanguage === "ca" ? "var(--green-light, rgba(5, 150, 105, 0.08))" : "var(--bg-subtle, #f8fafc)",
                  color: selectedLanguage === "ca" ? "var(--green-dark, #065f46)" : "var(--text-primary, #0f172a)",
                  fontWeight: selectedLanguage === "ca" ? 700 : 500,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <FlagCatalonia width={24} height={16} />
                  <span>Català</span>
                </div>
                {selectedLanguage === "ca" && <Check size={18} style={{ color: "var(--green, #059669)" }} />}
              </button>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => setStep(2)}
              style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.95rem" }}
            >
              <span>{language === "ca" ? "Continua" : "Continue"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Username */}
        {step === 2 && (
          <div>
            <header className="auth-dialog-header" style={{ textAlign: "left", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>👤</div>
              <h2 id="onboarding-title" style={{ margin: "0 0 0.35rem 0", fontSize: "1.3rem" }}>
                {tx("Choose your username")}
              </h2>
              <p style={{ margin: 0, color: "var(--muted, #64748b)", fontSize: "0.88rem", lineHeight: 1.45 }}>
                {tx("This name will identify your visits, Top 4 favorites, and community reviews.")}
              </p>
            </header>

            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (chosenUsername.trim().length >= 3) {
                  setStep(3);
                }
              }}
            >
              <div className="auth-field" style={{ marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  required
                  autoFocus
                  value={chosenUsername}
                  onChange={(e) =>
                    setChosenUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))
                  }
                  placeholder={tx("username (e.g. carla_vegan)")}
                  minLength={3}
                  maxLength={25}
                  style={{
                    padding: "0.75rem 0.9rem",
                    fontSize: "1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--line, #cbd5e1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ display: "block", marginTop: "0.35rem", fontSize: "0.76rem", color: "var(--muted, #64748b)" }}>
                  {tx("Letters, numbers, underscores and dots. 3 to 25 characters.")}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep(1)}
                  style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}
                >
                  <ArrowLeft size={16} />
                  <span>{tx("Back")}</span>
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={chosenUsername.trim().length < 3}
                  style={{ flex: 1, justifyContent: "center", padding: "0.75rem", fontSize: "0.95rem" }}
                >
                  <span>{tx("Continue")}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Dietary Preference */}
        {step === 3 && (
          <div>
            <header className="auth-dialog-header" style={{ textAlign: "left", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>🌱</div>
              <h2 id="onboarding-title" style={{ margin: "0 0 0.35rem 0", fontSize: "1.3rem" }}>
                {tx("What is your dietary preference?")}
              </h2>
              <p style={{ margin: 0, color: "var(--muted, #64748b)", fontSize: "0.88rem", lineHeight: 1.45 }}>
                {tx("Helps personalize restaurant reviews and menu recommendations.")}
              </p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
              {[
                {
                  id: "vegan" as LifestyleIdentity,
                  label: tx("Vegan"),
                  desc: tx("100% plant-based and animal-free"),
                  icon: <VeganBadgeIcon size={22} />,
                },
                {
                  id: "vegetarian" as LifestyleIdentity,
                  label: tx("Vegetarian"),
                  desc: tx("Plant-based, exploring full vegan options"),
                  icon: <VegetarianBadgeIcon size={22} />,
                },
                {
                  id: "non-veg" as LifestyleIdentity,
                  label: tx("Non Veg"),
                  desc: tx("Exploring vegan dining and reducing impact"),
                  icon: <RestaurantBadgeIcon size={22} />,
                },
              ].map(({ id, label, desc, icon }) => {
                const isSelected = selectedLifestyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedLifestyle(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1rem",
                      borderRadius: "12px",
                      border: isSelected ? "2px solid var(--green, #059669)" : "1px solid var(--line, #e2e8f0)",
                      background: isSelected ? "var(--green-light, rgba(5, 150, 105, 0.08))" : "var(--bg-subtle, #f8fafc)",
                      color: isSelected ? "var(--green-dark, #065f46)" : "var(--text-primary, #0f172a)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {icon}
                      </span>
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: "0.95rem" }}>{label}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={20} style={{ color: "var(--green, #059669)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep(2)}
                disabled={saving}
                style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}
              >
                <ArrowLeft size={16} />
                <span>{tx("Back")}</span>
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleFinish()}
                disabled={saving}
                style={{ flex: 1, justifyContent: "center", padding: "0.75rem", fontSize: "0.95rem" }}
              >
                <Check size={18} />
                <span>{saving ? tx("Saving…") : tx("Complete setup")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer subtle skip */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted, #64748b)",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: "0.25rem",
              textDecoration: "underline",
            }}
          >
            {tx("Skip for now")}
          </button>
        </div>
      </div>
    </div>
  );
}
