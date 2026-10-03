import { useEffect, useState } from "react";
import type {
  RestaurantCandidate,
  RestaurantReview,
  RestaurantReviewStats,
} from "@vegan-tools/domain";
import {
  Check,
  Edit2,
  Loader2,
  Trash2,
} from "lucide-react";
import { deleteRestaurantReview, getRestaurantReviews } from "../api";
import { useAuth } from "../auth";
import { tx, useLanguage } from "../i18n";
import { AuthDialog } from "./AuthDialog";
import { LeafRating } from "./LeafRating";
import { LogVisitModal } from "./LogVisitModal";
import { CATEGORY_FILTERS } from "./FilterPills";

interface RestaurantReviewsProps {
  restaurant: RestaurantCandidate;
  onOpenLogModal?: () => void;
  reviewUpdateTrigger?: number;
}

export function RestaurantReviews({ restaurant, onOpenLogModal, reviewUpdateTrigger }: RestaurantReviewsProps) {
  const language = useLanguage();
  const { user, token } = useAuth();

  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [stats, setStats] = useState<RestaurantReviewStats>({
    averageLeaves: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await getRestaurantReviews(restaurant.id);
      setReviews(res.reviews);
      setStats(res.stats);
    } catch {
      // Offline / error fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReviews();
  }, [restaurant.id, reviewUpdateTrigger]);

  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const handleOpenReviewForm = () => {
    if (!user || !token) {
      setShowAuthModal(true);
    } else if (onOpenLogModal) {
      onOpenLogModal();
    } else {
      setIsFormOpen(true);
    }
  };

  const handleDeleteReview = async () => {
    if (!token || !myReview) return;
    if (!confirm(tx("Are you sure you want to delete your review?"))) return;
    try {
      await deleteRestaurantReview(restaurant.id, token);
      void fetchReviews();
    } catch {
      alert(tx("Failed to delete review"));
    }
  };

  return (
    <section className="restaurant-reviews-widget">
      <header className="restaurant-reviews-header">
        <div className="reviews-summary-left">
          <div className="reviews-leaves-large">
            <span className="leaves-score-number" style={{ fontSize: "1.75rem", fontWeight: 800 }}>
              {stats.averageLeaves > 0 ? stats.averageLeaves.toFixed(1) : "—"}
            </span>
            <span className="leaves-score-max" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              / 5.0
            </span>
          </div>
          <div className="reviews-meta-info" style={{ display: "flex", flexDirection: "column" }}>
            {stats.averageLeaves > 0 ? (
              <span className="reviews-display-leaves">
                <LeafRating value={stats.averageLeaves} size={18} />
              </span>
            ) : null}
            <span className="reviews-count-label" style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {stats.totalReviews === 0
                ? tx("No ratings yet")
                : stats.totalReviews === 1
                ? tx("1 community review")
                : `${stats.totalReviews} ${tx("community reviews")}`}
            </span>
          </div>
        </div>
      </header>

      {/* Centered Rating Trigger Card */}
      <div
        className="reviews-rate-center-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem 1rem",
          background: "var(--bg-card, #ffffff)",
          borderRadius: "1rem",
          border: "1px solid var(--line, #e2e8f0)",
          margin: "1rem 0",
          gap: "0.85rem",
          textAlign: "center",
        }}
      >
        <div className="reviews-center-leaves" style={{ display: "flex", justifyContent: "center" }}>
          <LeafRating
            value={myReview ? myReview.leavesScore : 0}
            interactive
            onChange={() => handleOpenReviewForm()}
            size={26}
            ariaLabel={tx("Leaf rating")}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            className="add-review-trigger-btn secondary-button"
            onClick={handleOpenReviewForm}
            aria-label={myReview ? tx("Edit my review") : tx("Rate with leaves")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.5rem 1.1rem", fontSize: "0.88rem", fontWeight: 700 }}
          >
            <Edit2 size={15} aria-hidden="true" />
            <span>{myReview ? tx("Edit review & visit log") : tx("Write review or log visit")}</span>
          </button>

          {myReview && (
            <button
              type="button"
              className="icon-button"
              onClick={() => void handleDeleteReview()}
              title={tx("Delete review")}
              style={{ color: "#ef4444" }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Community Reviews List */}
      <div className="reviews-list-container">
        {loading ? (
          <div className="reviews-loading">
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span>{tx("Loading reviews…")}</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="reviews-empty-state">
            <div className="empty-leaf-icon">🌱</div>
            <p>{tx("This place has no community reviews yet.")}</p>
            <button
              type="button"
              className="empty-cta-btn"
              onClick={handleOpenReviewForm}
            >
              {tx("Be the first person to rate it!")}
            </button>
          </div>
        ) : (
          <ul className="community-reviews-items">
            {reviews.map((rev) => {
              const isMine = user && rev.userId === user.id;
              const dateFormatted = new Date(rev.createdAt).toLocaleDateString(
                language === "ca" ? "ca-ES" : "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              );

              return (
                <li key={rev.id} className={`review-card ${isMine ? "is-mine" : ""}`}>
                  <header className="review-card-header">
                    <div className="review-user-info">
                      <div className="user-avatar-circle">
                        {rev.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-meta">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                          <strong className="user-name">
                            {rev.userName}
                          </strong>
                          {isMine && <span className="mine-pill">{tx("You")}</span>}
                          {rev.userLifestyle && (
                            <span className={`review-lifestyle-badge lifestyle-${rev.userLifestyle}`}>
                              {rev.userLifestyle === "vegan"
                                ? tx("Vegan")
                                : rev.userLifestyle === "vegetarian"
                                ? tx("Vegetarian")
                                : tx("Non-veg")}
                            </span>
                          )}
                        </div>
                        <span className="review-date">{dateFormatted}</span>
                      </div>
                    </div>

                    <div className="review-leaves-badge">
                      <LeafRating value={rev.leavesScore} size={15} showScore />
                    </div>
                  </header>

                  {rev.comment && <p className="review-comment-text">{rev.comment}</p>}

                  {rev.photos && rev.photos.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.6rem" }}>
                      {rev.photos.map((src, photoIdx) => (
                        <a
                          key={photoIdx}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "block",
                            width: "72px",
                            height: "72px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid var(--line, #cbd5e1)",
                          }}
                        >
                          <img
                            src={src}
                            alt={`${rev.userName} review photo ${photoIdx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {rev.tags && rev.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                      {rev.tags.map((tagId) => {
                        const def = CATEGORY_FILTERS.find((f) => f.id === tagId);
                        return (
                          <span
                            key={tagId}
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "999px",
                              background: "var(--bg-subtle, #f1f5f9)",
                              color: "var(--text-muted, #64748b)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            {def?.icon && <span aria-hidden="true">{def.icon}</span>}
                            <span>{def ? tx(def.labelKey) : `#${tagId}`}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Internal LogVisitModal fallback if not managed by parent */}
      {isFormOpen && (
        <LogVisitModal
          restaurant={restaurant}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            void fetchReviews();
          }}
        />
      )}

      {/* Auth Modal when unauthenticated user tries to rate */}
      <AuthDialog
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          setIsFormOpen(true);
        }}
      />
    </section>
  );
}
