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
300 ml whole milk
30 g butter
1 tbsp honey
1 tsp baking powder
Pinch of salt

Instructions:
1. Whisk eggs with milk, melted butter and honey in a large bowl.
2. Add sifted flour, baking powder and salt. Mix gently until just combined without overworking.
3. Heat a non-stick pan over medium heat with a drop of oil or butter.
4. Pour 1/4 cup of batter per pancake. Cook for 2-3 minutes until bubbles form on the surface, flip and cook the other side for 1-2 minutes until golden brown.`,
      ca: `Pancakes
200 g de farina
2 ous
300 ml de llet sencera
30 g de mantega
1 cullerada de mel
1 culleradeta de llevat en pols
Un polsim de sal

Instruccions:
1. Bat els ous amb la llet, la mantega desfeta i la mel en un bol ampli.
2. Afegeix la farina tamisada amb el llevat i la sal. Barreja-ho suaument fins que quedi homogeni sense batre en excés.
3. Escalfa una paella antiadherent a foc mitjà amb una mica d'oli o mantega.
4. Aboca una cullerada gran de massa. Cuina durant 2-3 minuts fins que surtin bombolles a la superfície, gira el pancake i daura l'altre costat durant 1-2 minuts.`,
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
1 onion, finely chopped
40 g butter
50 g flour
500 ml whole milk
60 g grated Parmesan cheese
1 egg
Salt, black pepper and nutmeg

Instructions:
1. Boil the pasta tubes in salted water until al dente. Drain and lay flat on a clean damp kitchen towel.
2. In a skillet, sauté the chopped onion and brown the minced meats and liver with half the butter. Add salt and pepper, let cool, and mix in the egg.
3. Prepare the béchamel: melt the remaining butter, whisk in the flour for 1 minute, and slowly pour in the warm milk while whisking constantly until smooth and thickened. Season with salt, pepper, and nutmeg.
4. Fill each pasta tube with the meat filling and arrange neatly in a baking dish.
5. Pour the béchamel over the cannelloni, sprinkle grated cheese on top, and bake at 200°C for 20 minutes until golden and bubbly.`,
      ca: `Canelons tradicionals
16 plaques de canelons
300 g de carn picada de porc i vedella
50 g de fetge de pollastre
1 ceba picada finament
40 g de mantega
50 g de farina
500 ml de llet sencera
60 g de formatge ratllat
1 ou
Sal, pebre negre i nou moscada

Instruccions:
1. Bull les plaques de canelons en aigua amb sal fins que estiguin al dente. Escorre-les i estén-les sobre un drap de cuina net i humit.
2. En una paella, sofregir la ceba i daurar la carn picada i el fetge amb la meitat de la mantega. Salpebra, deixa refredar i barreja-hi l'ou.
3. Prepara la beixamel: fon la resta de mantega, afegeix la farina remenant 1 minut, i aboca la llet tèbia a poc a poc sense parar de remenar amb varetes fins que espesseixi. Condimenta amb sal, pebre i nou moscada.
4. Farcir les plaques amb la barreja de carn, enrotllar els canelons i col·locar-los en una safata de forn.
5. Cobrir amb la beixamel, escampar el formatge ratllat per sobre i gratinar al forn a 200°C durant 20 minuts fins que estiguin ben daurats.`,
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
30 g cornstarch (Maizena)
1 cinnamon stick
Zest of 1 lemon (yellow peel only)
4 tbsp sugar for caramelizing

Instructions:
1. In a pot, heat 400 ml of milk with the cinnamon stick and lemon zest over medium heat. Bring to a gentle simmer, turn off the heat, cover and let infuse for 15 minutes.
2. In a bowl, dissolve the cornstarch and sugar in the remaining 100 ml of cold milk, then whisk in the egg yolks until smooth.
3. Strain the warm infused milk and slowly pour it into the bowl while whisking continuously.
4. Pour the mixture back into the pot over low heat. Stir constantly with a wooden spoon or whisk until it thickens into a glossy custard (do not let it boil).
5. Pour immediately into shallow clay ramekins and let cool. Refrigerate for at least 3 hours.
6. Just before serving, sprinkle a thin, even layer of sugar on top and caramelize with a kitchen blowtorch or hot iron until a crisp amber crust forms.`,
      ca: `Crema catalana
500 ml de llet sencera
4 rovells d'ou
100 g de sucre
30 g de midó de blat de moro (Maizena)
1 branca de canyella
Pell d'1 llimona (només la part groga)
4 cullerades de sucre per cremar

Instruccions:
1. En un cassó, escalfa 400 ml de llet amb la branca de canyella i la pell de llimona a foc mitjà. Quan comenci a bullir, apaga el foc, tapa i deixa infusionar 15 minuts.
2. En un bol, dissol el midó de blat de moro i el sucre amb els 100 ml restants de llet freda, i després incorpora els rovells d'ou batent fins que quedi fi.
3. Cola la llet infusionada tèbia i aboca-la lentament al bol sense parar de remenar amb les varetes.
4. Torna a posar la mescla al cassó a foc lent. Remena constantment amb varetes o cullera de fusta fins que espesseixi amb textura de crema (sense que arribi a bullir fort).
5. Reparteix la crema en cassoletes individuals de fang i deixa refredar. Posa-les a la nevera un mínim de 3 hores.
6. Just abans de servir, escampa una capa fina i uniforme de sucre per sobre i crema amb un bufador de cuina o pala de cremar fins a obtenir una crosta daurada i cruixent.`,
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
80 g butter, melted
16 g baking powder
Pinch of salt
1 tsp vanilla extract

Instructions:
1. Preheat the oven to 180°C (350°F) and grease a round cake tin with a little butter and flour.
2. In a large mixing bowl, beat the eggs and sugar with an electric whisk for 5 minutes until pale, thick and fluffy.
3. Add the plain yogurt, melted butter, milk, and vanilla extract. Whisk gently until combined.
4. Sift together the flour, baking powder, and pinch of salt. Fold into the wet ingredients with a spatula using gentle circular motions until no flour pockets remain.
5. Pour batter into the tin and bake at 180°C for 35-40 minutes (test with a toothpick in the center; it should come out clean). Let cool on a wire rack before unmolding.`,
      ca: `Pa de pessic
250 g de farina
4 ous
200 g de sucre
125 g de iogurt natural
100 ml de llet sencera
80 g de mantega desfeta
16 g de llevat en pols
Un polsim de sal
1 culleradeta d'extracte de vainilla

Instruccions:
1. Preescalfa el forn a 180°C i engreixa un motlle rodó amb una mica de mantega i farina.
2. En un bol gran, bat els ous amb el sucre amb varetes durant 5 minuts fins que la barreja blanquegi i dobli el volum.
3. Incorpora el iogurt natural, la mantega desfeta, la llet i l'extracte de vainilla. Barreja-ho suaument.
4. Tamisa la farina amb el llevat en pols i el polsim de sal. Afegeix-ho a la massa amb una espàtula fent moviments envolvents suaus fins que no quedin grumolls.
5. Aboca la massa al motlle i enforna a 180°C durant 35-40 minuts (comprova la cocció clavant un escuradents al centre; ha de sortir net). Deixa refredar abans de desemmotllar.`,
    },
  },
  {
    id: "galetes-xocolata",
    name: { en: "Chocolate Chip Cookies", ca: "Galetes de xocolata" },
    text: {
      en: `Chocolate Chip Cookies
220 g flour
100 g butter, softened at room temperature
1 egg
120 g brown sugar
50 g white sugar
150 g dark chocolate chips
1 tsp vanilla extract
1/2 tsp baking soda
Pinch of salt

Instructions:
1. Preheat oven to 180°C (350°F) and line a baking sheet with parchment paper.
2. In a bowl, cream the softened butter with brown sugar and white sugar until smooth and creamy.
3. Beat in the egg and vanilla extract until fully incorporated.
4. Stir in the sifted flour, baking soda, and salt until a cohesive dough forms. Fold in the chocolate chips.
5. Scoop dough into golf-ball sized portions (about 12-14 balls) and place on the baking sheet leaving 5 cm space between each.
6. Bake at 180°C for 10-12 minutes until edges are lightly golden while centers remain soft. Let cool for 5 minutes on the sheet before transferring to a wire rack.`,
      ca: `Galetes de xocolata
220 g de farina
100 g de mantega a temperatura ambient
1 ou
120 g de sucre morè
50 g de sucre blanc
150 g de xips de xocolata negra
1 culleradeta d'extracte de vainilla
1/2 culleradeta de bicarbonat
Un polsim de sal

Instruccions:
1. Preescalfa el forn a 180°C i folra una safata de forn amb paper vegetal.
2. En un bol, bat la mantega pomada amb el sucre morè i el sucre blanc fins a obtenir una textura cremosa.
3. Afegeix l'ou i l'extracte de vainilla, batent fins que quedi ben integrat.
4. Incorpora la farina tamisada amb el bicarbonat i el polsim de sal fins a formar una massa homogènia. Afegeix els xips de xocolata.
5. Forma boletes de massa de la mida d'una nou (unes 12-14 boletes) i col·loca-les a la safata separades uns 5 cm entre elles.
6. Enforna a 180°C durant 10-12 minuts fins que les vores estiguin lleugerament daurades i el centre encara estigui tou. Deixa refredar 5 minuts a la safata abans de passar-les a una reixeta.`,
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
