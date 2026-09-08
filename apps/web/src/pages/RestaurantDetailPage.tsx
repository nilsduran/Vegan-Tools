/**
 * @file RestaurantDetailPage.tsx
 * @description Dedicated public page for an individual restaurant (/restaurant/:id).
 * Displays full venue details, safe-space native photography, opening hours, directions,
 * visit logs (Letterboxd-style diary), and community leaf reviews.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  MapPin,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import {
  FEATURED_RESTAURANTS,
  evaluateOpeningHours,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import {
  getCuratedRestaurants,
  getRecentRestaurantMenus,
  searchRestaurants,
} from "../api";
import { getCuisineIcon } from "../components/RestaurantMap";
import { LogVisitModal } from "../components/LogVisitModal";
import { RestaurantReviews } from "../components/RestaurantReviews";
import { AuthDialog } from "../components/AuthDialog";
import { useAuth } from "../auth";
import {
  deleteVisitLog,
  getLogsForRestaurant,
  useDiaryLogs,
  type RestaurantVisitLog,
} from "../utils/diary";
import { tx, useLanguage } from "../i18n";

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const language = useLanguage();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RestaurantVisitLog | null>(null);
  const [menuDishes, setMenuDishes] = useState<string[]>([]);

  // Reactive diary logs scoped to user
  useDiaryLogs(user?.id);
  const visitLogs = id && user ? getLogsForRestaurant(id, user.id) : [];

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // 1. Check curated in-memory dataset first (instant)
    const found = FEATURED_RESTAURANTS.find((r) => r.id === id);
    if (found) {
      setRestaurant(found);
      setLoading(false);
    } else {
      // 2. Query search by id or curated endpoint
      getCuratedRestaurants()
        .then((curated) => {
          const match = curated.find((c) => c.id === id);
          if (match) {
            setRestaurant(match);
          } else {
            return searchRestaurants(id);
          }
        })
        .then((searchResults) => {
          if (searchResults && searchResults.length > 0) {
            setRestaurant(searchResults[0]!);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    // Attempt to load cached menu dishes for quick selection
    Promise.resolve(getRecentRestaurantMenus?.())
      .then((recent) => {
        if (Array.isArray(recent)) {
          const match = recent.find(
            (r) =>
              r.restaurant.id === id ||
              (found && r.restaurant.name.toLowerCase() === found.name.toLowerCase()),
          );
          if (match?.menu?.sections) {
            const dishes = match.menu.sections.flatMap((s) => s.items.map((item) => item.name));
            if (dishes.length > 0) {
              setMenuDishes(dishes);
            }
          }
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="page restaurant-detail-page">
        <div className="page-loading-skeleton">
          <div className="page-loading-spinner" />
          <span>{tx("Loading restaurant details…")}</span>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="page restaurant-detail-page">
        <div className="restaurant-not-found">
          <h2>{tx("Restaurant not found")}</h2>
          <p>{tx("The requested dining spot could not be located.")}</p>
          <Link to="/map" className="primary-button">
            <Compass size={16} aria-hidden="true" />
            <span>{tx("Explore Map")}</span>
          </Link>
        </div>
      </div>
    );
  }

  const openStatus = restaurant.openingHours
    ? evaluateOpeningHours(restaurant.openingHours)
    : undefined;

  // Directions URL: standard geo: on mobile, Google Maps on desktop
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;

  const handleOpenLogModal = (log?: RestaurantVisitLog | null) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedLog(log || null);
    setShowLogModal(true);
  };

  return (
    <div className="page restaurant-detail-page">
      {/* Top back navigation */}
      <nav className="detail-top-nav">
        <Link to="/" className="detail-back-link">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{tx("Back")}</span>
        </Link>
        <Link to={`/map?q=${encodeURIComponent(restaurant.name)}`} className="detail-map-link">
          <MapPin size={16} aria-hidden="true" />
          <span>{tx("View on map")}</span>
        </Link>
      </nav>

      {/* Hero Cover Image & Header */}
      <header className="restaurant-hero-card">
        <div className="restaurant-hero-cover">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="restaurant-hero-img"
            />
          ) : (
            <div className="restaurant-hero-placeholder">
              <span>{getCuisineIcon(restaurant)}</span>
            </div>
          )}
          <span className="restaurant-hero-cuisine-badge" aria-hidden="true">
            {getCuisineIcon(restaurant)}
          </span>
        </div>

        <div className="restaurant-hero-info">
          <div className="restaurant-title-row">
            <h1 className="restaurant-name">{restaurant.name}</h1>
            {restaurant.rating && (
              <span className="restaurant-rating-pill">
                <Star size={16} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                <span>{restaurant.rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          <p className="restaurant-address">
            <MapPin size={15} aria-hidden="true" />
            <span>{restaurant.address}</span>
          </p>

          <div className="restaurant-badges-row">
            {restaurant.isVegan && (
              <span className="detail-badge-vegan">{tx("100% Vegan")}</span>
            )}
            {openStatus !== undefined && (
              <span
                className={`detail-badge-status ${
                  openStatus ? "open" : "closed"
                }`}
              >
                <Clock size={13} aria-hidden="true" />
                <span>
                  {openStatus ? tx("Open now") : tx("Closed")}
                </span>
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="restaurant-action-buttons">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button detail-action-btn"
            >
              <Compass size={16} aria-hidden="true" />
              <span>{tx("Directions")}</span>
            </a>

            {restaurant.websiteUrl && (
              <a
                href={restaurant.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button detail-action-btn"
              >
                <Globe size={16} aria-hidden="true" />
                <span>{tx("Website")}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}

            <button
              type="button"
              className="secondary-button detail-action-btn log-visit-btn"
              onClick={() => handleOpenLogModal(null)}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{tx("Log a visit")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Opening hours info if available */}
      {restaurant.openingHours && (
        <section className="restaurant-hours-section">
          <h3>
            <Clock size={16} aria-hidden="true" />
            <span>{tx("Opening hours")}</span>
          </h3>
          <p className="restaurant-hours-text">{restaurant.openingHours}</p>
        </section>
      )}

      {/* Diary Visits History Section */}
      <section className="restaurant-visits-section">
        <div className="restaurant-visits-header">
          <div className="restaurant-visits-title-wrap">
            <Calendar size={18} aria-hidden="true" />
            <h2>{tx("My visit diary")}</h2>
          </div>
          <button
            type="button"
            className="secondary-button add-visit-small-btn"
            onClick={() => handleOpenLogModal(null)}
          >
            <Plus size={14} aria-hidden="true" />
            <span>{tx("Log visit")}</span>
          </button>
        </div>

        {!user ? (
          <div className="visits-empty-state">
            <p>{tx("An account is required to log visits and reviews.")}</p>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: "0.5rem" }}
              onClick={() => setShowAuthModal(true)}
            >
              <span>{tx("Sign in / Create account")}</span>
            </button>
          </div>
        ) : visitLogs.length === 0 ? (
          <div className="visits-empty-state">
            <p>
              {tx(
                "You haven't logged any visits to this restaurant yet. Tap 'Log visit' to save what you ate and rate your experience!",
              )}
            </p>
          </div>
        ) : (
          <ul className="restaurant-visits-list">
            {visitLogs.map((log) => {
              const formattedDate = log.visitDate
                ? new Date(log.visitDate).toLocaleDateString(
                    language === "ca" ? "ca-ES" : "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )
                : tx("No date");

              return (
                <li key={log.id} className="restaurant-visit-item">
                  <div className="visit-item-header">
                    <span className="visit-date">{formattedDate}</span>
                    <div className="visit-item-header-right">
                      <span className="visit-stars">
                        ★ {log.rating.toFixed(1)}
                      </span>
                      <button
                        type="button"
                        className="visit-delete-btn"
                        onClick={() => {
                          if (confirm(tx("Are you sure you want to delete this visit?"))) {
                            deleteVisitLog(log.id, user.id);
                          }
                        }}
                        title={tx("Delete entry")}
                        aria-label={tx("Delete entry")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {log.dishesTried && log.dishesTried.length > 0 && (
                    <div className="visit-dishes">
                      <strong>🌱 {tx("Dishes")}:</strong>{" "}
                      <span>{log.dishesTried.join(", ")}</span>
                    </div>
                  )}

                  {log.notes && <p className="visit-notes">{log.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Community Leaf Reviews & Submission Form */}
      <section className="restaurant-community-reviews-section">
        <RestaurantReviews restaurant={restaurant} />
      </section>

      {/* Log Visit Modal */}
      {showLogModal && (
        <LogVisitModal
          restaurant={restaurant}
          initialLog={selectedLog}
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          menuDishes={menuDishes}
        />
      )}

      {/* Auth Dialog */}
      {showAuthModal && (
        <AuthDialog
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
