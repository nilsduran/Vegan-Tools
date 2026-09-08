/**
 * @file LogVisitModal.tsx
 * @description Modal dialog allowing users to record a restaurant visit with date, rating (0.5 to 5.0), and notes.
 * Enforces maximum 1 entry per calendar day per restaurant.
 */

import { useState } from "react";
import { Calendar, Check, Star, X } from "lucide-react";
import { saveVisitLog, type RestaurantVisitLog } from "../utils/diary";
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
}

export function LogVisitModal({
  restaurant,
  initialLog,
  isOpen,
  onClose,
  onSaved,
}: LogVisitModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [visitDate, setVisitDate] = useState<string>(initialLog?.visitDate || todayStr);
  const [rating, setRating] = useState<number>(initialLog?.rating || 4.5);
  const [notes, setNotes] = useState<string>(initialLog?.notes || "");
  const [dishesText, setDishesText] = useState<string>(
    initialLog?.dishesTried?.join(", ") || "",
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dishesTried = dishesText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const saved = saveVisitLog({
      id: initialLog?.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      restaurantImage: restaurant.imageUrl,
      cuisine: restaurant.cuisine,
      visitDate,
      rating,
      notes,
      dishesTried,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.(saved);
      onClose();
    }, 600);
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

        <form onSubmit={handleSubmit} className="log-visit-form">
          {/* Visit Date */}
          <div className="log-visit-field">
            <label htmlFor="visit-date-input" className="log-visit-label">
              <Calendar size={15} aria-hidden="true" />
              <span>{tx("Visit date")}</span>
            </label>
            <input
              id="visit-date-input"
              type="date"
              className="log-visit-input"
              value={visitDate}
              max={todayStr}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
            <span className="log-visit-hint">
              {tx("One log per restaurant per calendar day")}
            </span>
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

          {/* Dishes tried */}
          <div className="log-visit-field">
            <label htmlFor="dishes-input" className="log-visit-label">
              <span>🌱 {tx("Dishes tried (comma separated)")}</span>
            </label>
            <input
              id="dishes-input"
              type="text"
              className="log-visit-input"
              placeholder="e.g. Heura burger, Pad Thai, Tiramisu"
              value={dishesText}
              onChange={(e) => setDishesText(e.target.value)}
            />
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
        </form>
      </div>
    </div>
  );
}
