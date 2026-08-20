import { useEffect, useState } from "react";
import type { DietVerdict, MenuItem } from "@vegan-tools/domain";
import { LoaderCircle, Pencil, X, Check } from "lucide-react";
import { t, tx, useLanguage } from "../i18n";
import { localizeGeneratedText } from "../generated-i18n";
import { submitDishFeedback } from "../api";

export function DishCorrectionDialog({
  item,
  menuId,
  token,
  isOpen,
  onClose,
  onSuccess,
}: {
  item: MenuItem;
  menuId: string;
  token?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedItem: MenuItem) => void;
}) {
  const language = useLanguage();
  const [verdict, setVerdict] = useState<DietVerdict>(item.verdict);
  const [targetModification, setTargetModification] = useState<
    "vegan" | "vegetarian" | "none"
  >(item.modifiableTo ?? (item.modifications[0]?.target || "none"));
  const [rawNote, setRawNote] = useState(
    language === "ca"
      ? (item.reasonCa?.trim() || localizeGeneratedText(item.reason || "", "ca"))
      : (item.reason || ""),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setVerdict(item.verdict);
    setTargetModification(
      item.modifiableTo ?? (item.modifications[0]?.target || "none"),
    );
    setRawNote(
      language === "ca"
        ? (item.reasonCa?.trim() || localizeGeneratedText(item.reason || "", "ca"))
        : (item.reason || ""),
    );
    setError("");
  }, [item, isOpen, language]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await submitDishFeedback(
        menuId,
        item.id,
        {
          verdict,
          rawNote,
          targetModification:
            targetModification === "none" ? undefined : targetModification,
        },
        token,
      );
      onSuccess(response.updatedDish);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit dish correction.",
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
            <span className="modal-eyebrow">{tx("Dish correction")}</span>
            <h2>{language === "ca" && item.nameCa ? item.nameCa : item.name}</h2>
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
            <label>{tx("Dietary verdict")}</label>
            <select
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as DietVerdict)}
            >
              <option value="vegan">{t("vegan")}</option>
              <option value="probably_vegan">{t("probablyVegan")}</option>
              <option value="vegetarian">{t("vegetarian")}</option>
              <option value="probably_vegetarian">{t("probablyVegetarian")}</option>
              <option value="non_vegetarian">{tx("Carnist")}</option>
              <option value="unknown">{t("unknown")}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{tx("Practical adaptation")}</label>
            <select
              value={targetModification}
              onChange={(e) =>
                setTargetModification(
                  e.target.value as "vegan" | "vegetarian" | "none",
                )
              }
            >
              <option value="none">{tx("No adaptation")}</option>
              <option value="vegan">{tx("Adaptable to vegan")}</option>
              <option value="vegetarian">{tx("Adaptable to vegetarian")}</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {tx("Explanation or notes")}
              <small>
                {language === "ca"
                  ? "Escriu en qualsevol idioma i sense preocupar-te per les faltes; la IA polirà el text i el traduirà bilingüe."
                  : "Type in any language; AI will fix typos and generate clean Catalan and English notes."}
              </small>
            </label>
            <textarea
              rows={3}
              value={rawNote}
              onChange={(e) => setRawNote(e.target.value)}
              placeholder={
                language === "ca"
                  ? "Ex: la pasta fresca porta ou, o demanar sense la salsa de formatge..."
                  : "e.g. fresh pasta contains egg, or ask without cheese sauce..."
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
                : tx("Save correction")}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
