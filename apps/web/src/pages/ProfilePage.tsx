/**
 * @file ProfilePage.tsx
 * @description User account dashboard, review management, and privacy-first authentication view.
 * Enables community contributors to view their published reviews, inspect contribution history, and manage sessions.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RestaurantReview } from "@vegan-tools/domain";
import {
  Calendar,
  Compass,
  Edit2,
  ExternalLink,
  Leaf,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { deleteRestaurantReview, getUserReviews } from "../api";
import { useAuth } from "../auth";
import { AuthDialog } from "../components/AuthDialog";
import { Top4Restaurants } from "../components/Top4Restaurants";
import { RatingHistogram } from "../components/RatingHistogram";
import { deleteVisitLog, useDiaryLogs } from "../utils/diary";
import { t, tx, useLanguage } from "../i18n";

export function ProfilePage() {
  const language = useLanguage();
  const navigate = useNavigate();
  const { user, token, signOut, updateUsername } = useAuth();
  const diaryLogs = useDiaryLogs();

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
    <div className="page profile-page profile-container">
      {/* Profile Header */}
      <header className="profile-header-card">
        <div className="profile-user-info">
          <div className="profile-avatar">
            {user?.username ? user.username.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div className="profile-user-details">
            {user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h1 style={{ margin: 0 }}>@{user.username}</h1>
                  <button
                    type="button"
                    className="profile-edit-username-btn"
                    onClick={() => {
                      const updated = prompt(tx("Choose a public username"), user.username);
                      if (updated && updated.trim()) {
                        updateUsername(updated.trim());
                      }
                    }}
                    title={tx("Edit username")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#059669",
                      cursor: "pointer",
                      padding: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                  {tx("Public community profile for restaurant reviews")}
                </p>
              </>
            ) : (
              <>
                <h1>{tx("My Profile")}</h1>
                <p>{tx("Choose a username to publish and manage your reviews")}</p>
              </>
            )}
          </div>
        </div>

        <div>
          {user ? (
            <button
              type="button"
              className="secondary-button profile-auth-btn"
              onClick={signOut}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{tx("Sign out")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="primary-button profile-auth-btn"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>{tx("Sign in")}</span>
            </button>
          )}
        </div>
      </header>

      {/* Letterboxd-style Top 4 Favorite Restaurants */}
      <Top4Restaurants />

      {/* Letterboxd-style Rating Distribution Chart */}
      {diaryLogs.length > 0 && (
        <RatingHistogram logs={diaryLogs} />
      )}

      {/* Visit Diary Section */}
      <section className="profile-reviews-section profile-reviews-card">
        <div className="profile-reviews-header">
          <div className="profile-reviews-title-wrap">
            <Calendar size={20} style={{ color: "#059669" }} aria-hidden="true" />
            <h2>{tx("My Visit Diary")}</h2>
          </div>
          <span className="profile-reviews-count-badge">
            {diaryLogs.length} {diaryLogs.length === 1 ? tx("entry") : tx("entries")}
          </span>
        </div>

        {diaryLogs.length === 0 ? (
          <div className="profile-empty-state">
            <div className="profile-empty-state-icon">📖</div>
            <h3>{tx("Your visit diary is empty.")}</h3>
            <p>{tx("Log your restaurant visits, save dishes and track your rating history over time.")}</p>
            <Link to="/map" className="primary-button profile-auth-btn">
              <Compass size={16} aria-hidden="true" />
              <span>{tx("Explore restaurants")}</span>
            </Link>
          </div>
        ) : (
          <ul className="profile-reviews-list">
            {diaryLogs.map((log) => {
              const formattedDate = new Date(log.visitDate).toLocaleDateString(
                language === "ca" ? "ca-ES" : "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              );

              return (
                <li key={log.id} className="profile-review-item">
                  <div className="profile-review-top">
                    <div className="profile-review-meta">
                      <Link
                        to={`/restaurant/${encodeURIComponent(log.restaurantId)}`}
                        className="profile-review-restaurant-link"
                      >
                        <strong>{log.restaurantName}</strong>
                        <ExternalLink size={14} aria-hidden="true" />
                      </Link>
                      <span className="profile-review-date">• {formattedDate}</span>
                    </div>

                    <div className="profile-review-score-wrap">
                      <div className="profile-review-star-badge">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                        <span>{log.rating.toFixed(1)} / 5</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteVisitLog(log.id)}
                        title={tx("Delete visit")}
                        aria-label={tx("Delete visit")}
                        className="profile-review-delete-btn"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {log.dishesTried && log.dishesTried.length > 0 && (
                    <div className="profile-diary-dishes">
                      <span>🌱 {log.dishesTried.join(", ")}</span>
                    </div>
                  )}

                  {log.notes && (
                    <p className="profile-review-comment">{log.notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* User Reviews Section */}
      <section className="profile-reviews-section profile-reviews-card">
        <div className="profile-reviews-header">
          <div className="profile-reviews-title-wrap">
            <MessageSquare size={20} style={{ color: "#059669" }} aria-hidden="true" />
            <h2>
              {tx("My Restaurant Reviews")}
            </h2>
          </div>
          {user && (
            <span className="profile-reviews-count-badge">
              {reviews.length} {reviews.length === 1 ? tx("review") : tx("reviews")}
            </span>
          )}
        </div>

        {!user ? (
          <div className="profile-empty-state">
            <div className="profile-empty-state-icon">🍃</div>
            <h3>
              {tx("Want to save and manage your reviews?")}
            </h3>
            <p>
              {tx("Sign in to rate your vegan experience at restaurants and help the whole community.")}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>{tx("Sign in / Create account")}</span>
            </button>
          </div>
        ) : loadingReviews ? (
          <div className="profile-loading-state">
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            <span>{tx("Loading reviews…")}</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="profile-empty-state">
            <div className="profile-empty-state-icon">🌱</div>
            <h3>
              {tx("You have not reviewed any restaurants yet.")}
            </h3>
            <p>
              {tx("Explore the interactive map and rate places with leaves!")}
            </p>
            <Link to="/map" className="primary-button profile-auth-btn">
              <MapPin size={16} aria-hidden="true" />
              <span>{tx("Explore Map")}</span>
            </Link>
          </div>
        ) : (
          <ul className="profile-reviews-list">
            {reviews.map((rev) => {
              const dateFormatted = new Date(rev.createdAt).toLocaleDateString(
                language === "ca" ? "ca-ES" : "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              );

              return (
                <li
                  key={rev.id}
                  className="profile-review-item"
                >
                  <div className="profile-review-top">
                    <div className="profile-review-meta">
                      <Link
                        to={`/map?place=${encodeURIComponent(rev.restaurantId)}`}
                        className="profile-review-restaurant-link"
                      >
                        <span>{tx("Restaurant on map")}</span>
                        <ExternalLink size={14} aria-hidden="true" />
                      </Link>
                      <span className="profile-review-date">• {dateFormatted}</span>
                    </div>

                    <div className="profile-review-score-wrap">
                      <div className="profile-review-leaf-badge">
                        <span aria-hidden="true">🍃</span>
                        <span>{rev.leavesScore.toFixed(1)} / 5</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDeleteReview(rev.restaurantId, rev.id)}
                        disabled={deletingId === rev.id}
                        title={tx("Delete review")}
                        aria-label={tx("Delete review")}
                        className="profile-review-delete-btn"
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
                    <p className="profile-review-comment">
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
