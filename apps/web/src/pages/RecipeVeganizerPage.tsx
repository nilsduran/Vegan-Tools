import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CookingPot, LoaderCircle } from "lucide-react";
import { veganizeRecipe } from "../api";
import { IngredientFindings } from "../components/IngredientFindings";
import { VerdictBadge } from "../components/VerdictBadge";
import { t } from "../i18n";

const EXAMPLE_RECIPE = `Pancakes
200 g flour
2 eggs
300 ml milk
30 g butter
1 tbsp honey`;

export function RecipeVeganizerPage() {
  const [recipeText, setRecipeText] = useState("");
  const [veganizedText, setVeganizedText] = useState("");
  const analysis = useMutation({
    mutationFn: veganizeRecipe,
    onSuccess: (result) => setVeganizedText(result.veganizedText),
  });

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <h1>{t("recipes")}</h1>
        <p>
          Paste the ingredients or the full recipe. Vegan Tools will identify known
          animal-derived ingredients and suggest how much to use and how to use it
          where a reliable substitution rule exists.
        </p>
      </header>

      <form
        className="text-analysis-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (recipeText.trim()) analysis.mutate(recipeText);
        }}
      >
        <label htmlFor="recipe-text">Recipe</label>
        <textarea
          id="recipe-text"
          value={recipeText}
          onChange={(event) => setRecipeText(event.target.value)}
          placeholder={EXAMPLE_RECIPE}
          rows={11}
        />
        <div className="form-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRecipeText(EXAMPLE_RECIPE);
              setVeganizedText("");
              analysis.reset();
            }}
          >
            Use an example
          </button>
          <button className="primary-button" disabled={!recipeText.trim() || analysis.isPending}>
            {analysis.isPending ? <LoaderCircle className="spin" /> : <CookingPot />}
            Veganize recipe
          </button>
        </div>
      </form>

      {analysis.error && <div className="error-banner">{analysis.error.message}</div>}
      {analysis.data && (
        <section className="analysis-result">
          <VerdictBadge verdict={analysis.data.verdict} />
          <h2>{analysis.data.summary}</h2>
          <div className="veganized-editor">
            <h3>Veganized recipe</h3>
            <p>
              This is an editable draft. Review the suggested quantities and instructions
              before cooking.
            </p>
            <textarea
              aria-label="Veganized recipe"
              value={veganizedText}
              onChange={(event) => setVeganizedText(event.target.value)}
              rows={14}
            />
          </div>
          <IngredientFindings findings={analysis.data.findings} />

          {analysis.data.substitutions.length > 0 && (
            <>
              <h3>Suggested substitutions</h3>
              <div className="substitution-list">
                {analysis.data.substitutions.map((substitution) => (
                  <article key={substitution.ingredientId}>
                    <div className="substitution-title">
                      <strong>{substitution.ingredient}</strong>
                      {substitution.detectedText && <small>{substitution.detectedText}</small>}
                    </div>
                    <ArrowRight aria-hidden="true" />
                    <div>
                      <p>{substitution.guidance}</p>
                      <span>Options</span>
                      <ul>
                        {substitution.suggestions.map((suggestion) => (
                          <li key={suggestion}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <p className="disclaimer">
            Suggestions are starting points: quantities and behaviour depend on the recipe.
            Check branded ingredients and adjust texture, moisture and cooking time.
          </p>
        </section>
      )}
    </div>
  );
}
