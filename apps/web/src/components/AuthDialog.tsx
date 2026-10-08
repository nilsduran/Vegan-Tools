import { useState, type FormEvent } from "react";
import { CheckCircle, KeyRound, Loader2, Mail, UserPlus, X } from "lucide-react";
import { useAuth } from "../auth";
import { tx, useLanguage } from "../i18n";
import { useLifestyle, type LifestyleIdentity } from "../lifestyle";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  RestaurantBadgeIcon,
} from "./DietIcons";

function GoogleIcon() {
  return (
    <svg className="auth-provider-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function AuthDialog({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const language = useLanguage();
  const {
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    loginWithUsername,
  } = useAuth();
  const { lifestyle, setLifestyle } = useLifestyle();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [signupLifestyle, setSignupLifestyle] = useState<LifestyleIdentity>(lifestyle || "vegan");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess?.();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        if (!email.trim() || !password) {
          setErrorMsg(tx("Invalid email or password."));
          return;
        }
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onSuccess?.();
          onClose();
        }
      } else if (mode === "signup") {
        if (!email.trim() || !username.trim() || !password) {
          setErrorMsg(tx("Please fill in all fields."));
          return;
        }
        const res = await signUpWithPassword(email, password, username);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setLifestyle(signupLifestyle);
          setSuccessMsg(res.message || tx("Account created successfully!"));
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1500);
        }
      } else if (mode === "reset") {
        if (!email.trim()) {
          setErrorMsg(tx("Invalid email format."));
          return;
        }
        const res = requestPasswordReset
          ? await requestPasswordReset(email)
          : {
              message: tx(
                "If the account exists, we have sent instructions to reset your password."
              ),
            };
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(
            res.message ||
              tx("If the account exists, we have sent instructions to reset your password.")
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="auth-dialog-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <button
          type="button"
          className="auth-dialog-close-btn"
          onClick={onClose}
          aria-label={tx("Close")}
        >
          <X aria-hidden="true" />
        </button>

        <header className="auth-dialog-header">
          <div className="auth-dialog-leaf-badge">🍃</div>
          <h2 id="auth-dialog-title">
            {mode === "reset"
              ? tx("Reset password")
              : mode === "signup"
              ? tx("Create account")
              : tx("Sign in to rate")}
          </h2>
          <p className="auth-dialog-subtitle">
            {mode === "reset"
              ? tx("If the account exists, we have sent instructions to reset your password.")
              : tx("Share your vegan experience to help the community.")}
          </p>
        </header>

        {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Fast Social Logins (Google & Apple) */}
        {mode !== "reset" && (
          <>
            <div className="auth-oauth-buttons">
              <button
                type="button"
                className="auth-oauth-btn google"
                disabled={loading}
                onClick={() => void handleOAuth()}
              >
                <GoogleIcon />
                <span>{tx("Continue with Google")}</span>
              </button>
            </div>

            <div className="auth-divider">
              <span>{tx("or with email")}</span>
            </div>
          </>
        )}

        {/* Localhost developer bypass */}
        {typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1" ||
            window.location.hostname === "[::1]") && (
            <div className="auth-localhost-box" style={{ marginBottom: "1.2rem" }}>
              <div className="auth-localhost-header">
                <span className="auth-localhost-badge">Local Dev</span>
                <span>{tx("Quick local access")}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="auth-localhost-btn"
                  onClick={() => {
                    loginWithUsername("tester_local");
                    onSuccess?.();
                    onClose();
                  }}
                >
                  ⚡ {tx("Log in as")} <strong>tester_local</strong>
                </button>
                <button
                  type="button"
                  className="auth-localhost-btn secondary"
                  onClick={() => {
                    loginWithUsername("comunitat_veg");
                    onSuccess?.();
                    onClose();
                  }}
                >
                  {tx("Log in as")} <strong>comunitat</strong>
                </button>
              </div>
            </div>
          )}

        {/* 2. Mode tabs: Login vs Signup vs Reset */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            {tx("Sign in")}
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            {tx("Create account")}
          </button>
          <button
            type="button"
            className={mode === "reset" ? "active" : ""}
            onClick={() => {
              setMode("reset");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            {tx("Reset password")}
          </button>
        </div>

        {/* 3. Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="auth-form">
          {/* Public username field for signup */}
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-username">{tx("Choose a public username")}</label>
              <input
                id="auth-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder={tx("username (e.g. carla_vegan)")}
                minLength={3}
                maxLength={25}
              />
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                {tx("This name will identify your visits, Top 4 favorites, and community reviews.")}
              </p>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">{tx("Email address")}</label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tx("you@example.com")}
            />
          </div>

          {mode !== "reset" && (
            <div className="auth-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="auth-password">{tx("Password")}</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#059669",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {tx("Forgot password?")}
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : mode === "login" ? (
              <span>{tx("Sign in")}</span>
            ) : mode === "signup" ? (
              <>
                <UserPlus size={18} aria-hidden="true" />
                <span>{tx("Create account")}</span>
              </>
            ) : (
              <>
                <Mail size={18} aria-hidden="true" />
                <span>{tx("Send reset instructions")}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
          {mode === "login" && (
            <p style={{ margin: 0, color: "#64748b" }}>
              {tx("Don't have an account? Sign up")}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#059669",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {tx("Create account")}
              </button>
            </p>
          )}

          {mode === "signup" && (
            <p style={{ margin: 0, color: "#64748b" }}>
              {tx("Already have an account? Sign in")}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#059669",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {tx("Sign in")}
              </button>
            </p>
          )}

          {mode === "reset" && (
            <p style={{ margin: 0, color: "#64748b" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#059669",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ← {tx("Back to sign in")}
              </button>
            </p>
          )}
        </div>

        <footer className="auth-dialog-footer">
          <p className="auth-privacy-note">
            🔒 {tx("Zero tracking cookies or ad trackers. Delegated security and strict privacy compliance.")}
          </p>
        </footer>
      </div>
    </div>
  );
}
