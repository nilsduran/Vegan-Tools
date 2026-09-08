/**
 * @file LogVisitModal.tsx
 * @description Modal dialog allowing users to record a restaurant visit with date, rating (0.5 to 5.0), dishes, and notes.
 * Enforces authenticated user account. Supports optional visit date, menu dish suggestions, and custom/off-menu dish input.
 */

import { useState } from "react";
import { Calendar, Check, Plus, Star, Trash2, X } from "lucide-react";
import { deleteVisitLog, saveVisitLog, type RestaurantVisitLog } from "../utils/diary";
import { useAuth } from "../auth";
import { tx } from "../i18n";

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
  const { user } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [hasDate, setHasDate] = useState<boolean>(
    initialLog ? Boolean(initialLog.visitDate) : true,
  );
  const [visitDate, setVisitDate] = useState<string>(initialLog?.visitDate || todayStr);
  const [rating, setRating] = useState<number>(initialLog?.rating || 4.5);
  const [notes, setNotes] = useState<string>(initialLog?.notes || "");
  const [dishesList, setDishesList] = useState<string[]>(initialLog?.dishesTried || []);
  const [customDishInput, setCustomDishInput] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const saved = saveVisitLog({
      id: initialLog?.id,
      userId: user.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      restaurantImage: restaurant.imageUrl,
      cuisine: restaurant.cuisine,
      visitDate: hasDate && visitDate ? visitDate : undefined,
      rating,
      notes,
      dishesTried: dishesList,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.(saved);
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    if (!initialLog || !user) return;
    if (confirm(tx("Are you sure you want to delete this visit?"))) {
      deleteVisitLog(initialLog.id, user.id);
      onDeleted?.(initialLog.id);
      onClose();
    }
  };

  const ratingOptions = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

  return (
    <div className="auth-dialog-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="auth-dialog-card log-visit-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-dialog-header">
          <div>
            <h2 className="auth-dialog-title">{tx("Log a restaurant visit")}</h2>
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
            {/* Visit Date (Optional, defaults to today) */}
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
                  <span className="log-visit-hint">
                    {tx("One log per restaurant per calendar day")}
                  </span>
                </div>
              )}
            </div>

            {/* Star Rating (Half-star steps 0.5 to 5.0) */}
            <div className="log-visit-field">
              <div className="log-visit-rating-header">
                <label className="log-visit-label">
                  <Star size={15} aria-hidden="true" />
                  <span>{tx("Rating")}</span>
                </label>
                <span className="log-visit-rating-display">
                  ★ {rating.toFixed(1)} / 5.0
                </span>
              </div>

              <div className="log-visit-rating-pills" role="radiogroup" aria-label={tx("Rating")}>
                {ratingOptions.map((val) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={rating === val}
                    className={`log-visit-rating-pill ${rating === val ? "active" : ""}`}
                    onClick={() => setRating(val)}
                  >
                    {val % 1 === 0 ? `${val}.0` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Hybrid Dishes Section: Quick Suggestions from Menu + Free Text for Off-Menu Specials */}
            <div className="log-visit-field">
              <label className="log-visit-label">
                <span>🌱 {tx("Dishes")}</span>
              </label>

              {/* Selected Dish Tags */}
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

              {/* Menu Suggestions Quick Chips */}
              {menuDishes && menuDishes.length > 0 && (
                <div className="log-visit-menu-suggestions">
                  <span className="log-visit-suggestions-label">
                    🍽️ {tx("Menu suggestions")}:
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

              {/* Custom Free Text Input (for off-menu / specials) */}
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

            {/* Review Notes */}
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
                    <span>{tx("Save visit")}</span>
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
