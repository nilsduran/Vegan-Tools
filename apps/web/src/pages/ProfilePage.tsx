/**
 * @file ProfilePage.tsx
 * @description User account dashboard, review management, personal diary, and native account settings.
 * Designed for authenticated contributors with full GDPR data portability and account management.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { RestaurantReview } from "@vegan-tools/domain";
import {
  Calendar,
  Compass,
  ExternalLink,
  Leaf,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { deleteRestaurantReview, getUserReviews } from "../api";
import { useAuth } from "../auth";
import { AuthDialog } from "../components/AuthDialog";
import { Top4Restaurants } from "../components/Top4Restaurants";
import { UserListsSection } from "../components/UserListsSection";
import { RatingHistogram } from "../components/RatingHistogram";
import { LeafRating } from "../components/LeafRating";
import { deleteVisitLog, useDiaryLogs } from "../utils/diary";
import { tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";
import { useLifestyle } from "../lifestyle";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  RestaurantBadgeIcon,
} from "../components/DietIcons";

export function ProfilePage() {
  const language = useLanguage();
  useDocumentHead({
    title: tx("Profile"),
    description: tx("User profile, personal vegan restaurant diary and favorite spots."),
    path: "/profile",
    type: "profile",
  });
  const { user, token, signOut } = useAuth();
  const diaryLogs = useDiaryLogs(user?.id);
  const { lifestyle } = useLifestyle();

  const [reviews, setReviews] = useState<RestaurantReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [diarySearch, setDiarySearch] = useState("");
  const [diaryPeriod, setDiaryPeriod] = useState<"all" | "year" | "month">("all");
  const [diaryCuisine, setDiaryCuisine] = useState("all");
  const [diaryMinimumRating, setDiaryMinimumRating] = useState("all");

  const diaryCuisines = useMemo(
    () =>
      [...new Set(diaryLogs.map((log) => log.cuisine?.trim()).filter((cuisine): cuisine is string => Boolean(cuisine)))]
        .sort((a, b) => a.localeCompare(b, language)),
    [diaryLogs, language],
  );

  const filteredDiaryLogs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const query = diarySearch.trim().toLocaleLowerCase(language === "ca" ? "ca-ES" : "en-US");
    const minimumRating = diaryMinimumRating === "all" ? 0 : Number(diaryMinimumRating);

    return diaryLogs.filter((log) => {
      const date = log.visitDate ? new Date(`${log.visitDate}T12:00:00`) : undefined;
      const matchesPeriod =
        diaryPeriod === "all" ||
        (date !== undefined &&
          date.getFullYear() === currentYear &&
          (diaryPeriod === "year" || date.getMonth() === currentMonth));
      const searchable = `${log.restaurantName} ${log.cuisine ?? ""} ${log.notes ?? ""} ${(log.dishesTried ?? []).join(" ")}`.toLocaleLowerCase(
        language === "ca" ? "ca-ES" : "en-US",
      );
      return (
        matchesPeriod &&
        (diaryCuisine === "all" || log.cuisine === diaryCuisine) &&
        log.rating >= minimumRating &&
        (!query || searchable.includes(query))
      );
    });
  }, [diaryCuisine, diaryLogs, diaryMinimumRating, diaryPeriod, diarySearch, language]);

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
      {/* Profile Header (Only shown when authenticated) */}
      {user && (
        <header className="profile-header-card">
          <div className="profile-user-info">
            <div className="profile-avatar">
              {user.username ? user.username.charAt(0).toUpperCase() : <User size={28} />}
            </div>
            <div className="profile-user-details">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1 style={{ margin: 0 }}>{user.username}</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    background: "var(--green-light)",
                    color: "var(--green-dark)",
                    border: "1px solid var(--green-border)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  {lifestyle === "vegan" && (
                    <>
                      <VeganBadgeIcon size={16} />
                      <span>{tx("Vegan")}</span>
                    </>
                  )}
                  {lifestyle === "vegetarian" && (
                    <>
                      <VegetarianBadgeIcon size={16} />
                      <span>{tx("Vegetarian")}</span>
                    </>
                  )}
                  {lifestyle === "non-veg" && (
                    <>
                      <RestaurantBadgeIcon size={16} />
                      <span>{tx("Non Veg")}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              to="/settings"
              className="secondary-button profile-auth-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Settings size={16} aria-hidden="true" />
              <span>{tx("Settings")}</span>
            </Link>
            <button
              type="button"
              className="secondary-button profile-auth-btn"
              onClick={signOut}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{tx("Sign out")}</span>
            </button>
          </div>
        </header>
      )}

      {!user ? (
        /* Guest Welcome & Value Proposition Card */
        <section
          className="profile-reviews-section profile-reviews-card"
          style={{ padding: "2.5rem 1.75rem", textAlign: "center" }}
        >
          <h2 style={{ fontSize: "1.45rem", marginBottom: "0.5rem" }}>
            {tx("Sign in to manage your reviews")}
          </h2>
          <p
            style={{
              maxWidth: "540px",
              margin: "0 auto 2rem",
              color: "var(--color-muted, #64748b)",
              lineHeight: 1.5,
              fontSize: "0.95rem",
            }}
          >
            {tx("Sign in or create an account to start your dining diary, Top 4 favorites, and restaurant reviews.")}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.2rem",
              textAlign: "left",
              maxWidth: "720px",
              margin: "0 auto 2.2rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>⭐️</div>
              <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: "0.2rem" }}>
                {tx("Top 4 Favorites")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.4, display: "block" }}>
                {tx("Showcase your 4 essential spots")}
              </span>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>📖</div>
              <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: "0.2rem" }}>
                {tx("Dining Diary")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.4, display: "block" }}>
                {tx("Track your favorite spots, dishes tried and notes")}
              </span>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>🍃</div>
              <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: "0.2rem" }}>
                {tx("Community Reviews")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.4, display: "block" }}>
                {tx("Share your ratings and leaf reviews to guide vegans")}
              </span>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>🌱</div>
              <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: "0.2rem" }}>
                {tx("Dietary preference")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.4, display: "block" }}>
                {tx("Choose how you identify to personalize your experience.")}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => setShowAuthModal(true)}
            style={{
              padding: "0.85rem 1.75rem",
              fontSize: "1rem",
              borderRadius: "10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <LogIn size={18} aria-hidden="true" />
            <span>{tx("Sign in / Create account")}</span>
          </button>
        </section>
      ) : (
        <>
          {/* Letterboxd-style Top 4 Favorite Restaurants */}
          <Top4Restaurants />

          {/* User Saved & Custom Lists (Liked, Want to go, Custom lists) */}
          <UserListsSection />

          {/* Letterboxd-style Rating Distribution Chart */}
          {filteredDiaryLogs.length > 0 && <RatingHistogram logs={filteredDiaryLogs} />}

          {/* Visit Diary Section */}
          <section className="profile-reviews-section profile-reviews-card">
            <div className="profile-reviews-header">
              <div className="profile-reviews-title-wrap">
                <Calendar size={20} style={{ color: "#059669" }} aria-hidden="true" />
                <h2>{tx("My Visit Diary")}</h2>
              </div>
              <span className="profile-reviews-count-badge">
                {filteredDiaryLogs.length} {filteredDiaryLogs.length === 1 ? tx("entry") : tx("entries")}
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
              <>
                <div className="diary-filters" aria-label={tx("Filter diary")}>
                  <label>
                    <span>{tx("Search")}</span>
                    <input
                      type="search"
                      value={diarySearch}
                      onChange={(event) => setDiarySearch(event.target.value)}
                      placeholder={tx("Restaurant, dish or note")}
                    />
                  </label>
                  <label>
                    <span>{tx("Period")}</span>
                    <select value={diaryPeriod} onChange={(event) => setDiaryPeriod(event.target.value as typeof diaryPeriod)}>
                      <option value="all">{tx("All time")}</option>
                      <option value="year">{tx("This year")}</option>
                      <option value="month">{tx("This month")}</option>
                    </select>
                  </label>
                  <label>
                    <span>{tx("Cuisine")}</span>
                    <select value={diaryCuisine} onChange={(event) => setDiaryCuisine(event.target.value)}>
                      <option value="all">{tx("All cuisines")}</option>
                      {diaryCuisines.map((cuisine) => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{tx("Minimum rating")}</span>
                    <select value={diaryMinimumRating} onChange={(event) => setDiaryMinimumRating(event.target.value)}>
                      <option value="all">{tx("Any rating")}</option>
                      {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}+ {tx("leaves")}</option>)}
                    </select>
                  </label>
                </div>

                {filteredDiaryLogs.length === 0 ? (
                  <div className="profile-empty-state">
                    <h3>{tx("No diary entries match these filters.")}</h3>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setDiarySearch("");
                        setDiaryPeriod("all");
                        setDiaryCuisine("all");
                        setDiaryMinimumRating("all");
                      }}
                    >
                      {tx("Clear filters")}
                    </button>
                  </div>
                ) : (
              <ul className="profile-reviews-list">
                {filteredDiaryLogs.map((log) => {
                  const formattedDate = log.visitDate
                    ? new Date(log.visitDate).toLocaleDateString(
                        language === "ca" ? "ca-ES" : "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )
                    : tx("No date");

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
                          <div className="profile-review-leaf-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <LeafRating value={log.rating} size={15} showScore />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(tx("Are you sure you want to delete this visit?"))) {
                                deleteVisitLog(log.id, user.id);
                              }
                            }}
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
              </>
            )}
          </section>

          {/* User Reviews Section */}
          <section className="profile-reviews-section profile-reviews-card">
            <div className="profile-reviews-header">
              <div className="profile-reviews-title-wrap">
                <MessageSquare size={20} style={{ color: "#059669" }} aria-hidden="true" />
                <h2>{tx("My Restaurant Reviews")}</h2>
              </div>
              <span className="profile-reviews-count-badge">
                {reviews.length} {reviews.length === 1 ? tx("review") : tx("reviews")}
              </span>
            </div>

            {loadingReviews ? (
              <div className="profile-loading-state">
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                <span>{tx("Loading reviews…")}</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="profile-empty-state">
                <div className="profile-empty-state-icon">🌱</div>
                <h3>{tx("You have not reviewed any restaurants yet.")}</h3>
                <p>{tx("Explore the interactive map and rate places with leaves!")}</p>
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
                    <li key={rev.id} className="profile-review-item">
                      <div className="profile-review-top">
                        <div className="profile-review-meta">
                          <Link
                            to={`/map?place=${encodeURIComponent(rev.restaurantId)}`}
                            className="profile-review-restaurant-link"
                          >
                            <span>{tx("Restaurant on map")}</span>
                            <ExternalLink size={14} aria-hidden="true" />
                          </Link>
                          {rev.userLifestyle && (
                            <span className={`review-lifestyle-badge lifestyle-${rev.userLifestyle}`}>
                              {rev.userLifestyle === "vegan"
                                ? tx("Vegan")
                                : rev.userLifestyle === "vegetarian"
                                ? tx("Vegetarian")
                                : tx("Non-veg")}
                            </span>
                          )}
                          <span className="profile-review-date">• {dateFormatted}</span>
                        </div>

                        <div className="profile-review-score-wrap">
                          <div className="profile-review-leaf-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <LeafRating value={rev.leavesScore} size={15} showScore />
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

                      {rev.comment && <p className="profile-review-comment">{rev.comment}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

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
