/**
 * @file Top4Restaurants.tsx
 * @description Letterboxd-style "Top 4 Favorite Restaurants" showcase component.
 * Allows users to pin their 4 absolute favorite dining spots to the top of their profile.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Edit2, Plus, Sparkles, X } from "lucide-react";
import { FEATURED_RESTAURANTS, type RestaurantCandidate } from "@vegan-tools/domain";
import { getDiaryLogs, useUserTop4 } from "../utils/diary";
import { tx } from "../i18n";
import { getCuisineIcon } from "./RestaurantMap";

export function Top4Restaurants() {
  const { top4, updateTop4 } = useUserTop4();
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Gather all known restaurants (curated + any logged in diary)
  const diaryLogs = getDiaryLogs();
  const allCandidates: RestaurantCandidate[] = [...FEATURED_RESTAURANTS];

  // Add any diary places not already in curated
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
    return allCandidates.find((c) => c.id === id);
  };

  const handleRemove = (idToRemove: string) => {
    updateTop4(top4.filter((id) => id !== idToRemove));
  };

  const handleAdd = (idToAdd: string) => {
    if (top4.includes(idToAdd)) return;
    if (top4.length >= 4) {
      updateTop4([...top4.slice(0, 3), idToAdd]);
    } else {
      updateTop4([...top4, idToAdd]);
    }
    setSearchQuery("");
  };

  const filteredCandidates = allCandidates
    .filter(
      (c) =>
        !top4.includes(c.id) &&
        (searchQuery.trim() === "" ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.address.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .slice(0, 8);

  const slots = [0, 1, 2, 3];

  return (
    <div className="top4-card" aria-label={tx("Favorite restaurants")}>
      <div className="top4-header">
        <div className="top4-title-wrap">
          <Sparkles size={18} className="top4-sparkle-icon" aria-hidden="true" />
          <h3 className="top4-title">{tx("Top 4 Restaurants")}</h3>
        </div>
        <button
          type="button"
          className="top4-edit-toggle-btn"
          onClick={() => setIsEditing(!isEditing)}
          aria-label={isEditing ? tx("Done") : tx("Edit Top 4")}
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
            <input
              type="text"
              className="top4-search-input"
              placeholder={tx("Search restaurant name…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="top4-candidates-list">
            {filteredCandidates.length === 0 ? (
              <p className="top4-empty-search">{tx("No restaurants found.")}</p>
            ) : (
              filteredCandidates.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  className="top4-candidate-item"
                  onClick={() => handleAdd(cand.id)}
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
