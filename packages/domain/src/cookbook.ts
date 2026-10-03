/**
 * @file cookbook.ts
 * @description Curated 100% plant-based master recipes, structured cookbook schema,
 * category classifications, portion scaling logic, and difficulty/cost filters.
 */

import { z } from "zod";

export const recipeCategorySchema = z.enum([
  "all",
  "traditional",
  "quick",
  "baking",
  "basics",
  "protein",
]);
export type RecipeCategory = z.infer<typeof recipeCategorySchema>;

export const recipeDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type RecipeDifficulty = z.infer<typeof recipeDifficultySchema>;

export const recipeCostSchema = z.enum(["1", "2", "3"]);
export type RecipeCost = z.infer<typeof recipeCostSchema>;

export const localizedTextSchema = z.object({
  ca: z.string(),
  en: z.string(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const recipeIngredientSchema = z.object({
  name: localizedTextSchema,
  amount: z.number().optional(),
  unit: localizedTextSchema.optional(),
  notes: localizedTextSchema.optional(),
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const recipeStepSchema = z.object({
  stepNumber: z.number(),
  instruction: localizedTextSchema,
  durationMinutes: z.number().optional(),
  tip: localizedTextSchema.optional(),
});
export type RecipeStep = z.infer<typeof recipeStepSchema>;

export const recipeSourceSchema = z.object({
  name: z.string(),
  author: z.string().optional(),
  url: z.string().optional(),
});
export type RecipeSource = z.infer<typeof recipeSourceSchema>;

export const recipeItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: localizedTextSchema,
  description: localizedTextSchema,
  category: z.enum(["traditional", "quick", "baking", "basics", "protein"]),
  difficulty: recipeDifficultySchema,
  cost: recipeCostSchema.default("1"),
  prepTimeMinutes: z.number(),
  cookTimeMinutes: z.number(),
  servings: z.number().default(4),
  imageUrl: z.string(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(recipeStepSchema),
  tags: z.array(z.string()),
  source: recipeSourceSchema.optional(),
  featured: z.boolean().default(false),
  spicy: z.boolean().optional(),
  rating: z.number().default(5),
});
export type RecipeItem = z.infer<typeof recipeItemSchema>;

export const MASTER_RECIPES: RecipeItem[] = [
  {
    id: "canelons-tradicionals",
    slug: "canelons-tradicionals-festa-major",
    title: {
      ca: "Canelons de Festa Major amb Bolets",
      en: "Festive Cannelloni with Wild Mushrooms",
    },
    description: {
      ca: "El clàssic imprescindible de la cuina catalana en versió 100% vegetal: farcit melós de bolets de temporada, soja texturitzada fina i beixamel suau d'avena i nou moscada.",
      en: "The quintessential Catalan holiday dish made 100% plant-based: savory wild mushrooms, textured protein, and a velvety oat milk béchamel with freshly grated nutmeg.",
    },
    category: "traditional",
    difficulty: "medium",
    cost: "2",
    prepTimeMinutes: 50,
    cookTimeMinutes: 45,
    servings: 4,
    rating: 4.9,
    imageUrl: "/images/recipes/canelons-tradicionals.jpg",
    tags: ["catalan", "traditional", "pasta", "comfort_food", "oven", "hot", "autumn_winter", "main", "celebration"],
    source: {
      name: "Corpus del Patrimoni Culinari Català",
      author: "Institut Català de la Cuina",
      url: "https://cuinacatalana.eu",
    },
    featured: true,
    ingredients: [
      {
        name: { ca: "Plaques de canelons", en: "Cannelloni pasta sheets" },
        amount: 16,
        unit: { ca: "unitats", en: "sheets" },
      },
      {
        name: { ca: "Soja texturitzada fina", en: "Fine textured soy protein" },
        amount: 120,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Bolets variats (moixerons, ceps o xampinyons)", en: "Mixed mushrooms (wild or cremini)" },
        amount: 250,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Ceba de Figueres picada finament", en: "Sweet onion, finely diced" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Grans d'all picats", en: "Garlic cloves, minced" },
        amount: 2,
        unit: { ca: "unitats", en: "cloves" },
      },
      {
        name: { ca: "Tomàquet madur ratllat", en: "Grated ripe tomato" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Vi blanc sec", en: "Dry white wine" },
        amount: 60,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Beguda d'avena o soja sense sucre", en: "Unsweetened oat or soy milk" },
        amount: 650,
        unit: { ca: "ml", en: "ml" },
        notes: { ca: "Per a la beixamel", en: "For the béchamel" },
      },
      {
        name: { ca: "Farina de blat o midó de blat de moro", en: "Wheat flour or cornstarch" },
        amount: 50,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Oli d'oliva verge extra", en: "Extra virgin olive oil" },
        amount: 50,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Nou moscada, sal i pebre negre", en: "Nutmeg, salt and black pepper" },
        notes: { ca: "Al gust", en: "To taste" },
      },
      {
        name: { ca: "Formatge vegetal ratllat per gratinar", en: "Plant-based grated cheese" },
        amount: 60,
        unit: { ca: "g", en: "g" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Hidrata la soja texturitzada fina en 300 ml de brou vegetal calent durant 15 minuts. Neteja els bolets i pica'ls a daus petits. Pica la ceba ben fina i pica els alls.",
          en: "Hydrate textured soy protein in 300 ml warm vegetable broth for 15 minutes. Clean and finely dice mushrooms, onion, and garlic.",
        },
        durationMinutes: 15,
        tip: {
          ca: "Escorre la soja prement-la suaument amb les mans perquè absorbeixi millor el sofregit.",
          en: "Squeeze excess liquid from rehydrated soy so it absorbs the flavors of the sofrito.",
        },
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Bull les plaques de canelons en una olla gran amb abundant aigua salada segons el temps del fabricant. Passa-les ràpidament per aigua freda per tallar la cocció i estira-les sobre draps de cotó nets sense que es toquin.",
          en: "Cook pasta sheets in boiling salted water according to package directions. Briefly dip in cold water to stop cooking and lay flat on clean cotton kitchen towels.",
        },
        durationMinutes: 12,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "En una paella fonda amb un bon raig d'oli d'oliva, cou la ceba a foc lent durant 10 minuts fins que quedi transparent i dolça. Afegeix els alls i els bolets picats, i salta 5 minuts fins que s'evapori l'aigua dels bolets. Afegeix la soja texturitzada escorreguda, el tomàquet ratllat i el vi blanc. Deixa reduir a foc suau fins a obtenir una farsa melosa i concentrada.",
          en: "In a wide skillet with olive oil, cook onion over low heat for 10 minutes until sweet and translucent. Add garlic and mushrooms; cook 5 minutes until liquid evaporates. Add drained soy, grated tomato, and white wine. Simmer until concentrated and rich.",
        },
        durationMinutes: 20,
        tip: {
          ca: "Pots afegir-hi una cullerada de paté vegetal d'anacards o bolets per donar un punt extra de cremositat.",
          en: "Stir in a spoonful of cashew cream or mushroom pâté for extra richness.",
        },
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Prepara la beixamel: escalfa l'oli d'oliva en un cassó a foc mitjà, afegeix la farina i remena amb varetes durant 2 minuts perquè es torri i perdi el gust de cru. Aboca la beguda vegetal tèbia a poc a poc sense parar de remenar amb varetes durant 7-8 minuts fins que espesseixi de manera uniforme. Afegeix nou moscada acabada de ratllar, sal i pebre negre.",
          en: "Make the béchamel: warm olive oil in a saucepan, whisk in flour for 2 minutes to cook out raw taste. Gradually pour in warm plant milk while whisking constantly for 7-8 minutes until thickened and silky. Season with freshly grated nutmeg, salt, and black pepper.",
        },
        durationMinutes: 10,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Unta el fons d'una safata de forn amb una capa fina de beixamel. Col·loca una cullerada generosa de farsa al centre de cada placa de caneló, enrotlla-les en forma de cilindre i disposa'ls arrenglerats amb la juntura cap avall a la safata.",
          en: "Coat the bottom of a baking dish with a thin layer of béchamel. Spoon filling onto each pasta sheet, roll tightly into cylinders, and arrange snugly side by side with seams facing down.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Cobreix tots els canelons amb la beixamel restant procurant que no quedi cap extrem descobert. Escampa el formatge vegetal ratllat per sobre i enforna a 200°C durant 18 minuts, acabant amb 5 minuts de gratinador fins que la crosta quedi daurada i bombollejant. Deixa reposar 5 minuts abans de servir.",
          en: "Pour remaining béchamel over all cannelloni ensuring full coverage. Scatter grated vegan cheese on top and bake at 200°C (390°F) for 18 minutes, finishing with 5 minutes under the broiler until golden and bubbly. Rest 5 minutes before serving.",
        },
        durationMinutes: 23,
      },
    ],
  },
  {
    id: "crema-catalana-vegetal",
    slug: "crema-catalana-vegetal-cremosa",
    title: {
      ca: "Crema Catalana Tradicional 100% Vegetal",
      en: "Plant-Based Crema Catalana",
    },
    description: {
      ca: "La reina de les postres catalanes en una textura vellutada exquisida, aromatitzada amb canó de canyella i pell de llimona, i coronada amb el característic caramel cruixent.",
      en: "The crown jewel of Catalan desserts with a velvety texture infused with cinnamon stick and lemon peel, topped with the signature caramelized sugar crust.",
    },
    category: "traditional",
    difficulty: "easy",
    cost: "1",
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    rating: 4.8,
    imageUrl: "/images/recipes/crema-catalana.jpg",
    tags: ["catalan", "traditional", "dessert", "cold", "all_year", "sweet", "gluten_free"],
    source: {
      name: "La Cuina Tradicional Catalana",
      author: "Jaume Fàbrega",
      url: "https://www.enciclopedia.cat",
    },
    featured: true,
    ingredients: [
      {
        name: { ca: "Beguda de soja bio sense sucre", en: "Organic unsweetened soy milk" },
        amount: 500,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Midó de blat de moro (Maizena)", en: "Cornstarch" },
        amount: 40,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Sucre de canya o morè", en: "Cane sugar" },
        amount: 80,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Canó de canyella", en: "Cinnamon stick" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Pell de llimona ecològica (només part groga)", en: "Organic lemon peel (yellow part only)" },
        amount: 1,
        unit: { ca: "tira", en: "strip" },
      },
      {
        name: { ca: "Cúrcuma en pols (per al color daurat natural)", en: "Ground turmeric (for natural color)" },
        notes: { ca: "Un polsim minúscul", en: "A tiny pinch" },
      },
      {
        name: { ca: "Sucre extra per cremar", en: "Extra sugar for torching" },
        amount: 4,
        unit: { ca: "cullerades", en: "tbsp" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Aparta mig got (uns 100 ml) de beguda de soja ben freda en un bol petit. Afegeix el midó de blat de moro i el polsim minúscul de cúrcuma. Bat enèrgicament amb una forquilla fins que no hi hagi cap grumoll.",
          en: "Set aside half a cup (around 100 ml) of cold soy milk in a small bowl. Whisk in cornstarch and tiny pinch of turmeric until silky and completely lump-free.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Aboca els 400 ml restants de beguda de soja en un cassó amb el sucre, el canó de canyella i la tira de pell de llimona. Escalfa a foc mitjà fins que comenci a bullir. Apaga el foc immediatament, tapa el cassó i deixa infusionar durant 15 minuts.",
          en: "Pour remaining 400 ml soy milk into a saucepan with sugar, cinnamon stick, and lemon peel. Bring to a simmer over medium heat. Remove from heat, cover, and let infuse for 15 minutes.",
        },
        durationMinutes: 15,
        tip: {
          ca: "Retira completament la part blanca de la pell de la llimona per evitar cap amargor a la crema.",
          en: "Ensure no white pith remains on the lemon peel to prevent bitterness in the custard.",
        },
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Retira el canó de canyella i la pell de llimona del cassó amb una escumadora o cola la llet. Torna a remenar la barreja de midó dissolt fred per assegurar que no hagi decantat al fons i aboca-la al cassó remenant amb varetes.",
          en: "Discard cinnamon stick and lemon peel using a slotted spoon or strainer. Give the cold starch slurry a quick stir and pour it into the warm infused milk while whisking.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Posa el cassó a foc molt suau. Remena constantment amb varetes fent cercles i tocant el fons del cassó durant 7-8 minuts fins que espesseixi amb una textura vellutada, brillant i densa de natilla tradicional.",
          en: "Place saucepan over low heat. Whisk continuously across the bottom and sides for 7-8 minutes until thick, glossy, and custardy.",
        },
        durationMinutes: 8,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Reparteix la crema calenta en cassoletes tradicionals de fang o vidre. Deixa refredar a temperatura ambient durant 20 minuts i després refrigera un mínim de 3 hores. Just abans de servir, escampa una cullerada de sucre per sobre de cada cassoleta i crema'l amb un bufador de cuina fins a formar una crosta de vidre daurada.",
          en: "Divide hot custard into traditional earthenware ramekins. Cool for 20 minutes at room temperature, then chill in fridge for at least 3 hours. Before serving, sprinkle sugar on top and caramelize with a kitchen torch until crisp and golden.",
        },
        durationMinutes: 5,
      },
    ],
  },
  {
    id: "pancakes-flonjos",
    slug: "pancakes-flonjos-de-civada-i-vainilla",
    title: {
      ca: "Pancakes Flonjos de Civada i Vainilla",
      en: "Fluffy Vanilla Oat Pancakes",
    },
    description: {
      ca: "Tortitas esponjoses i daurades sense cap ingredient animal. Perfectes per a esmorzars de diumenge acompanyades de fruita fresca i xarop d'auró pur.",
      en: "Golden, cloud-soft plant-based pancakes without eggs or dairy. Ideal for weekend brunch with fresh berries and pure maple syrup.",
    },
    category: "baking",
    difficulty: "easy",
    cost: "1",
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    servings: 4,
    rating: 4.7,
    imageUrl: "/images/recipes/pancakes-flonjos.jpg",
    tags: ["breakfast", "brunch", "baking", "sweet", "quick", "hot", "all_year"],
    source: {
      name: "Nora Cooks - Fluffy Vegan Pancakes",
      author: "Nora Taylor",
      url: "https://www.noracooks.com/vegan-pancakes",
    },
    featured: true,
    ingredients: [
      {
        name: { ca: "Farina de blat o civada fina", en: "Wheat or oat flour" },
        amount: 200,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Llevat químic en pols (impulsor)", en: "Baking powder" },
        amount: 10,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Beguda vegetal (soja, civada o ametlla)", en: "Plant milk (soy, oat, or almond)" },
        amount: 260,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Vinagre de poma o suc de llimona", en: "Apple cider vinegar or lemon juice" },
        amount: 1,
        unit: { ca: "culleradeta", en: "tsp" },
        notes: { ca: "Reacciona amb el llevat per a màxima esponjositat", en: "Creates buttermilk effect for maximum fluffiness" },
      },
      {
        name: { ca: "Oli d'oliva verge suau o coco fos", en: "Melted coconut oil or light olive oil" },
        amount: 25,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Xarop d'auró o sucre morè", en: "Maple syrup or brown sugar" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Extracte pur de vainilla", en: "Pure vanilla extract" },
        amount: 1,
        unit: { ca: "culleradeta", en: "tsp" },
      },
      {
        name: { ca: "Polsim de sal marina", en: "Pinch of sea salt" },
        notes: { ca: "Realça la dolçor", en: "Enhances sweetness" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "En un bol mitjà, barreja la beguda vegetal amb el vinagre de poma o suc de llimona. Deixa reposar durant 5 minuts sense tocar perquè es talli lleugerament i creï l'efecte 'buttermilk' vegetal que aportarà elasticitat i volum.",
          en: "In a bowl, combine plant milk with apple cider vinegar. Let rest 5 minutes undisturbed to curdle into vegan buttermilk for airy texture.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Afegeix l'oli vegetal fos, el xarop d'auró i l'extracte pur de vainilla al bol dels líquids tallats. Barreja amb unes varetes suaus durant 1 minut.",
          en: "Whisk melted oil, maple syrup, and vanilla extract into the curdled milk until combined.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "En un bol gran a part, tamisa la farina amb el llevat químic i el polsim de sal. Aboca la barreja de líquids sobre els secs i remena suaument amb una espàtula només fins que s'integrin (és clau no batre en excés; si queden petits grumolls la textura serà molt més flonja).",
          en: "In a large bowl, sift flour, baking powder, and pinch of salt. Pour liquids over dry ingredients and gently fold with a spatula until just combined (leave minor lumps; do not overmix).",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Deixa reposar la massa durant 4 minuts a temperatura ambient. Veuràs com el llevat comença a crear petites bombolles d'aire a la superfície de la massa.",
          en: "Let batter rest for 4 minutes at room temperature so the baking powder activates and forms fine air bubbles.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Escalfa una paella antiadherent a foc mitjà-baix amb un parell de gotes d'oli. Aboca porcions d'1/4 de tassa per pancake. Cuina durant 2-3 minuts fins que apareguin bombolles a la superfície i les vores quedin seques. Gira amb una espàtula i daura l'altre costat durant 1-2 minuts. Serveix apilats amb fruita fresca i xarop d'auró.",
          en: "Warm a non-stick skillet over medium-low heat with a brush of oil. Ladle 1/4 cup batter per pancake. Cook 2-3 minutes until surface bubbles burst and edges look dry. Flip and cook 1-2 minutes until golden. Serve stacked with fruit and maple syrup.",
        },
        durationMinutes: 15,
      },
    ],
  },
  {
    id: "fricando-de-seitan",
    slug: "fricando-classic-de-seitan-amb-moixerons",
    title: {
      ca: "Fricandó Clàssic de Seitan amb Moixerons",
      en: "Classic Seitan Fricandó with Moixerons",
    },
    description: {
      ca: "Guisat tradicional català de diumenge: talls fins de seitan enfarinats i daurats, banyats en un sofregit intens amb vi ranci, bolets moixerons i picada d'ametlles i carquinyolis.",
      en: "Beloved traditional Catalan Sunday braise: tender sliced seitan seared and simmered in an aromatic sofrito with dried moixerons wild mushrooms and a toasted almond picada.",
    },
    category: "traditional",
    difficulty: "medium",
    cost: "2",
    prepTimeMinutes: 30,
    cookTimeMinutes: 50,
    servings: 4,
    rating: 4.9,
    imageUrl: "/images/recipes/fricando-de-seitan.jpg",
    tags: ["catalan", "traditional", "seitan", "stew", "protein", "hot", "autumn_winter", "main"],
    source: {
      name: "Corpus del Patrimoni Culinari Català (Adaptació vegetal)",
      author: "Tradició Catalana",
      url: "https://cuinacatalana.eu",
    },
    featured: false,
    ingredients: [
      {
        name: { ca: "Seitan natural laminat fi (5 mm)", en: "Natural seitan, thinly sliced (5 mm)" },
        amount: 450,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Moixerons o ceps deshidratats", en: "Dried moixerons or porcini mushrooms" },
        amount: 25,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Cebes de Figueres picades fines", en: "Sweet onions, finely minced" },
        amount: 2,
        unit: { ca: "unitats", en: "pieces" },
      },
      {
        name: { ca: "Tomàquets madurs ratllats", en: "Grated ripe tomatoes" },
        amount: 2,
        unit: { ca: "unitats", en: "pieces" },
      },
      {
        name: { ca: "Vi ranci o vi blanc sec", en: "Rancio or dry white wine" },
        amount: 80,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Brou vegetal casolà", en: "Rich vegetable broth" },
        amount: 450,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Ametlles torrades (per a la picada)", en: "Toasted almonds (for picada)" },
        amount: 15,
        unit: { ca: "unitats", en: "pieces" },
      },
      {
        name: { ca: "All, julivert i un trosset de carquinyoli", en: "Garlic, parsley and a piece of carquinyoli" },
        notes: { ca: "Per a la picada", en: "For the picada thickening paste" },
      },
      {
        name: { ca: "Farina de blat per enfarinar el seitan", en: "Flour for dusting" },
        amount: 30,
        unit: { ca: "g", en: "g" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Posa els moixerons deshidratats en un bol amb 300 ml d'aigua tèbia durant 20 minuts. Passa l'aigua del remull per un colador fi amb paper de cuina per eliminar restes de terra i reserva aquest brou aromàtic per al guisat.",
          en: "Soak dried mushrooms in 300 ml warm water for 20 minutes. Strain and reserve the fragrant soaking liquid through a fine sieve to discard grit.",
        },
        durationMinutes: 20,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Enfarina lleugerament els talls fins de seitan i espolsa l'excés de farina. Escalfa 4 cullerades d'oli d'oliva verge extra en una cassola de fang o fosa de ferro i daura el seitan volta i volta (1-2 minuts per costat). Retira'l i reserva'l en un plat.",
          en: "Lightly dust seitan slices in flour, shake off excess, and flash-sear in olive oil in a wide pot for 1-2 minutes per side until lightly golden. Set aside on a plate.",
        },
        durationMinutes: 8,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "A la mateixa cassola a foc suau, afegeix la ceba de Figueres picada amb un pessic de sal. Deixa confitar lentament durant 20 minuts, remenant sovint, fins que quedi fosca, caramel·litzada i molt reduïda.",
          en: "In the same pan over low heat, cook minced sweet onions with a pinch of salt for 20 minutes until deeply caramelized and rich amber.",
        },
        durationMinutes: 20,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Afegeix els tomàquets ratllats a la ceba confitada i cou durant 4 minuts fins que s'evapori l'aigua. Aboca el vi ranci o blanc sec i raspa el fons de la cassola amb cullera de fusta per desglasar els sucs. Deixa evaporar l'alcohol durant 3 minuts.",
          en: "Stir in grated ripe tomatoes and cook 4 minutes until reduced. Pour in wine and scrape browned bits from bottom of pan. Simmer 3 minutes to cook off alcohol.",
        },
        durationMinutes: 7,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Retorna el seitan daurat a la cassola, afegeix els moixerons hidratats, l'aigua del seu remull colada i el brou vegetal calent. Tapa la cassola i deixa fer xup-xup a foc lent durant 15 minuts perquè el seitan quedi tendre i s'impregni del guisat.",
          en: "Return seitan to pan with drained mushrooms, mushroom broth, and hot vegetable stock. Cover and simmer gently for 15 minutes so the seitan absorbs all flavors.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Prepara la picada: pica al morter les ametlles torrades, el gra d'all, el julivert fresc i el trosset de carquinyoli fins a fer una pasta fina. Desfés-la amb un cullerot de salsa calenta de la cassola, incorpora-la al guisat i remena. Cou destapat 10 minuts més fins que la salsa quedi brillant i vellutada.",
          en: "Make the picada: pound toasted almonds, garlic, fresh parsley, and carquinyoli in a mortar into a paste. Dilute with a ladle of hot braising liquid, stir into the pot, and simmer uncovered for 10 minutes until sauce is glossy and thick.",
        },
        durationMinutes: 10,
        tip: {
          ca: "Com tots els guisats tradicionals catalans, el fricandó millora notablement si reposa unes hores o d'un dia per l'altre.",
          en: "Like all Catalan braised dishes, fricandó is even more delicious made a day in advance.",
        },
      },
    ],
  },
  {
    id: "tofu-scramble-aromatic",
    slug: "tofu-scramble-aromatic-amb-tomates",
    title: {
      ca: "Remenat Aromàtic de Tofu i Tomàquets",
      en: "Aromatic Tofu Scramble with Cherry Tomatoes",
    },
    description: {
      ca: "L'esmorzar proteic estrella: tofu ferm amanit amb cúrcuma, sal negra Kala Namak (per a l'aroma d'ou característic), llevat nutricional i tomàquets cirerols caramel·litzats.",
      en: "The ultimate protein breakfast: seasoned firm tofu with golden turmeric, Kala Namak black salt (for that signature egg aroma), nutritional yeast, and sweet cherry tomatoes.",
    },
    category: "quick",
    difficulty: "easy",
    cost: "1",
    prepTimeMinutes: 12,
    cookTimeMinutes: 10,
    servings: 2,
    rating: 4.6,
    imageUrl: "/images/recipes/tofu-scramble.jpg",
    tags: ["breakfast", "high_protein", "tofu", "quick", "gluten_free", "hot", "all_year"],
    source: {
      name: "Rainbow Plant Life - The Best Tofu Scramble",
      author: "Nisha Vora",
      url: "https://rainbowplantlife.com/tofu-scramble",
    },
    featured: false,
    ingredients: [
      {
        name: { ca: "Tofu ferm natural esmicolat a mà", en: "Firm natural tofu, crumbled" },
        amount: 250,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Cúrcuma en pols", en: "Ground turmeric" },
        amount: 0.5,
        unit: { ca: "culleradeta", en: "tsp" },
      },
      {
        name: { ca: "Sal negra de l'Himàlaia (Kala Namak)", en: "Kala Namak black salt" },
        amount: 0.5,
        unit: { ca: "culleradeta", en: "tsp" },
        notes: { ca: "Aporta el gust sulfurós tradicional d'ou", en: "Imparts authentic eggy aroma" },
      },
      {
        name: { ca: "Llevat nutricional", en: "Nutritional yeast" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Beguda vegetal sense sucre", en: "Unsweetened plant milk" },
        amount: 50,
        unit: { ca: "ml", en: "ml" },
        notes: { ca: "Per a una textura humida i cremosa", en: "For moist and creamy texture" },
      },
      {
        name: { ca: "Tomàquets cirerols partits per la meitat", en: "Cherry tomatoes, halved" },
        amount: 8,
        unit: { ca: "unitats", en: "pieces" },
      },
      {
        name: { ca: "Cibulet o julivert fresc picat", en: "Fresh chives or parsley, minced" },
        notes: { ca: "Per decorar", en: "For garnish" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Embolica el bloc de tofu en paper de cuina o un drap net i prem-lo suaument per extreure l'excés d'aigua superficial. Esmicola'l amb les mans en trossos irregulars deixant trossos de la mida d'una nou i d'altres més fins per imitar la textura d'uns ous remenats.",
          en: "Wrap tofu block in clean kitchen towel and gently press out surface moisture. Crumble by hand into rustic chunks (leave some bite-sized curds for realistic scramble texture).",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "En un bol petit, barreja la cúrcuma, el llevat nutricional, un polsim d'all en pols i la beguda vegetal fins a formar una emulsió líquida groguenca i aromàtica.",
          en: "In a small bowl, whisk turmeric, nutritional yeast, a pinch of garlic powder, and plant milk into a smooth golden slurry.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Escalfa una paella amb una cullerada d'oli d'oliva verge a foc viu. Afegeix els tomàquets cirerols amb la part tallada cap avall i salta durant 2-3 minuts fins que la pell es comenci a arrugar i daurar lleugerament.",
          en: "Heat olive oil in a skillet over high heat. Add cherry tomatoes cut side down and sear for 2-3 minutes until charred and blistered.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Afegeix el tofu esmicolat a la paella amb els tomàquets i aboca-hi per sobre l'emulsió de cúrcuma i llevat. Salta a foc mitjà durant 4-5 minuts remenant suaument amb una espàtula fins que el líquid es redueixi i el tofu quedi brillant, daurat i sucós.",
          en: "Add crumbled tofu to the pan and pour the golden turmeric-yeast slurry over top. Sauté over medium heat for 4-5 minutes until liquid reduces and curds are glossy, yellow, and moist.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Apaga el foc immediatament. Afegeix la sal negra Kala Namak (posar-la fora del foc evita que el compost de sofre s'evapori i manté l'aroma autèntic d'ou) i el cibulet fresc picat. Serveix de seguida sobre llesques de pa de massa mare torrat.",
          en: "Remove pan from heat. Stir in Kala Namak black salt (adding off-heat preserves volatile eggy aroma) and fresh chives. Serve immediately over toasted sourdough bread.",
        },
        durationMinutes: 6,
        tip: {
          ca: "Si t'agrada una textura encara més cremosa, incorpora una cullerada de iogurt vegetal natural sense sucre just en apagar el foc.",
          en: "Stir in a spoonful of unsweetened plain plant yogurt off the heat for an ultra-velvety scramble.",
        },
      },
    ],
  },
  {
    id: "formatge-curat-anacards",
    slug: "formatge-vega-curat-danacards-i-herbes",
    title: {
      ca: "Formatge Vegà Artesà d'Anacards i Herbes",
      en: "Artisan Cashew Cheese with Provencal Herbs",
    },
    description: {
      ca: "Roda de formatge vegetal fermentat amb probiòtics o miso blanc, textura ferma i tallable, recobert d'herbes aromàtiques provençals i pebre.",
      en: "Artisan fermented nut cheese made from cultured cashews and white miso, firm and sliceable, coated in fragrant Mediterranean herbs.",
    },
    category: "basics",
    difficulty: "medium",
    cost: "2",
    prepTimeMinutes: 25,
    cookTimeMinutes: 10,
    servings: 6,
    rating: 4.8,
    imageUrl: "/images/recipes/formatge-anacards.jpg",
    tags: ["cheese", "basics", "fermented", "cashew", "appetizer", "gluten_free", "cold", "all_year"],
    source: {
      name: "Artisan Vegan Cheese",
      author: "Miyoko Schinner",
      url: "https://miyokos.com",
    },
    featured: false,
    ingredients: [
      {
        name: { ca: "Anacards crus (remullats mínim 4 hores)", en: "Raw cashews (soaked at least 4 hours)" },
        amount: 200,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Llevat nutricional en flocs", en: "Nutritional yeast flakes" },
        amount: 3,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Miso blanc (shirō miso) o càpsula de probiòtics", en: "White miso or vegan probiotic capsule" },
        amount: 1,
        unit: { ca: "culleradeta", en: "tsp" },
        notes: { ca: "Aporta fermentació i profunditat umami", en: "Provides fermentation and umami depth" },
      },
      {
        name: { ca: "Suc de llimona acabat d'esprémer", en: "Fresh lemon juice" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "All en pols i ceba en pols", en: "Garlic and onion powder" },
        amount: 0.5,
        unit: { ca: "culleradeta", en: "tsp" },
      },
      {
        name: { ca: "Oli de coco refinat desodoritzat (fos)", en: "Refined melted coconut oil" },
        amount: 3,
        unit: { ca: "cullerades", en: "tbsp" },
        notes: { ca: "Dóna fermesa en refredar", en: "Provides firm cuttable structure" },
      },
      {
        name: { ca: "Agar-agar en pols", en: "Agar-agar powder" },
        amount: 1.5,
        unit: { ca: "culleradetes", en: "tsp" },
      },
      {
        name: { ca: "Aigua filtrada", en: "Filtered water" },
        amount: 120,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Herbes provençals seques (farigola, romaní, orenga)", en: "Dried Provencal herbs" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
        notes: { ca: "Per a la cobertura exterior", en: "For outer coating" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Escorre completament els anacards crus que han estat en remull durant almenys 4 hores i esbandeix-los amb aigua freda filtrada.",
          en: "Drain pre-soaked raw cashews (soaked at least 4 hours) and rinse thoroughly with cold filtered water.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Posa els anacards a una batedora de got d'alta potència amb el suc de llimona, el llevat nutricional, el miso blanc, l'all i ceba en pols, l'oli de coco refinat fos i mitja culleradeta de sal. Tritura durant 4-5 minuts baixant els laterals fins a aconseguir una crema espessa i completament sedosa, sense cap granet.",
          en: "Place cashews in high-speed blender with lemon juice, nutritional yeast, white miso, garlic and onion powder, melted coconut oil, and salt. Blend 4-5 minutes until completely smooth and velvety.",
        },
        durationMinutes: 8,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "En un cassó petit, dissol l'agar-agar en pols amb els 120 ml d'aigua filtrada. Porta a ebullició suau a foc mitjà i cou durant 3 minuts sense parar de remenar amb varetes perquè l'agar-agar s'activi correctament.",
          en: "In a small saucepan, whisk agar-agar powder with 120 ml filtered water. Simmer gently over medium heat for 3 minutes, whisking constantly to fully activate the gelling power.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Aboca immediatament la dissolució calenta d'agar-agar a la batedora amb la crema d'anacards. Tritura a velocitat màxima durant 45 segons per homogeneïtzar i aboca ràpidament la mescla en un motlle rodó o cassoleta folrada amb paper vegetal abans que comenci a quallar.",
          en: "Quickly pour the boiling agar mixture into the blender with the cashew cream. Blend on high for 45 seconds to emulsify, then immediately pour into a parchment-lined round ramekin before it sets.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Deixa refredar a temperatura ambient durant 20 minuts i després refrigera un mínim de 4 hores (o tota la nit). Desmotlla amb compte, passa la roda de formatge pel plat amb les herbes provençals seques i pebre negre mòlt cobrint tota la vora i la superfície.",
          en: "Let cool 20 minutes at room temperature, then chill in fridge for at least 4 hours (or overnight) until firm and set. Gently unmold and roll the cheese wheel in dried Provencal herbs and black pepper to coat.",
        },
        durationMinutes: 14,
        tip: {
          ca: "Si deixes reposar el formatge a la nevera durant 2 o 3 dies destapat sobre una reixeta, desenvoluparà una crosta exterior més autèntica i un gust curat més intens.",
          en: "Aging the cheese in the fridge on a wire rack for 2-3 days develops an authentic rind and deeper cultured flavor.",
        },
      },
    ],
  },
  {
    id: "pad-thai-tofu",
    slug: "pad-thai-tradicional-amb-tofu-cruixent",
    title: {
      ca: "Pad Thai Tradicional amb Tofu Cruixent i Cacauets",
      en: "Authentic Pad Thai with Crispy Tofu & Peanuts",
    },
    description: {
      ca: "El gran clàssic del carrer de Bangkok en clau 100% vegetal: fideus plans d'arròs saltats al wok amb daus de tofu daurats, brots de soja cruixents, cacauets torrats i la genuïna salsa de tamarinde agredolça (sense salsa de peix).",
      en: "The Bangkok street-food masterpiece made entirely plant-based: wok-tossed rice noodles with crispy golden tofu, crunchy bean sprouts, roasted peanuts, and authentic tangy-sweet tamarind sauce (no fish sauce).",
    },
    category: "traditional",
    difficulty: "medium",
    cost: "2",
    prepTimeMinutes: 30,
    cookTimeMinutes: 15,
    servings: 4,
    rating: 4.7,
    imageUrl: "/images/recipes/pad-thai-tofu.jpg",
    tags: ["thai", "wok", "noodles", "tofu", "protein", "quick", "hot", "all_year", "main"],
    source: {
      name: "Hot Thai Kitchen - Authentic Vegan Pad Thai",
      author: "Pailin Chongchitnant",
      url: "https://hot-thai-kitchen.com/vegan-pad-thai",
    },
    featured: true,
    spicy: false,
    ingredients: [
      {
        name: { ca: "Fideus plans d'arròs per a Pad Thai", en: "Flat rice Pad Thai noodles" },
        amount: 250,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Tofu extra-ferm premsat i tallat a daus", en: "Extra-firm tofu, pressed and cubed" },
        amount: 250,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Pasta concentrada de tamarinde", en: "Tamarind paste concentrate" },
        amount: 3,
        unit: { ca: "cullerades", en: "tbsp" },
        notes: { ca: "Clau per a l'acidesa autèntica", en: "Essential for authentic tanginess" },
      },
      {
        name: { ca: "Salsa de soja o tamari", en: "Soy sauce or tamari" },
        amount: 3,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Sucre de coco o sucre morè", en: "Coconut sugar or brown sugar" },
        amount: 2.5,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Brots de soja frescos", en: "Fresh bean sprouts" },
        amount: 150,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Cebetes tendres o cibulet xinès tallat", en: "Scallions or garlic chives, cut in batons" },
        amount: 4,
        unit: { ca: "unitats", en: "stalks" },
      },
      {
        name: { ca: "Cacauets torrats sense sal picats", en: "Crushed roasted unsalted peanuts" },
        amount: 50,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Galls de llima fresca", en: "Fresh lime wedges" },
        amount: 2,
        unit: { ca: "unitats", en: "pieces" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Posa els fideus plans d'arròs en remull en un bol gran amb aigua tèbia durant 20 minuts fins que quedin flexibles però encara ferms al tacte (al dente). Escorre'ls molt bé en un colador (mai els bullis prèviament, ja que es desfarien al wok).",
          en: "Soak flat rice noodles in warm water for 20 minutes until pliable but still slightly firm to the bite. Drain thoroughly (never boil them or they will become mushy in the wok).",
        },
        durationMinutes: 20,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Premsa el bloc de tofu amb paper absorbent i talla'l a daus regulars d'1,5 cm. Escalfa 2 cullerades d'oli en un wok a foc viu i fregeix els daus de tofu durant 6-8 minuts remenant fins que tinguin una crosta ben daurada i cruixent per totes les cares. Retira'ls a un plat amb paper absorbent.",
          en: "Press tofu block with kitchen towels and cut into 1.5 cm cubes. Heat 2 tbsp oil in a wok over high heat and fry tofu for 6-8 minutes until golden and crispy on all sides. Set aside on a paper towel.",
        },
        durationMinutes: 8,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "En un bol petit, prepara la salsa característica barrejant la pasta de tamarinde, la salsa de soja (o tamari), el sucre de coco i 2 cullerades d'aigua. Remena bé amb una cullera fins que el sucre quedi totalment dissolt. Ha de tenir un equilibri vibrant entre àcid, dolç i salat.",
          en: "In a small bowl, whisk tamarind paste, soy sauce (or tamari), coconut sugar, and 2 tbsp water until completely dissolved into a balanced sweet, tangy, and savory sauce.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Amb el wok molt calent a foc viu amb un fil d'oli, afegeix all picat o escalunyes i salta durant 1-2 minuts sense deixar que es cremi.",
          en: "In the hot wok with a touch of oil, toss minced garlic and shallots for 1-2 minutes until fragrant.",
        },
        durationMinutes: 2,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Afegeix els fideus d'arròs escorreguts al wok roent i aboca immediatament la salsa de tamarinde per sobre. Salta enèrgicament amb dues espàtules durant 3-4 minuts perquè els fideus absorbeixin la salsa i adquireixin el color ambre tradicional.",
          en: "Add drained rice noodles and pour tamarind sauce over them. Toss vigorously with spatulas over high heat for 3-4 minutes until noodles soften, curl, and absorb the amber sauce.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Incorpora els daus de tofu cruixent, la meitat dels brots de soja i les cebetes tendres tallades a bastonets. Salta durant 1-2 minuts més fins que les verdures perdin la rigidesa però mantinguin el cruixent. Serveix immediatament coronat amb els cacauets torrats picats, la resta de brots frescos i galls de llima fresca.",
          en: "Toss in crispy tofu cubes, half of the bean sprouts, and scallion batons. Stir-fry for 1-2 minutes until just tender-crisp. Serve hot topped with crushed roasted peanuts, remaining fresh sprouts, and lime wedges.",
        },
        durationMinutes: 5,
      },
    ],
  },
  {
    id: "curry-vermell-thai",
    slug: "curry-vermell-thai-amb-tofu-i-verdures",
    title: {
      ca: "Curry Vermell Tailandès de Tofu i Verdures de Temporada",
      en: "Thai Red Curry with Tofu & Seasonal Vegetables",
    },
    description: {
      ca: "Curry aromàtic i reconfortant preparat amb pasta de curry vermell autèntica, llet de coco cremosa, daus de tofu daurats, albergínia, pebrots i fulles fresques d'alfàbrega tailandesa.",
      en: "Fragrant and comforting Thai curry made with authentic red curry paste, rich coconut milk, golden tofu, bell peppers, eggplant, and fresh Thai basil.",
    },
    category: "quick",
    difficulty: "easy",
    cost: "2",
    prepTimeMinutes: 25,
    cookTimeMinutes: 20,
    servings: 4,
    rating: 4.8,
    imageUrl: "/images/recipes/curry-vermell-thai.jpg",
    tags: ["thai", "curry", "tofu", "coconut", "gluten_free", "spicy", "hot", "all_year", "main", "one_pot"],
    source: {
      name: "Minimalist Baker - 1-Pot Red Thai Curry",
      author: "Dana Shultz",
      url: "https://minimalistbaker.com/1-pot-red-lentil-curry",
    },
    featured: false,
    spicy: true,
    ingredients: [
      {
        name: { ca: "Pasta de curry vermell tailandesa (sense pasta de gamba)", en: "Vegan Thai red curry paste (no shrimp paste)" },
        amount: 3,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Llet de coco sencera en llauna", en: "Full-fat canned coconut milk" },
        amount: 400,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Tofu ferm tallat a daus", en: "Firm tofu, cubed" },
        amount: 300,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Albergínia tallada a daus", en: "Eggplant, diced" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Pebrot vermell a tires fines", en: "Red bell pepper, sliced" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Fulles de llima kaffir", en: "Kaffir lime leaves" },
        amount: 3,
        unit: { ca: "unitats", en: "leaves" },
      },
      {
        name: { ca: "Salsa de soja o tamari", en: "Tamari or soy sauce" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Alfàbrega tailandesa fresca", en: "Fresh Thai basil leaves" },
        amount: 1,
        unit: { ca: "manat", en: "handful" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Talla el tofu ferm a daus d'1,5 cm i eixuga'l amb paper absorbent. Talla l'albergínia a daus regulars i el pebrot vermell a tires fines. Trenca les fulles de llima kaffir retirant el nervi central per alliberar els seus olis essencials.",
          en: "Cut firm tofu into 1.5 cm cubes and pat dry. Dice eggplant and slice red bell pepper. Tear kaffir lime leaves along central stem to release fragrant oils.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Obre la llauna de llet de coco sense sacsejar i recull 4 cullerades de la capa superior més densa (crema de coco). Posa-la en una cassola fonda a foc mitjà durant 3-4 minuts fins que comenci a bombollejar i es vegi com es trenca i allibera l'oli vegetal natural.",
          en: "Spoon 4 tbsp thick coconut cream from top of canned milk into a deep pot. Cook over medium heat for 3-4 minutes until oil begins to separate.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Afegeix la pasta de curry vermell a la crema de coco desfeta i sofregeix a foc mitjà durant 3 minuts, prement amb cullera de fusta fins que adquireixi una brillantor vermella intensa i desprengui una aroma especiada irresistible.",
          en: "Add red curry paste to split coconut cream and fry for 3 minutes until deeply aromatic and oil bubbles red.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Afegeix els daus de tofu, l'albergínia i el pebrot vermell a la cassola. Remena suaument durant 5 minuts perquè les verdures s'impregnin completament de la pasta de curry sofregida.",
          en: "Add tofu, eggplant, and bell pepper to pot. Toss gently for 5 minutes to coat with the red curry paste.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Aboca la resta de la llet de coco de la llauna, 150 ml de brou vegetal calent, les fulles de llima kaffir i la salsa de soja (o tamari). Porta a ebullició suau, tapa parcialment i deixa coure a foc mitjà-lent durant 15 minuts fins que l'albergínia estigui tendra i melosa.",
          en: "Pour in remaining coconut milk, 150 ml warm vegetable broth, kaffir lime leaves, and soy sauce. Simmer gently with lid ajar for 15 minutes until eggplant is tender.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Apaga el foc. Afegeix les fulles d'alfàbrega tailandesa fresca i remena perquè s'estovin amb l'escalfor residual sense perdre el seu color verd viu ni l'aroma anisada. Serveix el curry ben calent acompanyat d'arròs gessamí cuit al vapor.",
          en: "Turn off heat. Fold in fresh Thai basil leaves so they wilt gently in residual heat. Serve hot with steamed jasmine rice.",
        },
        durationMinutes: 3,
      },
    ],
  },
  {
    id: "chili-sin-carne",
    slug: "chili-sin-carne-amb-fesols-negres-xocolata",
    title: {
      ca: "Chili Sin Carne amb Fesols Negres i Xocolata Negra",
      en: "Hearty Black Bean Chili with Dark Chocolate",
    },
    description: {
      ca: "Guisat dens, fumat i reconfortant: fesols negres, soja texturitzada gruixuda, pebrots, comí torrat, xili i un toc final de xocolata negra 85% que aporta profunditat i brillantor a la salsa.",
      en: "Rich, smoky comfort food: black beans, textured soy, bell peppers, roasted cumin, and a square of 85% dark chocolate for incredible depth and glossy texture.",
    },
    category: "traditional",
    difficulty: "easy",
    cost: "1",
    prepTimeMinutes: 20,
    cookTimeMinutes: 40,
    servings: 4,
    rating: 4.8,
    imageUrl: "/images/recipes/chili-sin-carne.jpg",
    tags: ["mexican", "stew", "beans", "protein", "comfort_food", "gluten_free", "spicy", "hot", "autumn_winter", "main", "one_pot"],
    source: {
      name: "Serious Eats - The Best Vegan Chili",
      author: "J. Kenji López-Alt",
      url: "https://www.seriouseats.com/best-vegan-chili-recipe",
    },
    featured: false,
    ingredients: [
      {
        name: { ca: "Fesols negres o vermells cuits", en: "Cooked black or kidney beans" },
        amount: 400,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Soja texturitzada gruixuda (hidratada en brou)", en: "Coarse textured soy (hydrated in broth)" },
        amount: 100,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Tomàquet triturat natural en conserva", en: "Crushed canned tomatoes" },
        amount: 400,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Pebrot vermell gran picat", en: "Large red bell pepper, diced" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Ceba gran picada", en: "Large onion, diced" },
        amount: 1,
        unit: { ca: "unitat", en: "piece" },
      },
      {
        name: { ca: "Pebre vermell fumat de la Vera", en: "Smoked paprika" },
        amount: 1.5,
        unit: { ca: "culleradetes", en: "tsp" },
      },
      {
        name: { ca: "Xocolata negra pura (mínim 85%)", en: "Dark chocolate (85%+ cacao)" },
        amount: 20,
        unit: { ca: "g", en: "g" },
        notes: { ca: "Secret per arrodonir els sabors i donar brillantor", en: "Secret ingredient for deep savoriness" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Posa la soja texturitzada gruixuda en un bol amb 250 ml de brou vegetal calent, una cullerada de salsa de soja i mitja culleradeta de pebre vermell fumat durant 12 minuts. Escorre prement amb les mans per treure l'excés de líquid.",
          en: "Hydrate textured soy in 250 ml hot broth seasoned with 1 tbsp soy sauce and smoked paprika for 12 minutes. Drain and squeeze excess moisture.",
        },
        durationMinutes: 12,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Pica la ceba i el pebrot vermell a daus mitjans. Escalfa dues cullerades d'oli d'oliva en una olla ampla i sofregeix la ceba i el pebrot durant 10 minuts a foc mitjà fins que estiguin tous i lleugerament daurats.",
          en: "Dice onion and bell pepper. Heat olive oil in a large pot and sauté onion and pepper for 10 minutes over medium heat until softened.",
        },
        durationMinutes: 10,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Afegeix la soja texturitzada hidratada a l'olla. Incorpora el comí mòlt, el pebre vermell fumat de la Vera i un pessic de bitxo o caiena. Remena i torra les espècies durant 4-5 minuts perquè la soja agafi un toc fumat.",
          en: "Add rehydrated soy to the pot. Stir in ground cumin, smoked paprika, and chili. Toast together for 4-5 minutes to impart deep smoky aroma.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Aboca el tomàquet triturat natural, els fesols negres cuits i 200 ml de brou vegetal. Remena bé rascant el fons de l'olla per aprofitar tots els sabors caramel·litzats.",
          en: "Pour in crushed tomatoes, black beans, and 200 ml vegetable broth. Stir thoroughly, scraping browned bits from the bottom.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Fes arrencar el bull, abaixa el foc al mínim, tapa l'olla parcialment i deixa coure a foc lent durant 25 minuts remenant de tant en tant perquè el guisat s'espesseixi i els sabors es fusionin.",
          en: "Bring to a simmer, lower heat, cover partially, and cook gently for 25 minutes, stirring occasionally, until chili is thick and hearty.",
        },
        durationMinutes: 25,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Apaga el foc. Afegeix l'onça de xocolata negra 85% i remena fins que es fongui completament (aporta una textura setinada i equilibra l'acidesa del tomàquet). Serveix calent acompanyat de coriandre fresc picat i grills de llima.",
          en: "Turn off heat. Stir in dark chocolate until fully melted and glossy. Serve hot garnished with fresh cilantro and lime wedges.",
        },
        durationMinutes: 3,
      },
    ],
  },
  {
    id: "dahl-llenties-vermelles",
    slug: "dahl-cremos-llenties-vermelles-curcuma",
    title: {
      ca: "Dahl Cremós de Llenties Vermelles, Cúrcuma i Gingebre",
      en: "Creamy Golden Red Lentil Dahl with Turmeric & Ginger",
    },
    description: {
      ca: "Plat tradicional de la cuina índia, nutritiu i naturalment 100% vegetal: llenties vermelles partides que es desfan creant una crema sedosa amb llet de coco, cúrcuma daurada, gingebre fresc i sofregit tarka de comí.",
      en: "A deeply nourishing and naturally plant-based Indian home classic: tender split red lentils simmered into a velvety stew with creamy coconut, golden turmeric, fresh ginger, and a sizzling cumin tarka.",
    },
    category: "quick",
    difficulty: "easy",
    cost: "1",
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servings: 4,
    rating: 4.9,
    imageUrl: "/images/recipes/dahl-llenties.jpg",
    tags: ["indian", "stew", "lentils", "protein", "quick", "comfort_food", "gluten_free", "hot", "autumn_winter", "main", "one_pot"],
    source: {
      name: "Vegan Richa - Everyday Red Lentil Dal",
      author: "Richa Hingle",
      url: "https://www.veganricha.com/instant-pot-red-lentil-dal",
    },
    featured: true,
    spicy: false,
    ingredients: [
      {
        name: { ca: "Llenties vermelles partides (esbandides)", en: "Split red lentils (masoor dal), rinsed" },
        amount: 250,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Llet de coco", en: "Coconut milk" },
        amount: 200,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Brou de verdures o aigua", en: "Vegetable broth or water" },
        amount: 600,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Gingebre fresc ratllat", en: "Fresh ginger, grated" },
        amount: 1,
        unit: { ca: "cullerada", en: "tbsp" },
      },
      {
        name: { ca: "Cúrcuma en pols", en: "Ground turmeric" },
        amount: 1,
        unit: { ca: "culleradeta", en: "tsp" },
      },
      {
        name: { ca: "Llavors de comí senceres", en: "Whole cumin seeds" },
        amount: 1,
        unit: { ca: "culleradeta", en: "tsp" },
      },
      {
        name: { ca: "Grans d'all picats", en: "Garlic cloves, minced" },
        amount: 3,
        unit: { ca: "unitats", en: "cloves" },
      },
      {
        name: { ca: "Espinacs baby frescos", en: "Fresh baby spinach" },
        amount: 100,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Coriandre fresc picat", en: "Fresh cilantro, chopped" },
        amount: 1,
        unit: { ca: "manat", en: "handful" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Esbandeix bé les llenties vermelles en un colador de malla fina sota l'aixeta fins que l'aigua surti transparent. Posa-les en una cassola mitjana amb el brou vegetal, la cúrcuma en pols i una culleradeta de sal marina. Fes arrencar el bull, abaixa el foc i cou tapat parcialment durant 18 minuts fins que les llenties es desfacin formant una crema tendra.",
          en: "Rinse red lentils in a fine sieve until water runs clear. Place in a saucepan with broth, turmeric, and salt. Bring to a boil, reduce heat, and simmer partially covered for 18 minutes until lentils break down into a creamy texture.",
        },
        durationMinutes: 18,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Afegeix la llet de coco a la cassola de llenties cuites. Remena suaument amb varetes a foc baix durant 4 minuts perquè s'emulsioni en una crema daurada brillant i sedosa.",
          en: "Whisk coconut milk into the cooked lentils over low heat for 4 minutes until silky, golden, and rich.",
        },
        durationMinutes: 4,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Prepara el Tarka (tècnica tradicional d'infusió d'espècies): escalfa dues cullerades d'oli en una paella petita a foc mitjà-alt. Afegeix les llavors de comí senceres i deixa que crepitin i saltin durant 30-40 segons per alliberar els seus olis essencials.",
          en: "Prepare the Tarka: heat 2 tbsp oil in a small pan over medium-high heat. Add cumin seeds and let them sizzle for 30-40 seconds to release aromatic oils.",
        },
        durationMinutes: 5,
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Afegeix els grans d'all laminats fins i el gingebre acabat de ratllar a la paella de l'oli calent. Daura durant 2 minuts vigilant constantment que no es cremi l'all.",
          en: "Add sliced garlic and grated ginger to the sizzling oil. Sauté for 2 minutes until fragrant and golden without scorching.",
        },
        durationMinutes: 3,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Aboca el tarka roent directament a sobre de la cassola de llenties (crepitarà i farà una olor magnífica). Incorpora els espinacs baby frescos i remena durant 2 minuts perquè s'estovin amb l'escalfor. Decora amb coriandre fresc picat i serveix amb pa naan o arròs basmati.",
          en: "Pour sizzling tarka into the lentils (it will hiss dramatically). Fold in baby spinach until wilted. Garnish with fresh cilantro and serve with warm naan or basmati rice.",
        },
        durationMinutes: 10,
      },
    ],
  },
  {
    id: "parker-house-rolls-emp",
    slug: "pa-llet-fullejat-mantega-girasol-emp",
    title: {
      ca: "Pa de Llet Fullejat i Mantega Fermentada de Gira-sol (estil Eleven Madison Park)",
      en: "Laminated Parker House Rolls & Cultured Sunflower Butter (Eleven Madison Park style)",
    },
    description: {
      ca: "L'icònic servei de pa i mantega del 3 estrelles Michelin novaiorquès de Daniel Humm: panets de llet de civada amb fullat cruixent tipus croissant per fora i brioche esponjós per dins, acompanyats d'una mantega artesana de pipes de gira-sol fermentada, airejada i coronada amb sal Maldon.",
      en: "The iconic signature bread & butter course from Daniel Humm's 3-Michelin-starred plant-based menu: ultra-flaky laminated oat milk rolls with a crisp exterior and pillowy crumb, served with house-cultured whipped sunflower seed butter and sea salt.",
    },
    category: "baking",
    difficulty: "hard",
    cost: "2",
    prepTimeMinutes: 50,
    cookTimeMinutes: 25,
    servings: 6,
    rating: 5.0,
    imageUrl: "/images/recipes/parker-house-rolls.jpg",
    tags: ["bread", "baking", "michelin", "fine_dining", "butter", "hot", "appetizer", "all_year"],
    source: {
      name: "Eleven Madison Park - Plant-Based Bread Service",
      author: "Daniel Humm",
      url: "https://www.elevenmadisonpark.com",
    },
    featured: true,
    ingredients: [
      {
        name: { ca: "Farina de força (W300 o similar)", en: "Strong bread flour" },
        amount: 400,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Beguda de civada tèbia", en: "Warm oat milk" },
        amount: 220,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Llevat fresc de forner", en: "Fresh baker's yeast" },
        amount: 15,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Aquafaba (líquid de coure cigrons)", en: "Aquafaba (chickpea brine)" },
        amount: 40,
        unit: { ca: "ml", en: "ml" },
        notes: { ca: "Aporta elasticitat i estructura a la massa", en: "Provides elasticity and structure" },
      },
      {
        name: { ca: "Sucre de canya pur", en: "Cane sugar" },
        amount: 25,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Sal marina fina", en: "Fine sea salt" },
        amount: 8,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Mantega vegetal de bloc de qualitat per laminar (freda)", en: "High-quality vegan block butter for laminating (cold)" },
        amount: 160,
        unit: { ca: "g", en: "g" },
        notes: { ca: "Necessària per crear les capes de fullat", en: "Essential for creating flaky laminated layers" },
      },
      {
        name: { ca: "Pipes de gira-sol crues (remullades 4 hores)", en: "Raw sunflower seeds (soaked 4 hours)" },
        amount: 180,
        unit: { ca: "g", en: "g" },
        notes: { ca: "Base de la mantega d'Eleven Madison Park", en: "Base for the signature EMP butter" },
      },
      {
        name: { ca: "Oli verge de gira-sol o oliva molt suau", en: "Cold-pressed sunflower or mild olive oil" },
        amount: 50,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Llevat nutricional i suc de llimona", en: "Nutritional yeast and fresh lemon juice" },
        amount: 1,
        unit: { ca: "cullerada", en: "tbsp" },
        notes: { ca: "Per a l'acidesa i notes làctiques fermentades", en: "For acidity and cultured notes" },
      },
      {
        name: { ca: "Escates de sal Maldon", en: "Maldon sea salt flakes" },
        notes: { ca: "Per coronar la mantega", en: "To finish the butter" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Dissol el llevat fresc i el sucre a la beguda de civada tèbia. En un bol o amassadora, combina la farina de força amb la sal fina, afegeix la barreja de llevat i l'aquafaba. Pasta durant 10 minuts fins a obtenir una massa llisa, brillant i elàstica que passi la prova de la membrana. Deixa fermentar 1 hora tapada i refreda 30 minuts a la nevera.",
          en: "Dissolve fresh yeast and sugar in warm oat milk. Combine bread flour and salt, add yeast mixture and aquafaba. Knead for 10 minutes until supple and elastic. Proof 1 hour, then chill 30 minutes in the fridge.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Col·loca el bloc de mantega vegetal freda entre dos papers de forn i pica'l amb el corró fins a formar un quadrat homogeni de 15x15 cm. Guarda'l a la nevera perquè mantingui exactament la mateixa consistència ferma que la massa freda.",
          en: "Place cold vegan block butter between parchment paper sheets and pound with a rolling pin into an even 15x15 cm square. Keep refrigerated to match dough consistency.",
        },
        durationMinutes: 8,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Estira la massa freda en un rectangle de 30x15 cm. Col·loca el quadrat de mantega al centre i plega els extrems com un sobre. Estira longitudinalment i fes dos plecs simples tipus carta (plegant en 3 capes), refredant 20 minuts a la nevera entre plecs perquè la mantega no es fongui.",
          en: "Roll cold dough into a 30x15 cm rectangle. Place butter square in center, fold edges over to enclose. Roll out and perform two letter folds (into thirds), chilling 20 minutes between folds.",
        },
        durationMinutes: 17,
        tip: {
          ca: "Mantingues la mantega i la massa sempre a la mateixa temperatura freda per garantir capes netes i cruixents.",
          en: "Keep butter and dough at identical cold temperature to maintain sharp lamination.",
        },
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Estira la massa laminada a 1 cm de gruix. Talla rectangles de 6x10 cm, pinzella'ls lleugerament amb mantega desfeta i doblega cada rectangle de manera asimètrica (deixant sobresortir la vora superior 1 cm, el plegat genuí Parker House). Disposa'ls junts en un motlle untat i deixa fermentar 45 minuts fins que doblin el volum.",
          en: "Roll laminated dough to 1 cm thickness. Cut into 6x10 cm rectangles, brush with melted butter, and fold off-center so top edge overhangs bottom (signature Parker House fold). Arrange snugly in baking dish and proof 45 minutes.",
        },
        durationMinutes: 10,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Pinta suaument la part superior dels panets amb una mica de llet de civada. Enforna a 190°C durant 22-25 minuts fins que adquireixin un to daurat intens i cruixent. En sortir del forn, pinzella'ls immediatament amb mantega vegetal desfeta per donar brillantor de brioix.",
          en: "Brush tops gently with oat milk. Bake at 190°C (375°F) for 22-25 minutes until deep golden and crisp. Brush with melted vegan butter immediately out of the oven for gloss.",
        },
        durationMinutes: 25,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Prepara la mantega d'Eleven Madison Park: escorre les pipes de gira-sol remullades i tritura-les a la batedora amb l'oli verge, el llevat nutricional, el suc de llimona i un polsim de sal a velocitat màxima durant 4 minuts fins a aconseguir una textura setinada i airejada. Serveix la mantega en una cassoleta coronada amb escates de sal Maldon al costat dels panets calents.",
          en: "Craft the signature EMP butter: blend drained soaked sunflower seeds with cold-pressed oil, nutritional yeast, lemon juice, and salt on high speed for 4 minutes until silky, aerated, and fluffy. Serve with flaky Maldon salt alongside warm rolls.",
        },
        durationMinutes: 10,
      },
    ],
  },
  {
    id: "sourdough-spent-grain-huset",
    slug: "pa-rustic-massa-mare-mantega-mostassa-huset",
    title: {
      ca: "Pa Rústic Àrtic amb Bagàs de Cervesa i Mantega Vegana de Mostassa (estil Huset Svalbard)",
      en: "Arctic Sourdough with Spent Grains & Whipped Mustard Butter (Huset style)",
    },
    description: {
      ca: "Inspirat en el programa de pa de residu zero del cèlebre restaurant àrtic de Svalbard: fogassa rústica de fermentació lenta amb sègol i gra de cerveseria torrat (bagàs), acompanyada de mantega vegetal batuda amb mostassa antiga de Dijó i un fil d'oli verge de colza amb escates d'algues.",
      en: "Inspired by the celebrated zero-waste Arctic dining program in Svalbard: slow-fermented rustic sourdough with toasted spent brewery grains and rye, served alongside whipped plant butter with whole-grain Dijon mustard and cold-pressed oil.",
    },
    category: "traditional",
    difficulty: "medium",
    cost: "1",
    prepTimeMinutes: 55,
    cookTimeMinutes: 45,
    servings: 8,
    rating: 4.9,
    imageUrl: "/images/recipes/sourdough-spent-grain.jpg",
    tags: ["bread", "sourdough", "fermented", "nordic", "butter", "room_temp", "all_year"],
    source: {
      name: "Huset Svalbard - Nordic Arctic Sourdough & Smoked Butter",
      author: "Huset Restaurant",
      url: "https://huset.com",
    },
    featured: true,
    ingredients: [
      {
        name: { ca: "Massa mare activa 100% hidratació", en: "Active sourdough starter (100% hydration)" },
        amount: 100,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Farina de blat blanca de força", en: "Strong white bread flour" },
        amount: 350,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Farina integral de sègol", en: "Whole rye flour" },
        amount: 80,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Gra de cerveseria (bagàs / malt torrat) o flocs d'ordi", en: "Brewery spent grains or toasted barley flakes" },
        amount: 70,
        unit: { ca: "g", en: "g" },
        notes: { ca: "Aporta la textura rústica i aromes de malt de Svalbard", en: "Provides Arctic zero-waste malty crunch" },
      },
      {
        name: { ca: "Aigua mineral a temperatura ambient", en: "Water at room temperature" },
        amount: 330,
        unit: { ca: "ml", en: "ml" },
      },
      {
        name: { ca: "Sal marina", en: "Sea salt" },
        amount: 10,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Mantega vegetal de bloc a temperatura ambient", en: "Vegan block butter at room temperature" },
        amount: 120,
        unit: { ca: "g", en: "g" },
      },
      {
        name: { ca: "Mostassa antiga de Dijó en gra", en: "Whole grain Dijon mustard" },
        amount: 2,
        unit: { ca: "cullerades", en: "tbsp" },
      },
      {
        name: { ca: "Oli verge de colza nòrdic o oliva suau", en: "Cold-pressed rapeseed or mild olive oil" },
        amount: 1,
        unit: { ca: "cullerada", en: "tbsp" },
      },
      {
        name: { ca: "Escates d'alga nori o dulse picades", en: "Seaweed flakes (nori or dulse)" },
        notes: { ca: "Toc mineral marí de l'Àrtic", en: "Arctic marine mineral finish" },
      },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: {
          ca: "Torra el bagàs de cervesa o flocs d'ordi en una paella seca durant 5 minuts fins que desprengui aroma de malt torrat. Deixa refredar. En un bol gran, barreja les farines de blat i sègol amb el bagàs torrat i els 330 ml d'aigua. Deixa fer autòlisi durant 45 minuts tapat perquè el gluten s'hidrati sol.",
          en: "Toast brewery spent grains in a dry skillet for 5 minutes until fragrant; let cool. In a large bowl, mix flours, toasted grains, and water. Rest covered for 45 minutes autolyse.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 2,
        instruction: {
          ca: "Incorpora la massa mare activa i la sal marina a la massa amb les mans humides fent plegats d'estirar i plegar. Durant les 2 hores següents a temperatura ambient, realitza 4 sèries de plecs cada 30 minuts fins que la massa desenvolupi una tensió llisa i airejada.",
          en: "Fold in active sourdough starter and salt with wet hands. Over the next 2 hours, perform 4 sets of stretch-and-folds every 30 minutes until dough develops smooth tension and elasticity.",
        },
        durationMinutes: 15,
      },
      {
        stepNumber: 3,
        instruction: {
          ca: "Aboca la massa sobre el taulell lleugerament enfarinat. Fes un bolejat suau, deixa reposar 20 minuts sobre la taula i forma una fogassa rodona ben tensa. Col·loca-la amb la juntura cap amunt en un banneton enfarinat amb farina d'arròs. Posa en una bossa i fermenta a la nevera durant 12-16 hores.",
          en: "Turn dough onto floured surface, pre-shape, bench rest 20 minutes, then shape into a tight boule. Place seam-side up in a rice-floured banneton. Cold ferment in fridge for 12-16 hours overnight.",
        },
        durationMinutes: 15,
        tip: {
          ca: "La llarga fermentació freda nocturna a la nevera és imprescindible per a la digestibilitat, els aromes complexos i la crosta cruixent amb ampolles.",
          en: "Cold overnight retard develops complex fermented acidity and the crispy blistered crust signature of Nordic artisan bread.",
        },
      },
      {
        stepNumber: 4,
        instruction: {
          ca: "Preescalfa el forn i una cocotte de ferro colat a 245°C durant 45 minuts. Gira la fogassa freda sobre paper de forn, fes un tall net i decidit amb una fulla d'afaitar de forner i col·loca-la amb compte dins la cocotte calenta. Tapa immediatament i enforna amb el seu propi vapor durant 25 minuts.",
          en: "Preheat oven and Dutch oven to 245°C (475°F) for 45 minutes. Invert cold dough onto parchment, score with baker's blade, and lower into hot Dutch oven. Cover and bake with steam for 25 minutes.",
        },
        durationMinutes: 25,
      },
      {
        stepNumber: 5,
        instruction: {
          ca: "Destapa la cocotte, abaixa la temperatura a 215°C i cou durant 18-20 minuts més fins que la crosta quedi d'un to caoba torrat intens i la base ressoni a buit en donar-hi petits cops amb els artells. Deixa refredar completament sobre una reixeta almenys 1 hora abans de tallar.",
          en: "Remove lid, lower temperature to 215°C (420°F), and bake uncovered for 18-20 minutes until crust is deep mahogany and loaf sounds hollow when tapped. Cool on wire rack for 1 hour before slicing.",
        },
        durationMinutes: 20,
      },
      {
        stepNumber: 6,
        instruction: {
          ca: "Prepara la mantega batuda de mostassa d'estil Svalbard: en un bol petit amb varetes elèctriques, bat la mantega vegetal tova amb la mostassa antiga en gra de Dijó i l'oli de colza durant 3 minuts fins que quedi una crema blanca, airejada i suau. Decora amb escates d'alga nori i sal marina, i serveix amb llesques gruixudes de pa rústic.",
          en: "Make whipped mustard butter: whip softened vegan butter with whole grain Dijon mustard and cold-pressed oil for 3 minutes until light, aerated, and fluffy. Garnish with seaweed flakes and sea salt, served with thick slices of rustic bread.",
        },
        durationMinutes: 10,
      },
    ],
  },
];

export function filterRecipes(
  recipes: RecipeItem[],
  query: string,
  category?: RecipeCategory | "all",
  language: "ca" | "en" = "ca",
  difficulty?: RecipeDifficulty | "all",
  cost?: RecipeCost | "all",
): RecipeItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return recipes.filter((recipe) => {
    // Category match
    if (category && category !== "all" && recipe.category !== category) {
      return false;
    }

    // Difficulty match
    if (difficulty && difficulty !== "all" && recipe.difficulty !== difficulty) {
      return false;
    }

    // Cost match
    if (cost && cost !== "all" && recipe.cost !== cost) {
      return false;
    }

    // Query match
    if (!normalizedQuery) return true;

    const title = recipe.title[language]?.toLowerCase() ?? "";
    const description = recipe.description[language]?.toLowerCase() ?? "";
    const tags = recipe.tags.join(" ").toLowerCase();
    const ingredients = recipe.ingredients
      .map((i) => i.name[language]?.toLowerCase() ?? "")
      .join(" ");

    return (
      title.includes(normalizedQuery) ||
      description.includes(normalizedQuery) ||
      tags.includes(normalizedQuery) ||
      ingredients.includes(normalizedQuery)
    );
  });
}

/**
 * Scale ingredient amounts mathematically according to servings ratio.
 */
export function scaleIngredientAmount(
  baseAmount: number | undefined,
  baseServings: number,
  targetServings: number,
): number | undefined {
  if (baseAmount === undefined || baseServings <= 0) return undefined;
  const factor = targetServings / baseServings;
  const scaled = baseAmount * factor;
  return Math.round(scaled * 10) / 10;
}
