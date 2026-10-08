/**
 * @file RecipeDetailPage.tsx
 * @description Dedicated public page for an individual plant-based master recipe (/recipes/:slug).
 * Displays full culinary details, photography, portion scaling adjuster, interactive ingredient checklist,
 * detailed preparation steps, and step-by-step Cook Mode (Kitchen Mode with Wake Lock).
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChefHat,
  Clock,
  Flame,
  Minus,
  Plus,
  Share2,
  Square,
  Users,
} from "lucide-react";
import {
  MASTER_RECIPES,
  scaleIngredientAmount,
  type RecipeItem,
} from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";
import { KitchenModeModal } from "../components/KitchenModeModal";
import { LeafRating } from "../components/LeafRating";

export function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const language = useLanguage();
  const currSym = language === "ca" ? "€" : "$";

  // Scroll to top immediately whenever navigating to a recipe
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [slug]);

  // Find recipe by slug or id
  const recipe: RecipeItem | undefined = MASTER_RECIPES.find(
    (r) => r.slug === slug || r.id === slug
  );

  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [kitchenModeOpen, setKitchenModeOpen] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  const storageKey = recipe ? `vegan_tools_recipe_rating_${recipe.id}` : "";
  const [userRating, setUserRating] = useState<number>(() => {
    if (!recipe) return 0;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [ratingMessage, setRatingMessage] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    if (!recipe) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: `${recipe.title[language] ?? recipe.title.ca} | Vegan Tools`,
      text: recipe.description[language] ?? recipe.description.ca,
      url: shareUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  const handleRateRecipe = (newRating: number) => {
    setUserRating(newRating);
    if (recipe) {
      try {
        localStorage.setItem(storageKey, String(newRating));
      } catch {
        // Ignore storage errors
      }
      setRatingMessage(true);
      setTimeout(() => setRatingMessage(false), 3500);
    }
  };

  useDocumentHead({
    title: recipe ? (recipe.title[language] ?? recipe.title.ca) : tx("Recipe"),
    description: recipe
      ? (recipe.description[language] ?? recipe.description.ca)
      : undefined,
    image: recipe?.imageUrl,
    path: recipe ? `/recipes/${recipe.slug}` : undefined,
    type: "article",
  });

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

  if (!recipe) {
    return (
      <div className="page recipe-detail-page">
        <nav className="values-nav" aria-label={tx("Navigation")}>
          <Link to="/recipes" className="values-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{tx("Cookbook")}</span>
          </Link>
        </nav>
        <div className="recipe-not-found" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h2>{tx("Recipe not found")}</h2>
          <p style={{ color: "var(--color-muted, #64748b)", margin: "1rem 0" }}>
            {tx("The requested recipe could not be found.")}
          </p>
          <Link to="/recipes" className="primary-button" style={{ display: "inline-flex", marginTop: "1rem" }}>
            <span>{tx("Back to Cookbook")}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page recipe-detail-page">
      {/* Back Navigation & Share */}
      <nav
        className="values-nav"
        aria-label={tx("Navigation")}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
      >
        <Link to="/recipes" className="values-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tx("Cookbook")}</span>
        </Link>

        <button
          type="button"
          onClick={() => void handleShare()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.45rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid var(--line, #e2e8f0)",
            background: "var(--bg-card, #ffffff)",
            color: copiedShare ? "var(--green, #16a34a)" : "var(--color-text, #1e293b)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title={tx("Share")}
        >
          {copiedShare ? <Check size={15} /> : <Share2 size={15} />}
          <span>{copiedShare ? tx("Copied!") : tx("Share")}</span>
        </button>
      </nav>

      {/* Main Recipe Article */}
      <article className="recipe-detail-container" style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Hero Header with Media */}
        <div
          className="recipe-detail-hero"
          style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            height: "420px",
            minHeight: "380px",
            maxHeight: "520px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <img
            src={recipe.imageUrl}
            alt={recipe.title[language] ?? recipe.title.ca}
            className="recipe-detail-img"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div className="recipe-detail-hero-overlay">
            <div className="recipe-detail-badges">
              <span className="recipe-badge recipe-badge-category">
                {categoryLabels[recipe.category] ?? recipe.category}
              </span>
              <span
                className={`recipe-badge recipe-badge-${recipe.difficulty}`}
                title={`${tx("Difficulty")}: ${difficultyLabels[recipe.difficulty] ?? recipe.difficulty}`}
              >
                {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
              </span>
              <span
                className="recipe-badge recipe-badge-cost"
                style={{ display: "inline-flex", alignItems: "center", fontWeight: 700 }}
                title={`${tx("Cost")}: ${currSym.repeat(Number(recipe.cost ?? "1"))}`}
              >
                {currSym.repeat(Number(recipe.cost ?? "1"))}
              </span>
              {recipe.spicy && (
                <span className="recipe-badge recipe-badge-spicy">
                  🌶️ {tx("Spicy")}
                </span>
              )}
            </div>
            <h1 className="recipe-detail-title" style={{ fontSize: "2rem", margin: "0.5rem 0" }}>
              {recipe.title[language] ?? recipe.title.ca}
            </h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="recipe-detail-content" style={{ marginTop: "1.5rem" }}>
          <p className="recipe-detail-desc" style={{ fontSize: "1.08rem", lineHeight: "1.6", color: "var(--color-text-secondary, #334155)" }}>
            {recipe.description[language] ?? recipe.description.ca}
          </p>

          {/* Recipe Source & Attribution */}
          {recipe.source && (
            <div
              className="recipe-detail-source"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.86rem",
                color: "var(--color-muted, #64748b)",
                marginTop: "0.5rem",
                marginBottom: "0.5rem",
                padding: "0.4rem 0.75rem",
                backgroundColor: "var(--color-bg-secondary, #f8fafc)",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              <BookOpen size={15} aria-hidden="true" color="#16a34a" />
              <span>
                {tx("Inspired by")}:{" "}
                {recipe.source.url ? (
                  <a
                    href={recipe.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#16a34a", fontWeight: 600, textDecoration: "underline" }}
                  >
                    {recipe.source.name}
                  </a>
                ) : (
                  <strong style={{ color: "var(--color-text, #1e293b)" }}>{recipe.source.name}</strong>
                )}
                {recipe.source.author && ` · ${recipe.source.author}`}
              </span>
            </div>
          )}

          {/* Recipe Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="recipe-detail-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.6rem 0 1.25rem" }}>
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    backgroundColor: "var(--color-bg-secondary, #f1f5f9)",
                    color: "var(--color-text-secondary, #475569)",
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Quick Metrics & Servings Stepper: Less is More */}
          <div className="recipe-detail-metrics" style={{ margin: "1.5rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div className="metric-box" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={19} color="#16a34a" aria-hidden="true" />
              <strong style={{ fontSize: "1.05rem" }}>
                {(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} {tx("min")}
              </strong>
            </div>

            <div className="metric-box" style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-muted, #64748b)" }}>
                {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
              </span>
            </div>

            <div className="metric-box" style={{ display: "flex", alignItems: "center" }}>
              <strong style={{ fontSize: "1.1rem", letterSpacing: "2px", color: "#16a34a" }}>
                {currSym.repeat(Number(recipe.cost ?? "1"))}
              </strong>
            </div>

            <div className="metric-box servings-metric-box" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Users size={18} color="#16a34a" aria-hidden="true" />
              <div className="servings-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  disabled={servings <= 1}
                  onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                  aria-label={tx("Decrease servings")}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <strong className="servings-number">{servings}</strong>
                <button
                  type="button"
                  className="stepper-btn"
                  disabled={servings >= 12}
                  onClick={() => setServings((prev) => Math.min(12, prev + 1))}
                  aria-label={tx("Increase servings")}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Kitchen Mode Launch CTA */}
          <div style={{ marginBottom: "2rem" }}>
            <button
              type="button"
              className="start-kitchen-mode-btn"
              onClick={() => setKitchenModeOpen(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                padding: "0.85rem 1.25rem",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                borderRadius: "10px",
                border: "none",
                fontSize: "1.05rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
              }}
            >
              <Flame size={20} aria-hidden="true" />
              <span>{tx("Start cooking")} ({tx("Cook Mode")})</span>
            </button>
          </div>

          {/* Single Column Layout: First Ingredients, then Instructions */}
          <div className="recipe-detail-single-column" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {/* 1. Ingredients Checklist */}
            <section className="recipe-ingredients-section">
              <h2 style={{ fontSize: "1.3rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>🌱 {tx("Ingredients")}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--color-muted, #64748b)" }}>
                  ({servings} {tx("Servings").toLowerCase()})
                </span>
              </h2>

              <ul className="recipe-ingredients-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recipe.ingredients.map((ing, idx) => {
                  const isChecked = Boolean(checkedIngredients[idx]);
                  const scaled = scaleIngredientAmount(ing.amount, recipe.servings, servings);
                  const nameStr = ing.name[language] ?? ing.name.ca;
                  const unitStr = ing.unit ? (ing.unit[language] ?? ing.unit.ca) : "";
                  const notesStr = ing.notes ? (ing.notes[language] ?? ing.notes.ca) : "";

                  return (
                    <li
                      key={idx}
                      className={`ingredient-check-item ${isChecked ? "is-checked" : ""}`}
                      onClick={() => toggleIngredientCheck(idx)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleIngredientCheck(idx);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                        padding: "0.5rem 0",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--color-border, #e2e8f0)",
                        textDecoration: isChecked ? "line-through" : "none",
                        opacity: isChecked ? 0.6 : 1,
                      }}
                    >
                      <span className="ingredient-checkbox-icon" style={{ marginTop: "2px" }}>
                        {isChecked ? (
                          <CheckSquare size={17} color="#16a34a" aria-hidden="true" />
                        ) : (
                          <Square size={17} color="var(--color-muted, #94a3b8)" aria-hidden="true" />
                        )}
                      </span>
                      <div className="ingredient-text">
                        {scaled !== undefined && (
                          <strong style={{ marginRight: "4px" }}>
                            {scaled} {unitStr}
                          </strong>
                        )}
                        <span>{nameStr}</span>
                        {notesStr && (
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--color-muted, #64748b)" }}>
                            {notesStr}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 2. Preparation Steps */}
            <section className="recipe-steps-section">
              <h2 style={{ fontSize: "1.3rem", marginBottom: "0.75rem" }}>
                <span>👩‍🍳 {tx("Instructions")}</span>
              </h2>

              <ol className="recipe-steps-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recipe.steps.map((step) => {
                  const instruction = step.instruction[language] ?? step.instruction.ca;
                  const tip = step.tip ? (step.tip[language] ?? step.tip.ca) : "";

                  return (
                    <li
                      key={step.stepNumber}
                      className="recipe-step-item"
                      style={{
                        display: "flex",
                        gap: "0.85rem",
                        marginBottom: "1.25rem",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        className="step-circle"
                        style={{
                          minWidth: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {step.stepNumber}
                      </div>
                      <div className="step-body" style={{ flex: 1 }}>
                        <p style={{ margin: 0, lineHeight: "1.55", color: "var(--color-text, #1e293b)" }}>
                          {instruction}
                        </p>
                        {step.durationMinutes && (
                          <span
                            className="step-duration"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.78rem",
                              color: "var(--color-muted, #64748b)",
                              marginTop: "4px",
                            }}
                          >
                            <Clock size={12} aria-hidden="true" />
                            <span>{step.durationMinutes} {tx("min")}</span>
                          </span>
                        )}
                        {tip && (
                          <div
                            className="step-tip-box"
                            style={{
                              marginTop: "6px",
                              padding: "0.5rem 0.75rem",
                              backgroundColor: "var(--color-bg-secondary, #f8fafc)",
                              borderLeft: "3px solid #16a34a",
                              borderRadius: "4px",
                              fontSize: "0.84rem",
                              color: "var(--color-text-secondary, #475569)",
                            }}
                          >
                            <strong>Tip:</strong> {tip}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          {/* Interactive Recipe Rating Card: Clean single header & larger leaves */}
          <div
            className="recipe-rating-card"
            style={{
              marginTop: "2.5rem",
              padding: "1.75rem 1.5rem",
              borderRadius: "14px",
              backgroundColor: "var(--color-bg-secondary, #f8fafc)",
              border: "1px solid var(--color-border, #e2e8f0)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.85rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-text, #1e293b)" }}>
              {userRating > 0
                ? `${tx("Rate this recipe")} (${userRating}/5)`
                : tx("Rate this recipe")}
            </h3>
            <LeafRating
              value={userRating}
              interactive={true}
              size={20}
              onChange={handleRateRecipe}
            />
            {ratingMessage && (
              <span
                style={{
                  fontSize: "0.88rem",
                  color: "#16a34a",
                  fontWeight: 600,
                  transition: "opacity 0.3s ease",
                }}
              >
                ✅ {tx("Thank you for rating this recipe!")}
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Kitchen Mode Modal Overlay */}
      {kitchenModeOpen && (
        <KitchenModeModal
          recipe={recipe}
          onClose={() => setKitchenModeOpen(false)}
        />
      )}
    </div>
  );
}
