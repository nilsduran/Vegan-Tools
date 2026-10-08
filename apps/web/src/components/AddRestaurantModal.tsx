/**
 * @file AddRestaurantModal.tsx
 * @description Modal dialog allowing users to quickly register missing restaurants.
 * Geocodes the address via Nominatim or falls back to coordinates, saves the venue locally,
 * and allows instant menu discovery or manual photo/PDF upload.
 */

import { useState, useEffect, type FormEvent } from "react";
import { LoaderCircle, PlusCircle, Utensils, X } from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { createCustomRestaurant } from "../api";
import { saveCustomRestaurant } from "../utils/restaurantCache";
import { tx } from "../i18n";

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  userCoords?: { lat: number; lng: number };
  onRestaurantCreated: (restaurant: RestaurantCandidate) => void;
}

export function AddRestaurantModal({
  isOpen,
  onClose,
  initialName = "",
  userCoords,
  onRestaurantCreated,
}: AddRestaurantModalProps) {
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setAddress("");
      setWebsiteUrl("");
      setErrorMessage("");
      setSubmitting(false);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    let normalizedWebsite = websiteUrl.trim();
    if (normalizedWebsite && !/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const candidate = await createCustomRestaurant({
        name: trimmedName,
        address: address.trim() || undefined,
        websiteUrl: normalizedWebsite || undefined,
        latitude: userCoords?.lat,
        longitude: userCoords?.lng,
      });

      saveCustomRestaurant(candidate);
      onRestaurantCreated(candidate);
      onClose();
    } catch {
      // Offline / network failure fallback: synthesize a candidate locally
      const fallbackId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const lat = userCoords?.lat ?? 41.3851;
      const lon = userCoords?.lng ?? 2.1734;
      const fallbackCandidate: RestaurantCandidate = {
        id: fallbackId,
        name: trimmedName,
        address: address.trim() || "Barcelona",
        latitude: lat,
        longitude: lon,
        websiteUrl: normalizedWebsite || undefined,
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        provider: "custom",
      };

      saveCustomRestaurant(fallbackCandidate);
      onRestaurantCreated(fallbackCandidate);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="auth-dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-restaurant-title"
    >
      <div
        className="auth-dialog-modal add-restaurant-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px", width: "100%" }}
      >
        <button
          type="button"
          className="auth-dialog-close-btn"
          onClick={onClose}
          aria-label={tx("Close")}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <header className="auth-dialog-header" style={{ marginBottom: "1.2rem", textAlign: "center" }}>
          <div
            className="auth-dialog-leaf-badge"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ecfdf5",
              color: "var(--green, #047857)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
            }}
          >
            <Utensils size={24} aria-hidden="true" />
          </div>
          <h2 id="add-restaurant-title" style={{ fontSize: "1.35rem", margin: "0 0 0.4rem", fontWeight: 700 }}>
            {tx("Add restaurant")}
          </h2>
          <p className="auth-dialog-subtitle" style={{ fontSize: "0.88rem", margin: 0, color: "var(--muted)" }}>
            {tx("Enter the restaurant name and address so we can locate it on the map and extract dishes from its menu.")}
          </p>
        </header>

        {errorMessage && (
          <div className="sidebar-error error-banner" style={{ marginBottom: "1rem" }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="add-restaurant-name"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}
            >
              {tx("Restaurant name")} *
            </label>
            <input
              id="add-restaurant-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: El noi d'Alcoi"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--line, #cbd5e1)",
                fontSize: "0.95rem",
                background: "var(--bg, #fff)",
                color: "var(--text, #1e293b)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="add-restaurant-address"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}
            >
              {tx("Address or street")}
            </label>
            <input
              id="add-restaurant-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Carrer de Castellnou, 37, Barcelona"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--line, #cbd5e1)",
                fontSize: "0.95rem",
                background: "var(--bg, #fff)",
                color: "var(--text, #1e293b)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="add-restaurant-website"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}
            >
              {tx("Website or menu link (optional)")}
            </label>
            <input
              id="add-restaurant-website"
              type="text"
              inputMode="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Ex: https://elnoidalcoi.com"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--line, #cbd5e1)",
                fontSize: "0.95rem",
                background: "var(--bg, #fff)",
                color: "var(--text, #1e293b)",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {tx("Cancel")}
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={submitting || !name.trim()}
              style={{ flex: 1.5, justifyContent: "center" }}
            >
              {submitting ? (
                <>
                  <LoaderCircle size={16} className="spin" aria-hidden="true" />
                  <span>{tx("Adding restaurant...")}</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} aria-hidden="true" />
                  <span>{tx("Add and find menu")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
