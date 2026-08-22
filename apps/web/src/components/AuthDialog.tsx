import { useState, type FormEvent } from "react";
import { CheckCircle, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "../auth";
import { tx, useLanguage } from "../i18n";

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

function AppleIcon() {
  return (
    <svg className="auth-provider-icon" viewBox="0 0 170 170" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.7-14.43-6.1-9.79-10.9-20.93-14.4-33.43-3.5-12.5-5.25-24.3-5.25-35.4 0-14.52 3.63-26.69 10.9-36.5 7.27-9.82 16.5-14.82 27.69-15.01 4.9 0 10.3 1.25 16.2 3.75 5.9 2.5 9.7 3.8 11.4 3.9 1.3 0 5.4-1.4 12.3-4.2 6.9-2.8 12.5-4 16.8-3.6 12.5.8 22.3 5.4 29.4 13.8-10.9 6.6-16.3 15.7-16.1 27.3.2 9.1 3.6 16.7 10.2 22.8 6.6 6.1 14.5 9.6 23.7 10.5-2.2 6.7-4.9 13.1-8.1 19.3zm-39.7-111.4c0-6.1 2.2-11.9 6.6-17.4 4.4-5.5 10.1-9.2 17.1-11.1.2 1.3.3 2.4.3 3.3 0 6.2-2.3 12.2-6.9 17.9-4.6 5.7-10.4 9.3-17.1 10.9 0-1.2 0-2.4 0-3.6z" />
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
    signInWithApple,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    loginAsDemoUser,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"magic_link" | "password" | "signup">("magic_link");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: "google" | "apple") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = provider === "google" ? await signInWithGoogle() : await signInWithApple();
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
    if (!email.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "magic_link") {
        const res = await signInWithMagicLink(email);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(res.message || tx("Link sent!"));
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1800);
        }
      } else if (mode === "password") {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        const res = await signUpWithPassword(email, password, name);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(res.message || tx("Account created successfully!"));
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1800);
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
          <h2 id="auth-dialog-title">{tx("Sign in to rate")}</h2>
          <p className="auth-dialog-subtitle">
            {tx("Share your vegan experience to help the community.")}
          </p>
        </header>

        {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Fast 1-Click Social Logins */}
        <div className="auth-oauth-buttons">
          <button
            type="button"
            className="auth-oauth-btn google"
            disabled={loading}
            onClick={() => void handleOAuth("google")}
          >
            <GoogleIcon />
            <span>{tx("Continue with Google")}</span>
          </button>

          <button
            type="button"
            className="auth-oauth-btn apple"
            disabled={loading}
            onClick={() => void handleOAuth("apple")}
          >
            <AppleIcon />
            <span>{tx("Continue with Apple")}</span>
          </button>
        </div>

        <div className="auth-divider">
          <span>{tx("or with email")}</span>
        </div>

        {/* 2. Mode tabs: Magic link vs Password */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={mode === "magic_link" ? "active" : ""}
            onClick={() => {
              setMode("magic_link");
              setErrorMsg(null);
            }}
          >
            {tx("Magic link")}
          </button>
          <button
            type="button"
            className={mode === "password" ? "active" : ""}
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
            }}
          >
            {tx("Password")}
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
          >
            {tx("Create account")}
          </button>
        </div>

        {/* 3. Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name">{tx("Your name or alias")}</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carla BCN"
                maxLength={50}
              />
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
              placeholder="tu@exemple.cat"
            />
          </div>

          {mode !== "magic_link" && (
            <div className="auth-field">
              <label htmlFor="auth-password">{tx("Password")}</label>
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
            ) : mode === "magic_link" ? (
              <>
                <Mail aria-hidden="true" />
                <span>{tx("Send login link")}</span>
              </>
            ) : mode === "signup" ? (
              <span>{tx("Sign up")}</span>
            ) : (
              <span>{tx("Sign in")}</span>
            )}
          </button>
        </form>

        <footer className="auth-dialog-footer">
          <p className="auth-privacy-note">
            🔒 {tx("Zero tracking cookies or ad trackers. Delegated security and strict privacy compliance.")}
          </p>
        </footer>
      </div>
    </div>
  );
}
