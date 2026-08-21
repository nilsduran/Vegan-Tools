import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, CookingPot, Copy, LoaderCircle } from "lucide-react";
import { veganizeRecipe } from "../api";
import { IngredientFindings } from "../components/IngredientFindings";
import { VerdictBadge } from "../components/VerdictBadge";
import { t, tx, useLanguage } from "../i18n";
import {
  localizeGeneratedText,
  localizeIngredientName,
  localizeSuggestion,
} from "../generated-i18n";

type ExampleRecipe = {
  id: string;
  name: { en: string; ca: string };
  text: { en: string; ca: string };
};

const RECIPE_EXAMPLES: ExampleRecipe[] = [
  {
    id: "pancakes",
    name: { en: "Pancakes", ca: "Pancakes" },
    text: {
      en: `Pancakes
200 g flour
2 eggs
300 ml milk
30 g butter
1 tbsp honey

Instructions:
Whisk eggs with milk, melted butter and honey. Fold in flour. Cook in a hot pan until bubbly, flip and brown.`,
      ca: `Pancakes
200 g de farina
2 ous
300 ml de llet
30 g de mantega
1 cullerada de mel

Instruccions:
Bat els ous amb la llet, la mantega desfeta i la mel. Afegeix la farina. Cuina a la paella volta i volta fins que estiguin daurats.`,
    },
  },
  {
    id: "canelons",
    name: { en: "Traditional Cannelloni", ca: "Canelons tradicionals" },
    text: {
      en: `Traditional Cannelloni
16 cannelloni pasta tubes
300 g minced pork and beef
50 g chicken liver
40 g butter
50 g flour
500 ml whole milk
60 g grated Parmesan cheese
1 egg
Salt, pepper, nutmeg

Instructions:
Cook pasta. Brown minced meats and liver with butter. Make béchamel sauce with butter, flour and milk. Fill tubes, cover with béchamel, top with cheese and bake at 200°C for 20 minutes.`,
      ca: `Canelons tradicionals
16 plaques de canelons
300 g de carn picada de porc i vedella
50 g de fetge de pollastre
40 g de mantega
50 g de farina
500 ml de llet sencera
60 g de formatge ratllat
1 ou
Sal, pebre i nou moscada

Instruccions:
Bull les plaques. Rostir la carn i el fetge amb mantega. Fes la beixamel amb mantega, farina i llet. Farcir els canelons, cobrir amb beixamel i formatge ratllat, i gratinar al forn a 200°C durant 20 minuts.`,
    },
  },
  {
    id: "crema-catalana",
    name: { en: "Crema Catalana", ca: "Crema catalana" },
    text: {
      en: `Crema Catalana
500 ml whole milk
4 egg yolks
100 g sugar
25 g cornstarch
1 cinnamon stick
Lemon zest

Instructions:
Heat milk with cinnamon and lemon zest. Whisk egg yolks with sugar and cornstarch. Slowly temper with warm milk, return to low heat and stir until thickened. Chill and caramelize sugar on top before serving.`,
      ca: `Crema catalana
500 ml de llet sencera
4 rovells d'ou
100 g de sucre
25 g de midó de blat de moro (Maizena)
1 branca de canyella
Pell de llimona

Instruccions:
Infusiona la llet amb la canyella i la llimona. Bat els rovells amb el sucre i el midó. Afegeix la llet tèbia a poc a poc, cou a foc lent sense parar de remenar fins que espesseixi. Deixa refredar i crema amb sucre abans de servir.`,
    },
  },
  {
    id: "pa-de-pessic",
    name: { en: "Sponge Cake", ca: "Pa de pessic" },
    text: {
      en: `Sponge Cake
250 g flour
4 eggs
200 g sugar
125 g plain yogurt
100 ml whole milk
80 g butter
16 g baking powder

Instructions:
Beat eggs with sugar until fluffy. Add yogurt, melted butter and milk. Fold in sifted flour and baking powder. Bake at 180°C for 35 minutes.`,
      ca: `Pa de pessic
250 g de farina
4 ous
200 g de sucre
125 g de iogurt natural
100 ml de llet sencera
80 g de mantega
16 g de llevat en pols

Instruccions:
Bat els ous amb el sucre fins que blanquegin. Afegeix el iogurt, la mantega desfeta i la llet. Incorpora la farina tamisada amb el llevat. Enforna a 180°C durant 35 minuts.`,
    },
  },
  {
    id: "galetes-xocolata",
    name: { en: "Chocolate Chip Cookies", ca: "Galetes de xocolata" },
    text: {
      en: `Chocolate Chip Cookies
220 g flour
100 g butter
1 egg
120 g brown sugar
150 g chocolate chips
1 tsp vanilla extract
1/2 tsp baking soda

Instructions:
Cream soft butter with sugar. Beat in the egg and vanilla. Stir in flour and baking soda, then fold in chocolate chips. Form dough balls and bake at 180°C for 10-12 minutes.`,
      ca: `Galetes de xocolata
220 g de farina
100 g de mantega
1 ou
120 g de sucre morè
150 g de xips de xocolata
1 culleradeta d'extracte de vainilla
1/2 culleradeta de bicarbonat

Instruccions:
Bat la mantega pomada amb el sucre. Afegeix l'ou i la vainilla. Incorpora la farina i el bicarbonat, i per últim els xips de xocolata. Fes boletes i enforna a 180°C durant 10-12 minuts.`,
    },
  },
];

export function RecipeVeganizerPage() {
  const language = useLanguage();
  const [recipeText, setRecipeText] = useState("");
  const [veganizedText, setVeganizedText] = useState("");
  const [copied, setCopied] = useState(false);
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

  const handleCopy = async () => {
    const textToCopy = localizeGeneratedText(veganizedText, language);
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore if clipboard is unavailable
    }
  };

  const handleSelectExample = (example: ExampleRecipe) => {
    setRecipeText(example.text[language]);
    setVeganizedText("");
    setSelections({});
    analysis.reset();
  };

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
        <div className="form-header-row">
          <label htmlFor="recipe-text">{tx("Recipe")}</label>
          <div className="recipe-example-pills" aria-label={tx("Examples")}>
            <span className="example-label">{tx("Examples")}:</span>
            {RECIPE_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                className="example-pill-button"
                onClick={() => handleSelectExample(example)}
              >
                {example.name[language]}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id="recipe-text"
          value={recipeText}
          onChange={(event) => setRecipeText(event.target.value)}
          placeholder={RECIPE_EXAMPLES[0]?.text[language] ?? ""}
          rows={11}
        />
        <div className="form-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const defaultExample = RECIPE_EXAMPLES[0];
              if (defaultExample) handleSelectExample(defaultExample);
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
            <div className="veganized-header-row">
              <h3>{tx("Veganized recipe")}</h3>
              <button
                type="button"
                className="copy-recipe-button"
                onClick={handleCopy}
                title={tx("Copy to clipboard")}
              >
                {copied ? <Check className="copied-icon" /> : <Copy />}
                <span>{copied ? tx("Copied!") : tx("Copy")}</span>
              </button>
            </div>
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
