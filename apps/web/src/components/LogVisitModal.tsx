/**
 * @file LogVisitModal.tsx
 * @description Unified modal dialog allowing users to record a restaurant review and visit log.
 * Integrates leaves rating (1 to 5, no default rating), optional visit date, dishes tried,
 * personal notes/review, and venue tags matching map search filters to help populate the community database.
 */

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { Calendar, Camera, Check, Plus, Trash2, X } from "lucide-react";
import { deleteVisitLog, saveVisitLog, type RestaurantVisitLog } from "../utils/diary";
import { submitRestaurantReview } from "../api";
import { useAuth } from "../auth";
import { tx, useLanguage } from "../i18n";
import { LeafRating } from "./LeafRating";
import { CATEGORY_FILTERS } from "./FilterPills";

export const STANDARD_VENUE_TAGS = CATEGORY_FILTERS.map((f) => ({
  id: f.id,
  labelKey: f.labelKey,
  icon: f.icon,
}));

interface LogVisitModalProps {
  restaurant: {
    id: string;
    name: string;
    address?: string;
    imageUrl?: string;
    cuisine?: string;
  };
  initialLog?: RestaurantVisitLog | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (log: RestaurantVisitLog) => void;
  onDeleted?: (logId: string) => void;
  menuDishes?: string[];
}

export function LogVisitModal({
  restaurant,
  initialLog,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  menuDishes,
}: LogVisitModalProps) {
  const { user, token } = useAuth();
  const language = useLanguage();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [hasDate, setHasDate] = useState<boolean>(
    initialLog ? Boolean(initialLog.visitDate) : true,
  );
  const [visitDate, setVisitDate] = useState<string>(initialLog?.visitDate || todayStr);
  const [rating, setRating] = useState<number>(initialLog?.rating || 0);
  const [notes, setNotes] = useState<string>(initialLog?.notes || "");
  const [dishesList, setDishesList] = useState<string[]>(initialLog?.dishesTried || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialLog?.tags || []);
  const [photos, setPhotos] = useState<string[]>(initialLog?.photos || []);
  const [customDishInput, setCustomDishInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLog) {
      setHasDate(Boolean(initialLog.visitDate));
      setVisitDate(initialLog.visitDate || todayStr);
      setRating(initialLog.rating || 0);
      setNotes(initialLog.notes || "");
      setDishesList(initialLog.dishesTried || []);
      setSelectedTags(initialLog.tags || []);
      setPhotos(initialLog.photos || []);
    } else {
      setHasDate(true);
      setVisitDate(todayStr);
      setRating(0);
      setNotes("");
      setDishesList([]);
      setSelectedTags([]);
      setPhotos([]);
    }
    setValidationError(null);
  }, [initialLog, isOpen, todayStr]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleAddDish = (dishName?: string) => {
    const clean = (dishName || customDishInput).trim();
    if (!clean) return;
    if (!dishesList.includes(clean)) {
      setDishesList((prev) => [...prev, clean]);
    }
    setCustomDishInput("");
  };

  const handleRemoveDish = (dishToRemove: string) => {
    setDishesList((prev) => prev.filter((d) => d !== dishToRemove));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = 3 - photos.length;
    if (remaining <= 0) return;
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotos((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setValidationError(null);

    const effectiveRating = rating > 0 ? rating : (initialLog?.rating ?? 4.5);

    // 1. Save unified visit log in local diary / Supabase visits
    const saved = saveVisitLog(
      {
        id: initialLog?.id,
        userId: user.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        restaurantImage: restaurant.imageUrl,
        cuisine: restaurant.cuisine,
        visitDate: hasDate && visitDate ? visitDate : undefined,
        rating: effectiveRating,
        notes: notes.trim(),
        dishesTried: dishesList,
        tags: selectedTags,
        photos,
      },
      token || undefined,
    );

    // 2. Submit community leaf review if authenticated and rating was provided
    if (token && rating > 0) {
      void submitRestaurantReview(
        restaurant.id,
        {
          leavesScore: rating,
          comment: notes.trim(),
          userName: user.username || user.name || "Usuari",
          tags: selectedTags,
          photos,
        },
        token,
      ).catch(() => {
        // Handled silently; offline local save succeeded
      });
    }

    setSavedSuccess(true);
    timerRef.current = setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.(saved);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    if (!initialLog || !user) return;
    if (confirm(tx("Are you sure you want to delete this visit?"))) {
      deleteVisitLog(initialLog.id, user.id, token || undefined);
      onDeleted?.(initialLog.id);
      onClose();
    }
  };

  return (
    <div className="auth-dialog-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="auth-dialog-modal log-visit-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-dialog-header">
          <div>
            <h2 className="auth-dialog-title">{tx("Log a restaurant visit & review")}</h2>
            <p className="auth-dialog-subtitle">{restaurant.name}</p>
          </div>
          <button
            type="button"
            className="auth-dialog-close-btn"
            onClick={onClose}
            aria-label={tx("Close")}
          >
            <X size={20} />
          </button>
        </div>

        {!user ? (
          <div className="log-visit-auth-required">
            <p>{tx("An account is required to log visits and reviews.")}</p>
            <button
              type="button"
              className="primary-button"
              onClick={onClose}
            >
              <span>{tx("Close")}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="log-visit-form">
            {validationError && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                {validationError}
              </div>
            )}

            {/* Letterboxd-style Leaf Rating (1.0 to 5.0) - No default rating */}
            <div className="log-visit-field">
              <div className="log-visit-rating-header">
                <label className="log-visit-label">
                  <span>{tx("Rating")}</span>
                </label>
                <span className="log-visit-rating-display" style={{ color: rating > 0 ? "var(--green)" : "var(--muted)" }}>
                  {rating > 0 ? `${rating.toFixed(1)} / 5.0` : tx("Tap leaves to rate")}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
                <LeafRating
                  value={rating}
                  interactive
                  onChange={(val) => {
                    setRating(val);
                    setValidationError(null);
                  }}
                  size={26}
                  ariaLabel={tx("Rating")}
                />
              </div>
            </div>

            {/* Visit Date Toggle (Optional, defaults to today) */}
            <div className="log-visit-field">
              <div className="log-visit-date-toggle-header">
                <label htmlFor="visit-date-checkbox" className="log-visit-checkbox-label">
                  <input
                    id="visit-date-checkbox"
                    type="checkbox"
                    checked={hasDate}
                    onChange={(e) => setHasDate(e.target.checked)}
                  />
                  <span>
                    <Calendar size={14} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 4 }} />
                    {tx("Include visit date (defaults to today)")}
                  </span>
                </label>
                {!hasDate && (
                  <span className="log-visit-nodate-badge">{tx("Without specific date")}</span>
                )}
              </div>

              {hasDate && (
                <div style={{ marginTop: "0.4rem" }}>
                  <input
                    id="visit-date-input"
                    type="date"
                    className="log-visit-input"
                    value={visitDate}
                    max={todayStr}
                    onChange={(e) => setVisitDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Review Notes / Comment */}
            <div className="log-visit-field">
              <label htmlFor="notes-input" className="log-visit-label">
                <span>{tx("Notes and review")}</span>
              </label>
              <textarea
                id="notes-input"
                className="log-visit-textarea"
                rows={3}
                placeholder={tx("How was the food, service and plant-based options?")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Photo Upload Section */}
            <div className="log-visit-field">
              <label className="log-visit-label">
                <span>📷 {tx("Add photos to review (max 3)")}</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
                {photos.map((src, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      width: "68px",
                      height: "68px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid var(--line, #cbd5e1)",
                    }}
                  >
                    <img
                      src={src}
                      alt={`Review photo ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: "absolute",
                        top: "2px",
                        right: "2px",
                        background: "rgba(0,0,0,0.65)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={tx("Remove photo")}
                      aria-label={tx("Remove photo")}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <label
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "8px",
                      border: "2px dashed var(--line, #cbd5e1)",
                      background: "var(--bg-subtle, #f8fafc)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--text-muted, #64748b)",
                      fontSize: "0.72rem",
                      gap: "2px",
                    }}
                  >
                    <Camera size={18} />
                    <span>{tx("Photo")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Dishes Section: Quick Suggestions from Menu + Free Text for Off-Menu Specials */}
            <div className="log-visit-field">
              <label className="log-visit-label">
                <span>🌱 {tx("Dishes")}</span>
              </label>

              {dishesList.length > 0 && (
                <div className="log-visit-selected-tags">
                  {dishesList.map((dish) => (
                    <span key={dish} className="log-visit-dish-tag">
                      <span>{dish}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDish(dish)}
                        aria-label={`${tx("Remove")} ${dish}`}
                        className="log-visit-tag-remove-btn"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {menuDishes && menuDishes.length > 0 && (
                <div className="log-visit-menu-suggestions">
                  <span className="log-visit-suggestions-label">
                    🍴 {tx("Menu suggestions")}:
                  </span>
                  <div className="log-visit-suggestion-chips">
                    {menuDishes
                      .filter((d) => !dishesList.includes(d))
                      .slice(0, 8)
                      .map((dish) => (
                        <button
                          key={dish}
                          type="button"
                          className="log-visit-dish-chip"
                          onClick={() => handleAddDish(dish)}
                        >
                          <Plus size={11} aria-hidden="true" />
                          <span>{dish}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="log-visit-dish-add-row">
                <input
                  id="custom-dish-input"
                  type="text"
                  className="log-visit-input"
                  placeholder={tx("Type a dish name (or off-menu special)…")}
                  value={customDishInput}
                  onChange={(e) => setCustomDishInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDish();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button log-visit-add-dish-btn"
                  onClick={() => handleAddDish()}
                  disabled={!customDishInput.trim()}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{tx("Add")}</span>
                </button>
              </div>
            </div>

            {/* Standard Venue Tags matching Map Filters */}
            <div className="log-visit-field">
              <label className="log-visit-label">
                <span>🏷️ {tx("Tags & features (matching map filters)")}</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                {CATEGORY_FILTERS.filter((t) => t.id !== "menu_catala" || language === "ca").map((t) => {
                  const isSelected = selectedTags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        background: isSelected ? "var(--green, #047857)" : "var(--bg-subtle, #f1f5f9)",
                        color: isSelected ? "#ffffff" : "var(--text, #1e293b)",
                        border: `1px solid ${isSelected ? "var(--green, #047857)" : "var(--line, #cbd5e1)"}`,
                        padding: "0.3rem 0.65rem",
                        borderRadius: "999px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t.icon && <span aria-hidden="true">{t.icon}</span>}
                      <span>{tx(t.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="log-visit-actions-bar">
              {initialLog ? (
                <button
                  type="button"
                  className="log-visit-delete-btn"
                  onClick={handleDelete}
                  title={tx("Delete visit")}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>{tx("Delete visit")}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="log-visit-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onClose}
                >
                  {tx("Cancel")}
                </button>
                <button
                  type="submit"
                  className="primary-button log-visit-submit-btn"
                  disabled={savedSuccess}
                >
                  {savedSuccess ? (
                    <>
                      <Check size={16} aria-hidden="true" />
                      <span>{tx("Saved!")}</span>
                    </>
                  ) : (
                    <span>{tx("Save visit & review")}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
