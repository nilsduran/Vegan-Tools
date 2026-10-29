/**
 * @file UserListsSection.tsx
 * @description Letterboxd-style lists view for the user's profile:
 * - Shows default lists: "Liked" (💖) and "Want to go" (🔖).
 * - Shows and manages user-created custom lists.
 * - Allows expanding any list to view restaurants, open detail cards, or remove items.
 */

import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderPlus,
  Heart,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  loadUserLists,
  createCustomList,
  deleteCustomList,
  removeRestaurantFromList,
  type UserRestaurantList,
} from "../utils/userLists";
import { getCachedRestaurant, getCachedRestaurantsMap } from "../utils/restaurantCache";
import { FEATURED_RESTAURANTS, type RestaurantCandidate } from "@vegan-tools/domain";
import { tx } from "../i18n";
import { getCuisineIcon } from "./RestaurantMap";

export function UserListsSection() {
  const [lists, setLists] = useState<UserRestaurantList[]>(() => loadUserLists());
  const [activeListId, setActiveListId] = useState<string>("liked");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const refreshLists = () => {
    setLists(loadUserLists());
  };

  useEffect(() => {
    window.addEventListener("vt-user-lists-updated", refreshLists);
    return () => window.removeEventListener("vt-user-lists-updated", refreshLists);
  }, []);

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];

  const handleCreateList = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createCustomList(newTitle.trim(), "", false);
    setIsCreatingList(false);
    setNewTitle("");
    refreshLists();
    setActiveListId(created.id);
  };

  const handleDeleteList = (listId: string, listTitle: string) => {
    if (confirm(`${tx("Delete list")} "${listTitle}"?`)) {
      deleteCustomList(listId);
      refreshLists();
      setActiveListId("liked");
    }
  };

  const handleRemoveItem = (listId: string, restaurantId: string) => {
    removeRestaurantFromList(listId, restaurantId);
    refreshLists();
  };

  // Helper to look up restaurant candidate details
  const cachedMap = getCachedRestaurantsMap();
  const getPlace = (id: string): Partial<RestaurantCandidate> | undefined => {
    return (
      cachedMap[id] ||
      getCachedRestaurant(id) ||
      FEATURED_RESTAURANTS.find((r) => r.id === id) ||
      { id, name: id }
    );
  };

  return (
    <section className="profile-reviews-section profile-reviews-card user-lists-section" aria-label={tx("My lists")}>
      <div className="profile-reviews-header" style={{ marginBottom: "0.75rem" }}>
        <div className="profile-reviews-title-wrap">
          <Folder size={20} style={{ color: "var(--green, #047857)" }} aria-hidden="true" />
          <h2>{tx("My lists")}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setIsCreatingList(!isCreatingList)}
          style={{ fontSize: "0.82rem", padding: "0.35rem 0.7rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
        >
          {isCreatingList ? <X size={14} /> : <Plus size={14} />}
          <span>{isCreatingList ? tx("Cancel") : tx("Create list")}</span>
        </button>
      </div>

      {/* Compact New List Form (Single Line) */}
      {isCreatingList && (
        <form onSubmit={handleCreateList} style={{ display: "flex", gap: "0.45rem", marginBottom: "0.75rem" }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={tx("List title")}
            required
            autoFocus
            style={{ flex: 1, padding: "0.45rem 0.7rem", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.86rem", minWidth: 0 }}
          />
          <button type="submit" className="primary-button" disabled={!newTitle.trim()} style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem", whiteSpace: "nowrap" }}>
            <FolderPlus size={14} />
            <span>{tx("Save list")}</span>
          </button>
        </form>
      )}

      {/* Lists Tabs */}
      <div className="user-lists-tabs-row" style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.35rem", marginBottom: "0.65rem" }}>
        {lists.map((list) => {
          const isActive = list.id === activeList?.id;
          const icon = list.id === "liked" ? "💖" : list.id === "want_to_go" ? "🔖" : "📁";
          return (
            <button
              key={list.id}
              type="button"
              className={`user-list-tab-pill ${isActive ? "active" : ""}`}
              onClick={() => setActiveListId(list.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.38rem 0.7rem",
                borderRadius: "999px",
                border: isActive ? "1.5px solid var(--green, #047857)" : "1px solid var(--line, #cbd5e1)",
                background: isActive ? "var(--green-subtle, #ecfdf5)" : "var(--bg-card, #ffffff)",
                color: isActive ? "var(--green, #047857)" : "var(--text, #1e293b)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true">{icon}</span>
              <span>{list.id === "liked" ? tx("Liked") : list.id === "want_to_go" ? tx("Want to go") : list.title}</span>
              <span style={{ fontSize: "0.72rem", opacity: 0.75, background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: "999px" }}>
                {list.restaurantIds.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active List Content */}
      {activeList && (
        <div className="active-list-container">
          {!activeList.isDefault && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.35rem" }}>
              <button
                type="button"
                className="profile-review-delete-btn"
                onClick={() => handleDeleteList(activeList.id, activeList.title)}
                title={tx("Delete list")}
                aria-label={tx("Delete list")}
                style={{ fontSize: "0.78rem", gap: "0.25rem" }}
              >
                <Trash2 size={14} />
                <span>{tx("Delete list")}</span>
              </button>
            </div>
          )}

          {activeList.restaurantIds.length === 0 ? (
            <div className="profile-empty-state" style={{ padding: "1.1rem 0.75rem" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
                {tx("No restaurants in this list yet.")}
              </p>
            </div>
          ) : (
            <ul className="profile-reviews-list" style={{ marginTop: "0.25rem", gap: "0.4rem" }}>
              {activeList.restaurantIds.map((restId) => {
                const place = getPlace(restId);
                const emoji = place ? getCuisineIcon(place as RestaurantCandidate) : "🌱";
                return (
                  <li key={restId} className="profile-review-item" style={{ padding: "0.45rem 0.75rem", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "1.05rem", flexShrink: 0 }}>{emoji}</span>
                      <Link
                        to={`/restaurant/${encodeURIComponent(restId)}`}
                        className="profile-review-restaurant-link"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, fontSize: "0.88rem", minWidth: 0 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {place?.name || restId}
                        </span>
                        <ExternalLink size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
                      </Link>
                      {place?.address && (
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          · {place.address.split(",")[0]}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(activeList.id, restId)}
                      title={tx("Remove from list")}
                      aria-label={tx("Remove from list")}
                      className="profile-review-delete-btn"
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
