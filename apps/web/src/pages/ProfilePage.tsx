import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RestaurantReview } from "@vegan-tools/domain";
import {
  ExternalLink,
  Leaf,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { deleteRestaurantReview, getUserReviews } from "../api";
import { useAuth } from "../auth";
import { AuthDialog } from "../components/AuthDialog";
import { t, tx, useLanguage } from "../i18n";

export function ProfilePage() {
  const language = useLanguage();
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();

  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUserReviews = async () => {
    if (!token) {
      setReviews([]);
      return;
    }
    setLoadingReviews(true);
    try {
      const userRevs = await getUserReviews(token);
      setReviews(userRevs);
    } catch {
      // Offline fallback
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void fetchUserReviews();
  }, [token]);

  const handleDeleteReview = async (restaurantId: string, reviewId: string) => {
    if (!token || !confirm(tx("Are you sure you want to delete your review?"))) return;
    setDeletingId(reviewId);
    try {
      await deleteRestaurantReview(restaurantId, token);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert(err instanceof Error ? err.message : tx("Failed to delete review"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page profile-page" style={{ maxWidth: "760px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Profile Header */}
      <header className="profile-header-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#ecfdf5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, border: "2px solid #a7f3d0" }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.25rem 0", color: "#0f172a" }}>
              {user ? user.name : (language === "ca" ? "El meu perfil" : "My Profile")}
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              {user?.email || (language === "ca" ? "Inicia sessió per gestionar les teves ressenyes" : "Sign in to manage your reviews")}
            </p>
          </div>
        </div>

        <div>
          {user ? (
            <button
              type="button"
              className="secondary-button"
              style={{ gap: "0.4rem", fontSize: "0.88rem" }}
              onClick={signOut}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{language === "ca" ? "Tancar sessió" : "Sign out"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              style={{ gap: "0.4rem", fontSize: "0.88rem" }}
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>{language === "ca" ? "Iniciar sessió" : "Sign in"}</span>
            </button>
          )}
        </div>
      </header>

      {/* User Reviews Section */}
      <section className="profile-reviews-section" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageSquare size={20} style={{ color: "#059669" }} aria-hidden="true" />
            <h2 style={{ fontSize: "1.15rem", margin: 0, color: "#0f172a" }}>
              {language === "ca" ? "Les meves valoracions de restaurants" : "My Restaurant Reviews"}
            </h2>
          </div>
          {user && (
            <span style={{ fontSize: "0.82rem", background: "#f1f5f9", padding: "0.2rem 0.6rem", borderRadius: "999px", color: "#475569", fontWeight: 600 }}>
              {reviews.length} {reviews.length === 1 ? (language === "ca" ? "ressenya" : "review") : (language === "ca" ? "ressenyes" : "reviews")}
            </span>
          )}
        </div>

        {!user ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🍃</div>
            <h3 style={{ fontSize: "1.05rem", color: "#334155", margin: "0 0 0.5rem 0" }}>
              {language === "ca" ? "Vols desar i gestionar les teves ressenyes?" : "Want to save and manage your reviews?"}
            </h3>
            <p style={{ fontSize: "0.88rem", maxWidth: "420px", margin: "0 auto 1.25rem auto", lineHeight: "1.4" }}>
              {language === "ca"
                ? "Inicia sessió per valorar la teva experiència vegana a restaurants i ajudar a tota la comunitat."
                : "Sign in to rate your vegan experience at restaurants and help the whole community."}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>{language === "ca" ? "Iniciar sessió / Crear compte" : "Sign in / Create account"}</span>
            </button>
          </div>
        ) : loadingReviews ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "0.6rem", color: "#64748b" }}>
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            <span>{tx("Loading reviews…")}</span>
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🌱</div>
            <h3 style={{ fontSize: "1.05rem", color: "#334155", margin: "0 0 0.5rem 0" }}>
              {language === "ca" ? "Encara no has valorat cap restaurant." : "You have not reviewed any restaurants yet."}
            </h3>
            <p style={{ fontSize: "0.88rem", margin: "0 auto 1.25rem auto" }}>
              {language === "ca"
                ? "Explora el mapa interactiu i valora els locals amb fulles!"
                : "Explore the interactive map and rate places with leaves!"}
            </p>
            <Link to="/map" className="primary-button" style={{ display: "inline-flex", gap: "0.4rem" }}>
              <MapPin size={16} aria-hidden="true" />
              <span>{language === "ca" ? "Explorar mapa" : "Explore Map"}</span>
            </Link>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reviews.map((rev) => {
              const dateFormatted = new Date(rev.createdAt).toLocaleDateString(
                language === "ca" ? "ca-ES" : "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              );

              return (
                <li
                  key={rev.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Link
                        to={`/map?place=${encodeURIComponent(rev.restaurantId)}`}
                        style={{ fontWeight: 600, color: "#047857", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <span>{language === "ca" ? "Restaurant al mapa" : "Restaurant on map"}</span>
                        <ExternalLink size={14} aria-hidden="true" />
                      </Link>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>• {dateFormatted}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#ecfdf5", color: "#047857", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                        <span aria-hidden="true">🍃</span>
                        <span>{rev.leavesScore.toFixed(1)} / 5</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDeleteReview(rev.restaurantId, rev.id)}
                        disabled={deletingId === rev.id}
                        title={tx("Delete review")}
                        aria-label={tx("Delete review")}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center" }}
                      >
                        {deletingId === rev.id ? (
                          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                        ) : (
                          <Trash2 size={16} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {rev.comment && (
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: "1.45" }}>
                      {rev.comment}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AuthDialog
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          void fetchUserReviews();
        }}
      />
    </div>
  );
}
