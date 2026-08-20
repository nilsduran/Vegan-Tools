import { useState } from "react";
import { Check, LoaderCircle, MessageSquareWarning, X } from "lucide-react";
import { tx, useLanguage } from "../i18n";
import { updateRestaurantNotes } from "../api";
import type { MenuDraft } from "@vegan-tools/domain";

export function RestaurantNotesDialog({
  menuId,
  token,
  currentNotes,
  isOpen,
  onClose,
  onSuccess,
}: {
  menuId: string;
  token?: string;
  currentNotes?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMenu: MenuDraft) => void;
}) {
  const language = useLanguage();
  const [rawNotes, setRawNotes] = useState(currentNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const updated = await updateRestaurantNotes(menuId, rawNotes, token);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update restaurant notes.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">{tx("Restaurant warning / note")}</span>
            <h2>{tx("Community notes")}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={tx("Close")}
          >
            <X />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              {tx("Notes that apply to the whole venue")}
              <small>
                {language === "ca"
                  ? "Ex: Fregidora compartida per a tot, o tota la pasta fresca porta ou. La IA polirà el text i el traduirà bilingüe."
                  : "e.g. Shared fryer for all fried items, or all fresh pasta contains egg. AI will polish and translate."}
              </small>
            </label>
            <textarea
              rows={4}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder={
                language === "ca"
                  ? "Escriu la nota aquí..."
                  : "Type the note here..."
              }
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <footer className="modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tx("Cancel")}
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoaderCircle className="spin" /> : <Check />}
              {isSubmitting
                ? (language === "ca" ? "Desant i traduint…" : "Saving & translating…")
                : tx("Save notes")}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
