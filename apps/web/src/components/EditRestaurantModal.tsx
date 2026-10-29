import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  X,
} from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { useAuth } from "../auth";
import { tx } from "../i18n";
import {
  getWeeklyEditQuota,
  saveRestaurantEdit,
  type RestaurantEditSubmission,
} from "../utils/restaurantEdits";
import { AuthDialog } from "./AuthDialog";
import { VeganBadgeIcon, VegetarianBadgeIcon, VeganOptionsBadgeIcon } from "./DietIcons";

export function EditRestaurantModal({
  isOpen,
  restaurant,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  restaurant: RestaurantCandidate;
  onClose: () => void;
  onSaved?: (updated: RestaurantCandidate) => void;
}) {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const [name, setName] = useState(restaurant.name || "");
  const [address, setAddress] = useState(restaurant.address || "");
  const [websiteUrl, setWebsiteUrl] = useState(restaurant.websiteUrl || "");
  const [openingHours, setOpeningHours] = useState(restaurant.openingHours || "");
  const [dietType, setDietType] = useState<"vegan" | "vegetarian" | "veg_friendly">(
    restaurant.isVegan ? "vegan" : restaurant.isVegetarian ? "vegetarian" : "veg_friendly",
  );
  const [permanentlyClosed, setPermanentlyClosed] = useState(false);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const quota = getWeeklyEditQuota(user?.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (!quota.canEdit) {
      setErrorMessage(
        tx("You have reached the limit of 50 edits this week to prevent automated spam. Please try again next week."),
      );
      return;
    }

    if (!name.trim()) {
      setErrorMessage(tx("Restaurant name is required."));
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const submission: RestaurantEditSubmission = {
        restaurantId: restaurant.id,
        name: name.trim(),
        address: address.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        isVegan: dietType === "vegan",
        isVegetarian: dietType === "vegan" || dietType === "vegetarian",
        permanentlyClosed,
        notes: notes.trim() || undefined,
      };

      const updated = saveRestaurantEdit(submission, user.id);

      // Also fire-and-forget to API endpoint
      try {
        void fetch(`/v1/restaurants/${encodeURIComponent(restaurant.id)}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission),
        }).catch(() => {
          // Offline/local persistence already succeeded
        });
      } catch {
        // Silently continue
      }

      setSuccessMessage(
        permanentlyClosed
          ? tx("The restaurant has been marked as permanently closed and removed from the map.")
          : tx("Restaurant details have been updated successfully!"),
      );

      setTimeout(() => {
        onSaved?.(updated);
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMessage(tx("Failed to save changes. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card edit-restaurant-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", width: "94%" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Pencil size={20} className="icon-green" aria-hidden="true" />
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>
              {tx("Edit restaurant details")}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={tx("Close")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Auth check: Requires user account */}
        {!user ? (
          <div className="edit-auth-required-box" style={{ padding: "1.5rem 0", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                padding: "0.8rem",
                borderRadius: "50%",
                background: "rgba(4, 120, 87, 0.1)",
                color: "var(--green)",
                marginBottom: "0.8rem",
              }}
            >
              <Lock size={28} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem" }}>
              {tx("Log in to edit restaurant information")}
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                maxWidth: "380px",
                margin: "0 auto 1.2rem",
                lineHeight: 1.5,
              }}
            >
              {tx(
                "To maintain data quality and prevent automated bot spam, you must be signed in to edit details or report closed venues.",
              )}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAuthDialog(true)}
              style={{ padding: "0.65rem 1.4rem", margin: "0 auto" }}
            >
              {tx("Log in / Sign up")}
            </button>

            <AuthDialog
              isOpen={showAuthDialog}
              onClose={() => setShowAuthDialog(false)}
              onSuccess={() => setShowAuthDialog(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="edit-restaurant-form" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Weekly Quota Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.8rem",
                background: "var(--bg-card)",
                border: "1px solid var(--line)",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <span>{tx("Weekly community edits quota:")}</span>
              <strong style={{ color: quota.remaining < 5 ? "#e11d48" : "var(--green)" }}>
                {quota.remaining} / {quota.max} {tx("available")}
              </strong>
            </div>

            {errorMessage && (
              <div className="error-banner" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "rgba(4, 120, 87, 0.12)",
                  color: "var(--green)",
                  borderRadius: "0.5rem",
                  fontWeight: 500,
                }}
              >
                <CheckCircle size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Permanent closure toggle */}
            <div
              style={{
                padding: "0.8rem",
                borderRadius: "0.6rem",
                border: `1.5px solid ${permanentlyClosed ? "#f43f5e" : "var(--line)"}`,
                background: permanentlyClosed ? "rgba(244, 63, 94, 0.08)" : "var(--bg-card)",
                transition: "all 0.15s ease",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={permanentlyClosed}
                  onChange={(e) => setPermanentlyClosed(e.target.checked)}
                  style={{ marginTop: "0.2rem", width: "18px", height: "18px", accentColor: "#e11d48" }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: permanentlyClosed ? "#e11d48" : "var(--text)" }}>
                    <Ban size={16} />
                    <span>{tx("This restaurant is permanently closed")}</span>
                  </div>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {tx("If checked, this venue will be immediately removed from the map and searches.")}
                  </p>
                </div>
              </label>
            </div>

            {/* Standard editable fields (only relevant if not marked closed) */}
            {!permanentlyClosed && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-rest-name" style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.3rem" }}>
                    {tx("Restaurant name")}
                  </label>
                  <input
                    id="edit-rest-name"
                    type="text"
                    className="text-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-rest-address" style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.3rem" }}>
                    {tx("Full address (street and number)")}
                  </label>
                  <input
                    id="edit-rest-address"
                    type="text"
                    className="text-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-rest-website" style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.3rem" }}>
                    {tx("Website / Instagram")}
                  </label>
                  <input
                    id="edit-rest-website"
                    type="url"
                    className="text-input"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-rest-hours" style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.3rem" }}>
                    {tx("Opening hours (e.g. Mo-Sa 13:00-16:00, 20:00-23:00)")}
                  </label>
                  <input
                    id="edit-rest-hours"
                    type="text"
                    className="text-input"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                  />
                </div>

                {/* Diet Classification */}
                <div className="form-group">
                  <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.4rem" }}>
                    {tx("Dietary classification")}
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`filter-pill ${dietType === "vegan" ? "active" : ""}`}
                      onClick={() => setDietType("vegan")}
                      style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
                    >
                      <VeganBadgeIcon size={16} />
                      <span>{tx("100% Vegà")}</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${dietType === "vegetarian" ? "active" : ""}`}
                      onClick={() => setDietType("vegetarian")}
                      style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
                    >
                      <VegetarianBadgeIcon size={16} />
                      <span>{tx("Vegetarian")}</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${dietType === "veg_friendly" ? "active" : ""}`}
                      onClick={() => setDietType("veg_friendly")}
                      style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
                    >
                      <VeganOptionsBadgeIcon size={15} />
                      <span>{tx("Veg-friendly")}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Notes / Reason */}
            <div className="form-group">
              <label htmlFor="edit-rest-notes" style={{ display: "block", fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.3rem" }}>
                {tx("Source or notes for this correction (optional)")}
              </label>
              <textarea
                id="edit-rest-notes"
                className="text-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tx("e.g. Official Instagram post, personal visit on weekend, etc.")}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {tx("Cancel")}
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting || !quota.canEdit}
                style={{ flex: 1 }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>{tx("Saving…")}</span>
                  </>
                ) : (
                  <span>{permanentlyClosed ? tx("Report closed venue") : tx("Save changes")}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
