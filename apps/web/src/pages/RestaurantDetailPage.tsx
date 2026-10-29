/**
 * @file RestaurantDetailPage.tsx
 * @description Dedicated public page for an individual restaurant (/restaurant/:id).
 * Displays full venue details, safe-space native photography, opening hours, directions,
 * visit logs (Letterboxd-style diary), and community leaf reviews.
 */

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import {
  FEATURED_RESTAURANTS,
  evaluateOpeningHours,
  findCuratedMenu,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import { isRestaurantClosed } from "../utils/restaurantEdits";
import { EditRestaurantModal } from "../components/EditRestaurantModal";
import {
  getCuratedRestaurants,
  getRecentRestaurantMenus,
  getRestaurantById,
  getRestaurantMenu,
  searchRestaurants,
} from "../api";
import { getCuisineIcon } from "../components/RestaurantMap";
import { getCuisineTags } from "../components/RestaurantDetailPane";
import {
  VeganBadgeIcon,
  VegetarianBadgeIcon,
  VeganOptionsBadgeIcon,
} from "../components/DietIcons";
import { getDirectionsUrl } from "../utils/navigation";
import { getCachedRestaurant, saveCachedRestaurant } from "../utils/restaurantCache";
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
import { useDocumentHead } from "../utils/seo";

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const language = useLanguage();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<"log" | "edit" | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RestaurantVisitLog | null>(null);
  const [menuDishes, setMenuDishes] = useState<string[]>([]);
  const [copiedShare, setCopiedShare] = useState(false);

  const cameFromHome = Boolean((location.state as { from?: string } | null)?.from === "home");

  useDocumentHead({
    title: restaurant ? restaurant.name : undefined,
    description: restaurant
      ? `${restaurant.name} — ${restaurant.isVegan ? (language === "ca" ? "Restaurant 100% vegà" : "100% vegan restaurant") : restaurant.isVegetarian ? (language === "ca" ? "Restaurant vegetarià" : "Vegetarian restaurant") : "Veg-friendly"}${restaurant.cuisine ? ` (${restaurant.cuisine})` : ""}${restaurant.address ? `. ${restaurant.address}` : ""}`
      : undefined,
    image: restaurant?.imageUrl,
    path: id ? `/restaurant/${id}` : undefined,
    type: "article",
  });

  // Reactive diary logs scoped to user
  useDiaryLogs(user?.id);
  const visitLogs = id && user ? getLogsForRestaurant(id, user.id) : [];
  const datedVisitLogs = visitLogs.filter((log) => Boolean(log.visitDate));

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // 1. Check curated in-memory dataset first (instant)
    const found = FEATURED_RESTAURANTS.find((r) => r.id === id);
    if (found) {
      setRestaurant(found);
      saveCachedRestaurant(found);
      setLoading(false);
    } else {
      // 2. Check local client cache (instant)
      const cached = getCachedRestaurant(id);
      if (cached) {
        setRestaurant(cached);
        setLoading(false);
      }

      // 3. Query API by ID endpoint, curated list, or text search
      getRestaurantById(id)
        .then((candidate) => {
          if (candidate) {
            setRestaurant(candidate);
            saveCachedRestaurant(candidate);
            return null;
          }
          return getCuratedRestaurants();
        })
        .then((curated) => {
          if (!curated) return null;
          const match = curated.find((c) => c.id === id);
          if (match) {
            setRestaurant(match);
            saveCachedRestaurant(match);
            return null;
          }
          return searchRestaurants(id);
        })
        .then((searchResults) => {
          if (searchResults && searchResults.length > 0) {
            const best = searchResults[0]!;
            setRestaurant(best);
            saveCachedRestaurant(best);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    // Load dishes for diary log dish picker
    const curatedMenu = findCuratedMenu(id, found?.name);
    if (curatedMenu && curatedMenu.sections && curatedMenu.sections.length > 0) {
      const dishes = curatedMenu.sections.flatMap((s) => s.items.map((item) => item.name));
      if (dishes.length > 0) {
        setMenuDishes(dishes);
      }
    } else {
      getRestaurantMenu(id)
        .then((menu) => {
          if (menu && menu.sections && menu.sections.length > 0) {
            const dishes = menu.sections.flatMap((s) => s.items.map((item) => item.name));
            if (dishes.length > 0) {
              setMenuDishes(dishes);
            }
          }
        })
        .catch(() => {});
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
  const directionsUrl = getDirectionsUrl(restaurant);
  const cuisineTags = getCuisineTags(restaurant);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `${restaurant.name} | Vegan Tools`,
      text: `${restaurant.name}${restaurant.address ? ` - ${restaurant.address}` : ""}`,
      url: shareUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  const handleOpenLogModal = (log?: RestaurantVisitLog | null) => {
    if (!user) {
      setPendingAuthAction("log");
      setShowAuthModal(true);
      return;
    }
    setSelectedLog(log || null);
    setShowLogModal(true);
  };

  const handleOpenEditModal = () => {
    if (!user) {
      setPendingAuthAction("edit");
      setShowAuthModal(true);
      return;
    }
    setIsEditModalOpen(true);
  };

  const handleBack = () => {
    if (location.key !== "default" || (typeof window !== "undefined" && window.history.length > 1)) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="page restaurant-detail-page">
      {/* Top back navigation */}
      <nav className="detail-top-nav">
        <button
          type="button"
          onClick={handleBack}
          className="detail-back-link"
          style={{ cursor: "pointer", fontFamily: "inherit" }}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{tx("Back")}</span>
        </button>
        {cameFromHome && (
          <Link to={`/map?place=${encodeURIComponent(restaurant.id)}`} className="detail-map-link">
            <MapPin size={16} aria-hidden="true" />
            <span>{tx("View on map")}</span>
          </Link>
        )}
      </nav>

      {/* Permanently closed warning banner if reported */}
      {isRestaurantClosed(restaurant) && (
        <aside
          role="status"
          style={{
            margin: "0 0 1.25rem 0",
            padding: "0.85rem 1.15rem",
            borderRadius: "10px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            fontSize: "0.95rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span>⚠️ {tx("This establishment is permanently closed.")}</span>
        </aside>
      )}

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
              <span className="detail-badge-vegan">
                <VeganBadgeIcon size={14} />
                <span>{tx("Vegan")}</span>
              </span>
            )}
            {restaurant.isVegetarian && !restaurant.isVegan && (
              <span className="detail-badge-vegetarian">
                <VegetarianBadgeIcon size={14} />
                <span>{tx("Vegetarian")}</span>
              </span>
            )}
            {!restaurant.isVegan &&
              !restaurant.isVegetarian &&
              (restaurant.tags?.includes("vegan_options") ||
                restaurant.tags?.includes("diet.vegan")) && (
                <span className="detail-badge-vegan-options">
                  <VeganOptionsBadgeIcon size={14} />
                  <span>{tx("Veg-friendly")}</span>
                </span>
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
            {cuisineTags.slice(0, 3).map((tag) => (
              <span key={tag.label} className="detail-badge-cuisine">
                <span aria-hidden="true">{tag.icon}</span>
                <span>{tx(tag.label)}</span>
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="restaurant-action-buttons">
            <Link
              to={`/restaurant/${restaurant.id}/menu`}
              className="primary-button detail-action-btn"
            >
              <BookOpen size={16} aria-hidden="true" />
              <span>{tx("Carta")}</span>
            </Link>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-button detail-action-btn"
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
                <span>
                  {/instagram\.com/i.test(restaurant.websiteUrl)
                    ? tx("Instagram")
                    : /facebook\.com/i.test(restaurant.websiteUrl)
                      ? tx("Facebook")
                      : tx("Website")}
                </span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}

            <button
              type="button"
              className="secondary-button detail-action-btn edit-venue-btn"
              onClick={handleOpenEditModal}
              title={tx("Suggest edit or report closed")}
            >
              <Pencil size={16} aria-hidden="true" />
              <span>{tx("Edit details")}</span>
            </button>

            <button
              type="button"
              className="secondary-button detail-action-btn"
              onClick={() => void handleShare()}
              title={tx("Share")}
            >
              {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
              <span>{copiedShare ? tx("Copied!") : tx("Share")}</span>
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

      {/* Community Leaf Reviews & Submission Form */}
      <section className="restaurant-community-reviews-section">
        <RestaurantReviews
          restaurant={restaurant}
          onOpenLogModal={() => handleOpenLogModal(null)}
          reviewUpdateTrigger={visitLogs.length}
        />
      </section>

      {/* Diary Visits History Section — only shown when logged in with dated visits */}
      {user && datedVisitLogs.length > 0 && (
        <section className="restaurant-visits-section">
          <div className="restaurant-visits-header">
            <div className="restaurant-visits-title-wrap">
              <Calendar size={18} aria-hidden="true" />
              <h2>{tx("Visit diary")}</h2>
            </div>
          </div>

          <ul className="restaurant-visits-list">
            {datedVisitLogs.map((log) => {
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

                  {log.photos && log.photos.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.5rem" }}>
                      {log.photos.map((src, photoIdx) => (
                        <a
                          key={photoIdx}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "block",
                            width: "64px",
                            height: "64px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid var(--line, #cbd5e1)",
                          }}
                        >
                          <img
                            src={src}
                            alt={`Visit photo ${photoIdx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {log.notes && <p className="visit-notes">{log.notes}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Edit Restaurant Modal */}
      {isEditModalOpen && (
        <EditRestaurantModal
          isOpen={isEditModalOpen}
          restaurant={restaurant}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(updated) => setRestaurant(updated)}
        />
      )}

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
          title={pendingAuthAction === "log" ? tx("Sign in / Create account") : undefined}
          onClose={() => {
            setShowAuthModal(false);
            setPendingAuthAction(null);
          }}
          onSuccess={() => {
            setShowAuthModal(false);
            if (pendingAuthAction === "edit") {
              setIsEditModalOpen(true);
            } else if (pendingAuthAction === "log") {
              setShowLogModal(true);
            }
            setPendingAuthAction(null);
          }}
        />
      )}
    </div>
  );
}
