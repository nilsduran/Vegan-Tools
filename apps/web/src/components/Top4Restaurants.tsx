/**
 * @file Top4Restaurants.tsx
 * @description Letterboxd-style "Top 4 Favorite Restaurants" showcase component.
 * Allows users to pin their 4 absolute favorite dining spots to the top of their profile.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Edit2, LoaderCircle, Plus, Star, X } from "lucide-react";
import { FEATURED_RESTAURANTS, type RestaurantCandidate } from "@vegan-tools/domain";
import { getDiaryLogs, useUserTop4 } from "../utils/diary";
import {
  getCachedRestaurant,
  getCachedRestaurantsMap,
  saveCachedRestaurant,
  saveCachedRestaurants,
} from "../utils/restaurantCache";
import { searchRestaurants } from "../api";
import { useAuth } from "../auth";
import { tx } from "../i18n";
import { getCuisineIcon } from "./RestaurantMap";

export function Top4Restaurants() {
  const { user, token } = useAuth();
  const { top4, updateTop4 } = useUserTop4(user?.id, token || undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteCandidates, setRemoteCandidates] = useState<RestaurantCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Gather all known restaurants (cached + curated + any logged in diary for this user)
  const diaryLogs = getDiaryLogs(user?.id);
  const cachedMap = getCachedRestaurantsMap();
  const allCandidates: RestaurantCandidate[] = [
    ...Object.values(cachedMap),
    ...FEATURED_RESTAURANTS,
  ];

  // Add any diary places not already in allCandidates
  for (const log of diaryLogs) {
    if (!allCandidates.some((c) => c.id === log.restaurantId)) {
      allCandidates.push({
        id: log.restaurantId,
        name: log.restaurantName,
        address: log.restaurantAddress || "",
        latitude: 41.3879,
        longitude: 2.1699,
        mapUrl: "https://www.openstreetmap.org",
        provider: "curated",
        cuisine: log.cuisine,
        imageUrl: log.restaurantImage,
        isVegan: true,
      });
    }
  }

  // Find candidate by id
  const getPlace = (id: string): RestaurantCandidate | undefined => {
    return getCachedRestaurant(id) || allCandidates.find((c) => c.id === id);
  };

  // Debounced dynamic search calling universal restaurant search API
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteCandidates([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchRestaurants(q, { signal: controller.signal })
        .then((results) => {
          setRemoteCandidates(results);
          saveCachedRestaurants(results);
        })
        .catch(() => {
          // Keep whatever local results we have on network failure
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleRemove = (idToRemove: string) => {
    const nextIds = top4.filter((id) => id !== idToRemove);
    updateTop4(nextIds, nextIds.map(getPlace).filter(Boolean) as RestaurantCandidate[]);
  };

  const handleAdd = (cand: RestaurantCandidate) => {
    if (top4.includes(cand.id)) return;
    saveCachedRestaurant(cand);
    const nextIds = top4.length >= 4 ? [...top4.slice(0, 3), cand.id] : [...top4, cand.id];
    const nextCandidates = nextIds
      .map((id) => (id === cand.id ? cand : getPlace(id)))
      .filter(Boolean) as RestaurantCandidate[];
    saveCachedRestaurants(nextCandidates);
    updateTop4(nextIds, nextCandidates);
    setSearchQuery("");
  };

  // Combine remote search results with matching local candidates
  const qLower = searchQuery.trim().toLowerCase();
  const matchingLocal = qLower.length >= 2
    ? allCandidates.filter(
        (c) =>
          c.name.toLowerCase().includes(qLower) ||
          c.address.toLowerCase().includes(qLower),
      )
    : allCandidates;

  const combinedCandidates = qLower.length >= 2
    ? [...remoteCandidates, ...matchingLocal]
    : matchingLocal;

  const filteredCandidates = combinedCandidates
    .filter(
      (c, index, self) =>
        !top4.includes(c.id) && self.findIndex((x) => x.id === c.id) === index,
    )
    .slice(0, 10);

  const slots = [0, 1, 2, 3];

  return (
    <div className="top4-card" aria-label={tx("Favorite restaurants")}>
      <div className="top4-header">
        <div className="top4-title-wrap">
          <Star size={18} className="top4-star-icon" fill="currentColor" aria-hidden="true" />
          <h3 className="top4-title">{tx("Favourite restaurants")}</h3>
        </div>
        <button
          type="button"
          className="top4-edit-toggle-btn"
          onClick={() => setIsEditing(!isEditing)}
          aria-label={isEditing ? tx("Done") : tx("Edit favourites")}
        >
          <Edit2 size={14} aria-hidden="true" />
          <span>{isEditing ? tx("Done") : tx("Edit")}</span>
        </button>
      </div>

      <div className="top4-grid">
        {slots.map((index) => {
          const placeId = top4[index];
          const place = placeId ? getPlace(placeId) : null;

          if (!place) {
            return (
              <div
                key={`empty-${index}`}
                className="top4-slot empty"
                onClick={() => setIsEditing(true)}
                role="button"
                tabIndex={0}
                aria-label={tx("Add favorite restaurant")}
              >
                <div className="top4-slot-empty-content">
                  <Plus size={20} />
                  <span>{tx("Add")}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={place.id} className="top4-slot filled">
              <Link to={`/restaurant/${place.id}`} className="top4-slot-link">
                <div className="top4-slot-cover">
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="top4-slot-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="top4-slot-cover-placeholder">
                      <span>{getCuisineIcon(place)}</span>
                    </div>
                  )}
                  <span className="top4-slot-cuisine" aria-hidden="true">
                    {getCuisineIcon(place)}
                  </span>
                </div>
                <div className="top4-slot-info">
                  <span className="top4-slot-name">{place.name}</span>
                </div>
              </Link>
              {isEditing && (
                <button
                  type="button"
                  className="top4-slot-remove-btn"
                  onClick={() => handleRemove(place.id)}
                  title={tx("Remove")}
                  aria-label={tx("Remove")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="top4-picker-drawer">
          <div className="top4-picker-header">
            <h4>{tx("Choose a restaurant")} ({top4.length}/4)</h4>
            <div className="top4-search-input-wrap">
              <input
                type="text"
                className="top4-search-input"
                placeholder={tx("Search restaurant name…")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && (
                <LoaderCircle size={16} className="top4-search-spinner" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="top4-candidates-list">
            {isSearching && filteredCandidates.length === 0 ? (
              <p className="top4-empty-search">{tx("Searching restaurants…")}</p>
            ) : filteredCandidates.length === 0 ? (
              <p className="top4-empty-search">{tx("No restaurants found.")}</p>
            ) : (
              filteredCandidates.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  className="top4-candidate-item"
                  onClick={() => handleAdd(cand)}
                >
                  <div className="top4-cand-icon">
                    {getCuisineIcon(cand)}
                  </div>
                  <div className="top4-cand-text">
                    <span className="top4-cand-name">{cand.name}</span>
                    <span className="top4-cand-addr">{cand.address.split(",")[0]}</span>
                  </div>
                  <Plus size={16} className="top4-cand-add" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
