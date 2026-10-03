import { ChefHat, Clock, Users } from "lucide-react";
import type { RecipeItem } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";

interface RecipeCardProps {
  recipe: RecipeItem;
  onSelect: (recipe: RecipeItem) => void;
}

export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  const language = useLanguage();
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const currSym = language === "ca" ? "€" : "$";

  const difficultyLevel = recipe.difficulty === "easy" ? 1 : recipe.difficulty === "medium" ? 2 : 3;
  const costCount = Number(recipe.cost ?? "1");

  const difficultyLabels: Record<string, string> = {
    easy: tx("Easy"),
    medium: tx("Medium"),
    hard: tx("Hard"),
  };

  const costLabels: Record<string, string> = {
    "1": tx("Budget"),
    "2": tx("Moderate"),
    "3": tx("Gourmet"),
  };

  const categoryLabels: Record<string, string> = {
    traditional: tx("Traditional"),
    quick: tx("Quick (<20 min)"),
    baking: tx("Baking & Desserts"),
    basics: tx("Basics & Sauces"),
    protein: tx("High Protein"),
  };

  return (
    <article
      className="recipe-card"
      onClick={() => onSelect(recipe)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(recipe);
        }
      }}
      aria-label={recipe.title[language] ?? recipe.title.ca}
    >
      <div className="recipe-card-img-wrap">
        <img
          src={recipe.imageUrl}
          alt={recipe.title[language] ?? recipe.title.ca}
          className="recipe-card-img"
          loading="lazy"
        />
        <div className="recipe-card-badges">
          <span className="recipe-badge recipe-badge-category">
            {categoryLabels[recipe.category] ?? recipe.category}
          </span>
          <span
            className={`recipe-badge recipe-badge-${recipe.difficulty}`}
            title={`${tx("Difficulty")}: ${difficultyLabels[recipe.difficulty]}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
          >
            {Array.from({ length: difficultyLevel }).map((_, i) => (
              <ChefHat key={i} size={13} aria-hidden="true" />
            ))}
          </span>
          <span
            className="recipe-badge recipe-badge-cost"
            title={`${tx("Cost")}: ${costLabels[recipe.cost ?? "1"]}`}
            style={{ fontWeight: 800, letterSpacing: "1px" }}
          >
            {currSym.repeat(costCount)}
          </span>
          {recipe.spicy && (
            <span className="recipe-badge recipe-badge-spicy">
              🌶️ {tx("Spicy")}
            </span>
          )}
        </div>
      </div>

      <div className="recipe-card-body">
        <div className="recipe-card-meta">
          <span className="recipe-meta-item">
            <Clock size={14} aria-hidden="true" />
            <span>{totalTime} {tx("min")}</span>
          </span>
          <span className="recipe-meta-item">
            <Users size={14} aria-hidden="true" />
            <span>{recipe.servings} {tx("Servings").toLowerCase()}</span>
          </span>
        </div>

        <h3 className="recipe-card-title">
          {recipe.title[language] ?? recipe.title.ca}
        </h3>

        <p className="recipe-card-desc">
          {recipe.description[language] ?? recipe.description.ca}
        </p>
      </div>
    </article>
  );
}
