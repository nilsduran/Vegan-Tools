import { useEffect, useState, type FormEvent } from "react";
import type {
  RestaurantCandidate,
  RestaurantReview,
  RestaurantReviewStats,
} from "@vegan-tools/domain";
import {
  Check,
  Edit2,
  Loader2,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { deleteRestaurantReview, getRestaurantReviews, submitRestaurantReview } from "../api";
import { useAuth } from "../auth";
import { tx, useLanguage } from "../i18n";
import { AuthDialog } from "./AuthDialog";

interface RestaurantReviewsProps {
  restaurant: RestaurantCandidate;
}

export function RestaurantReviews({ restaurant }: RestaurantReviewsProps) {
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

  // Form state
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [leavesScore, setLeavesScore] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [customName, setCustomName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

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
  }, [restaurant.id]);

  // Find user's existing review if any
  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  useEffect(() => {
    if (myReview) {
      setLeavesScore(myReview.leavesScore);
      setComment(myReview.comment);
      setCustomName(myReview.userName);
    } else if (user) {
      setCustomName(user.name || "");
    }
  }, [myReview, user]);

  const handleOpenReviewForm = () => {
    if (!user || !token) {
      setShowAuthModal(true);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setShowAuthModal(true);
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await submitRestaurantReview(
        restaurant.id,
        {
          leavesScore,
          comment: comment.trim(),
          userName: customName.trim() || user.name,
        },
        token
      );
      setStats(res.stats);
      setFormSuccess(true);
      setIsFormOpen(false);
      void fetchReviews();
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tx("Failed to save review"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!user || !token || !confirm(tx("Are you sure you want to delete your review?"))) return;
    try {
      setSubmitting(true);
      const res = await deleteRestaurantReview(restaurant.id, token);
      setStats(res.stats);
      void fetchReviews();
      setIsFormOpen(false);
      setComment("");
    } catch (err) {
      alert(err instanceof Error ? err.message : tx("Failed to delete review"));
    } finally {
      setSubmitting(false);
    }
  };

  const displayedScore = hoverScore || leavesScore;

  return (
    <section className="restaurant-reviews-section" aria-label={tx("Community reviews")}>
      <header className="reviews-section-header">
        <div className="reviews-summary-badge">
          <div className="reviews-score-large">
            <span className="leaf-icon">🍃</span>
            <strong>{stats.totalReviews > 0 ? stats.averageLeaves.toFixed(1) : "-"}</strong>
            <span className="max-score">/5</span>
          </div>
          <div className="reviews-count-label">
            {stats.totalReviews === 0
              ? tx("No ratings yet")
              : stats.totalReviews === 1
              ? tx("1 community review")
              : `${stats.totalReviews} ${tx("community reviews")}`}
          </div>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            className="add-review-trigger-btn"
            onClick={handleOpenReviewForm}
          >
            {myReview ? (
              <>
                <Edit2 aria-hidden="true" />
                <span>{tx("Edit my review")}</span>
              </>
            ) : (
              <>
                <MessageSquarePlus aria-hidden="true" />
                <span>{tx("Rate with leaves")}</span>
              </>
            )}
          </button>
        )}
      </header>

      {/* Success notification */}
      {formSuccess && (
        <div className="reviews-success-banner" role="status">
          <Check aria-hidden="true" />
          <span>{tx("Thank you! Your review has been published.")}</span>
        </div>
      )}

      {/* Review Submission Form */}
      {isFormOpen && (
        <form onSubmit={(e) => void handleSubmitReview(e)} className="review-composer-card">
          <div className="composer-header">
            <h4>
              {myReview ? tx("Edit your review") : tx("Rate the vegan experience")}
            </h4>
            <span className="composer-user-hint">
              {tx("As")} <strong>{user?.name}</strong>
            </span>
          </div>

          {formError && <div className="composer-error">{formError}</div>}

          {/* Interactive Decimal Leaf Selector */}
          <div className="leaves-interactive-selector" role="radiogroup" aria-label={tx("Leaf rating")}>
            <div className="leaves-row" style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center", margin: "0.5rem 0" }}>
              {[1, 2, 3, 4, 5].map((leafNum) => {
                const fillRatio = Math.max(0, Math.min(1, displayedScore - (leafNum - 1)));
                return (
                  <button
                    key={leafNum}
                    type="button"
                    className="leaf-btn"
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.75rem",
                      cursor: "pointer",
                      padding: "0.15rem",
                      position: "relative",
                      display: "inline-flex",
                      filter: fillRatio === 0 ? "grayscale(100%) opacity(35%)" : "none",
                      transition: "transform 0.15s ease, filter 0.15s ease",
                    }}
                    onClick={() => {
                      // Click cycles between whole number and .5 increment
                      if (leavesScore === leafNum) {
                        setLeavesScore(Math.max(1, leafNum - 0.5));
                      } else {
                        setLeavesScore(leafNum);
                      }
                    }}
                    aria-label={`${leafNum} ${leafNum === 1 ? tx("Leaf") : tx("Leaves")}`}
                  >
                    🍃
                  </button>
                );
              })}
            </div>

            {/* Decimal Precision Slider (1.0 to 5.0 in 0.1 increments) */}
            <div className="decimal-slider-wrap" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 0.5rem", maxWidth: "320px", margin: "0 auto" }}>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={leavesScore}
                onChange={(e) => setLeavesScore(parseFloat(e.target.value))}
                aria-label={tx("Leaf rating")}
                style={{ flex: 1, accentColor: "#059669", cursor: "pointer" }}
              />
              <span className="decimal-score-tag" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#047857", minWidth: "4.5rem", textAlign: "right" }}>
                {leavesScore.toFixed(1)} / 5
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="preset-buttons-row" style={{ display: "flex", gap: "0.35rem", justifyContent: "center", marginTop: "0.6rem" }}>
              {[1.0, 2.0, 3.0, 4.0, 4.5, 4.8, 5.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLeavesScore(preset)}
                  style={{
                    fontSize: "0.76rem",
                    padding: "0.2rem 0.45rem",
                    borderRadius: "0.375rem",
                    border: leavesScore === preset ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    background: leavesScore === preset ? "#ecfdf5" : "#ffffff",
                    color: leavesScore === preset ? "#047857" : "#475569",
                    fontWeight: leavesScore === preset ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {preset.toFixed(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="composer-field">
            <label htmlFor="review-comment">{tx("Comment or tips about the menu (optional)")}</label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tx("Comment or tips about the menu (optional)")}
              maxLength={500}
              rows={3}
            />
            <div className="char-counter">{comment.length}/500</div>
          </div>

          <div className="composer-actions">
            <button
              type="button"
              className="cancel-btn"
              disabled={submitting}
              onClick={() => setIsFormOpen(false)}
            >
              {tx("Cancel")}
            </button>

            {myReview && (
              <button
                type="button"
                className="delete-review-btn"
                disabled={submitting}
                onClick={() => void handleDeleteReview()}
                title={tx("Delete review")}
              >
                <Trash2 aria-hidden="true" />
                <span>{tx("Delete")}</span>
              </button>
            )}

            <button type="submit" className="submit-review-btn" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <span>{myReview ? tx("Update") : tx("Publish")}</span>
              )}
            </button>
          </div>
        </form>
      )}

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
                { month: "short", day: "numeric", year: "numeric" }
              );

              return (
                <li key={rev.id} className={`review-card ${isMine ? "is-mine" : ""}`}>
                  <header className="review-card-header">
                    <div className="review-user-info">
                      <div className="user-avatar-circle">
                        {rev.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-meta">
                        <strong className="user-name">
                          {rev.userName}
                          {isMine && <span className="mine-pill">{tx("You")}</span>}
                        </strong>
                        <span className="review-date">{dateFormatted}</span>
                      </div>
                    </div>

                    <div className="review-leaves-badge">
                      <span aria-hidden="true">🍃</span>
                      <span className="score-num">{rev.leavesScore.toFixed(1)}/5</span>
                    </div>
                  </header>

                  {rev.comment && <p className="review-comment-text">{rev.comment}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
