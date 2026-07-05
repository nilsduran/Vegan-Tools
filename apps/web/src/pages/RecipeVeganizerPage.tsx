import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CookingPot, LoaderCircle } from "lucide-react";
import { veganizeRecipe } from "../api";
import { IngredientFindings } from "../components/IngredientFindings";
import { VerdictBadge } from "../components/VerdictBadge";
import { t, tx, useLanguage } from "../i18n";
import {
  localizeGeneratedText,
  localizeIngredientName,
  localizeSuggestion,
} from "../generated-i18n";

const EXAMPLE_RECIPES = {
  en: `Pancakes
200 g flour
2 eggs
300 ml milk
30 g butter
1 tbsp honey`,
  ca: `Pancakes
200 g de farina
2 ous
300 ml de llet
30 g de mantega
1 cullerada de mel

Instruccions:
Barreja els ingredients i cuina els pancakes.`,
};

export function RecipeVeganizerPage() {
  const language = useLanguage();
  const exampleRecipe = EXAMPLE_RECIPES[language];
  const [recipeText, setRecipeText] = useState("");
  const [veganizedText, setVeganizedText] = useState("");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const analysis = useMutation({
    mutationFn: ({
      text,
      selections,
    }: {
      text: string;
      selections: Record<string, string>;
    }) => veganizeRecipe(text, selections),
    onSuccess: (result) => setVeganizedText(result.veganizedText),
  });

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <h1>{t("recipes")}</h1>
        <p>
          {tx("Paste the ingredients or the full recipe. Vegan Tools will identify known animal-derived ingredients and suggest how much to use and how to use it where a reliable substitution rule exists.")}
        </p>
      </header>

      <form
        className="text-analysis-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (recipeText.trim()) analysis.mutate({ text: recipeText, selections });
        }}
      >
        <label htmlFor="recipe-text">{tx("Recipe")}</label>
        <textarea
          id="recipe-text"
          value={recipeText}
          onChange={(event) => setRecipeText(event.target.value)}
          placeholder={exampleRecipe}
          rows={11}
        />
        <div className="form-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRecipeText(exampleRecipe);
              setVeganizedText("");
              setSelections({});
              analysis.reset();
            }}
          >
            {tx("Use an example")}
          </button>
          <button className="primary-button" disabled={!recipeText.trim() || analysis.isPending}>
            {analysis.isPending ? <LoaderCircle className="spin" /> : <CookingPot />}
            {tx("Veganize recipe")}
          </button>
        </div>
      </form>

      {analysis.error && <div className="error-banner">{analysis.error.message}</div>}
      {analysis.data && (
        <section className="analysis-result">
          <VerdictBadge verdict={analysis.data.verdict} />
          <h2>{localizeGeneratedText(analysis.data.summary, language)}</h2>
          <div className="veganized-editor">
            <h3>{tx("Veganized recipe")}</h3>
            <p>
              {tx("This is an editable draft. Review the suggested quantities and instructions before cooking.")}
            </p>
            <textarea
              aria-label={tx("Veganized recipe")}
              value={localizeGeneratedText(veganizedText, language)}
              onChange={(event) => setVeganizedText(event.target.value)}
              rows={14}
            />
          </div>
          <IngredientFindings findings={analysis.data.findings} />

          {analysis.data.substitutions.length > 0 && (
            <>
              <h3>{tx("Suggested substitutions")}</h3>
              <div className="substitution-list">
                {analysis.data.substitutions.map((substitution) => (
                  <article key={substitution.ingredientId}>
                    <div className="substitution-title">
                      <strong>{localizeIngredientName({
                        id: substitution.ingredientId,
                        name: substitution.ingredient,
                      }, language)}</strong>
                      {substitution.detectedText && <small>{substitution.detectedText}</small>}
                    </div>
                    <ArrowRight aria-hidden="true" />
                    <div>
                      <p>{localizeGeneratedText(substitution.guidance, language)}</p>
                      <span>{tx("Choose a substitute")}</span>
                      <div className="substitute-options">
                        {substitution.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className={`substitute-option${
                              substitution.selectedSuggestion === suggestion ? " active" : ""
                            }`}
                            aria-pressed={substitution.selectedSuggestion === suggestion}
                            disabled={analysis.isPending}
                            onClick={() => {
                              const nextSelections = {
                                ...selections,
                                [substitution.ingredientId]: suggestion,
                              };
                              setSelections(nextSelections);
                              analysis.mutate({
                                text: recipeText,
                                selections: nextSelections,
                              });
                            }}
                          >
                            {localizeSuggestion(suggestion, language)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <p className="disclaimer">
            {tx("Suggestions are starting points: quantities and behaviour depend on the recipe. Check branded ingredients and adjust texture, moisture and cooking time.")}
          </p>
        </section>
      )}
    </div>
  );
}
