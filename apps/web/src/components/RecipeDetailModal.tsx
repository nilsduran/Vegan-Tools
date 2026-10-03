import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckSquare,
  Clock,
  Flame,
  Minus,
  Plus,
  Square,
  Users,
  X,
} from "lucide-react";
import type { RecipeItem } from "@vegan-tools/domain";
import { scaleIngredientAmount } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";
import { KitchenModeModal } from "./KitchenModeModal";

interface RecipeDetailModalProps {
  recipe: RecipeItem;
  onClose: () => void;
}

export function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
  const language = useLanguage();
  const [servings, setServings] = useState(recipe.servings);
  const [kitchenModeOpen, setKitchenModeOpen] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.scrollTop = 0;
    }
  }, [recipe.id]);

  const toggleIngredientCheck = (index: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const difficultyLabels: Record<string, string> = {
    easy: tx("Easy"),
    medium: tx("Medium"),
    hard: tx("Hard"),
  };

  const categoryLabels: Record<string, string> = {
    traditional: tx("Traditional"),
    quick: tx("Quick (<20 min)"),
    baking: tx("Baking & Desserts"),
    basics: tx("Basics & Sauces"),
    protein: tx("High Protein"),
  };

  if (kitchenModeOpen) {
    return (
      <KitchenModeModal
        recipe={recipe}
        onClose={() => setKitchenModeOpen(false)}
      />
    );
  }

  return (
    <div
      className="recipe-detail-overlay auth-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={recipe.title[language] ?? recipe.title.ca}
    >
      <div ref={dialogRef} className="recipe-detail-dialog">
        <button
          type="button"
          className="recipe-detail-close-btn"
          onClick={onClose}
          aria-label={tx("Back")}
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Hero image & badges */}
        <div className="recipe-detail-hero">
          <img
            src={recipe.imageUrl}
            alt={recipe.title[language] ?? recipe.title.ca}
            className="recipe-detail-img"
          />
          <div className="recipe-detail-hero-overlay">
            <div className="recipe-detail-badges">
              <span className="recipe-badge recipe-badge-category">
                {categoryLabels[recipe.category] ?? recipe.category}
              </span>
              <span className={`recipe-badge recipe-badge-${recipe.difficulty}`}>
                {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
              </span>
            </div>
            <h2 className="recipe-detail-title">
              {recipe.title[language] ?? recipe.title.ca}
            </h2>
          </div>
        </div>

        <div className="recipe-detail-content">
          <p className="recipe-detail-desc">
            {recipe.description[language] ?? recipe.description.ca}
          </p>

          {/* Quick Metrics Bar */}
          <div className="recipe-detail-metrics">
            <div className="metric-box">
              <Clock size={18} aria-hidden="true" />
              <div>
                <span className="metric-label">{tx("Prep")}</span>
                <strong>{recipe.prepTimeMinutes} {tx("min")}</strong>
              </div>
            </div>
            <div className="metric-box">
              <Flame size={18} aria-hidden="true" />
              <div>
                <span className="metric-label">{tx("Cook")}</span>
                <strong>{recipe.cookTimeMinutes} {tx("min")}</strong>
              </div>
            </div>
            <div className="metric-box">
              <Users size={18} aria-hidden="true" />
              <div>
                <span className="metric-label">{tx("Servings")}</span>
                <div className="servings-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    disabled={servings <= 1}
                    onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                    aria-label="Decrease servings"
                  >
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <strong className="servings-number">{servings}</strong>
                  <button
                    type="button"
                    className="stepper-btn"
                    disabled={servings >= 12}
                    onClick={() => setServings((prev) => Math.min(12, prev + 1))}
                    aria-label="Increase servings"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA: Mode Cuina */}
          <button
            type="button"
            className="start-kitchen-mode-btn"
            onClick={() => setKitchenModeOpen(true)}
          >
            <Flame size={20} aria-hidden="true" />
            <span>{tx("Start cooking")} ({tx("Cook Mode")})</span>
          </button>

          {/* Ingredients Section */}
          <section className="recipe-ingredients-section">
            <div className="section-title-wrap">
              <h3>{tx("Ingredients")}</h3>
              {servings !== recipe.servings && (
                <span className="servings-scaled-tag">
                  {tx("Servings")}: {servings}
                </span>
              )}
            </div>

            <ul className="ingredients-checklist" aria-label={tx("Ingredients")}>
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = Boolean(checkedIngredients[idx]);
                const scaledAmount = scaleIngredientAmount(
                  ing.amount,
                  recipe.servings,
                  servings,
                );
                return (
                  <li
                    key={idx}
                    className={`ingredient-check-item ${isChecked ? "checked" : ""}`}
                    onClick={() => toggleIngredientCheck(idx)}
                  >
                    <button
                      type="button"
                      className="checkbox-custom-btn"
                      aria-checked={isChecked}
                      role="checkbox"
                    >
                      {isChecked ? (
                        <CheckSquare size={18} className="check-icon checked" aria-hidden="true" />
                      ) : (
                        <Square size={18} className="check-icon" aria-hidden="true" />
                      )}
                    </button>
                    <div className="ingredient-text">
                      <span className="ingredient-amount">
                        {scaledAmount !== undefined && (
                          <strong>
                            {scaledAmount} {ing.unit?.[language] ?? ing.unit?.ca ?? ""}{" "}
                          </strong>
                        )}
                      </span>
                      <span className="ingredient-name">
                        {ing.name[language] ?? ing.name.ca}
                      </span>
                      {ing.notes && (
                        <small className="ingredient-notes">
                          {" "}({ing.notes[language] ?? ing.notes.ca})
                        </small>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Instructions Steps */}
          <section className="recipe-instructions-section">
            <h3>{tx("Instructions")}</h3>
            <ol className="instructions-list">
              {recipe.steps.map((step) => (
                <li key={step.stepNumber} className="instruction-step-item">
                  <div className="step-number-pill">{step.stepNumber}</div>
                  <div className="step-content">
                    <p>{step.instruction[language] ?? step.instruction.ca}</p>
                    {step.durationMinutes && (
                      <span className="step-duration-badge">
                        <Clock size={13} aria-hidden="true" />
                        <span>~{step.durationMinutes} {tx("min")}</span>
                      </span>
                    )}
                    {step.tip && (
                      <div className="step-tip-box">
                        <strong>{tx("Chef tip")}:</strong>{" "}
                        <span>{step.tip[language] ?? step.tip.ca}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
