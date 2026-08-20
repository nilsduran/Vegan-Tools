import { useSyncExternalStore } from "react";

export type Language = "en" | "ca";

const en = {
  brand: "Vegan Tools",
  tagline: "Useful tools for everyday vegan life.",
  home: "Home",
  map: "Map",
  menus: "Map",
  scanner: "Scanner",
  recipes: "Recipes",
  openMap: "Explore map",
  openMenu: "Explore map",
  openScanner: "Scan product",
  openRecipes: "Veganize recipe",
  mapSummary: "Discover vegan restaurants and places, read menus and check community reviews.",
  menusSummary: "Discover vegan restaurants and places, read menus and check community reviews.",
  scannerSummary: "Scan a barcode or check a product's ingredient label.",
  recipesSummary: "Find non-vegan ingredients and practical replacements for your recipe.",
  uploadTitle: "Upload a restaurant menu",
  uploadBody: "PDF, JPEG, PNG or WebP. Up to eight files.",
  analyze: "Analyze menu",
  reviewing: "Review before publishing",
  publish: "Publish menu",
  addDish: "Add dish",
  remove: "Remove",
  source: "Source",
  why: "Why?",
  scanPrompt: "Point your camera at a barcode.",
  manualCode: "Enter barcode",
  lookUp: "Look up",
  unknown: "Unknown",
  vegan: "Vegan",
  probablyVegan: "Probably vegan",
  vegetarian: "Vegetarian",
  probablyVegetarian: "Probably vegetarian",
  nonVegetarian: "Non-vegetarian",
  all: "All",
  includeModifications: "Include dishes that may be modified",
  editHint: "Correct names, prices and verdicts against the original menu.",
} as const;

const ca: Record<keyof typeof en, string> = {
  brand: "Vegan Tools",
  tagline: "Eines útils per al dia a dia vegà.",
  home: "Inici",
  map: "Mapa",
  menus: "Mapa",
  scanner: "Escàner",
  recipes: "Receptes",
  openMap: "Explora el mapa",
  openMenu: "Explora el mapa",
  openScanner: "Escaneja un producte",
  openRecipes: "Veganitza una recepta",
  mapSummary: "Descobreix restaurants i llocs vegans, llegeix cartes i consulta ressenyes.",
  menusSummary: "Descobreix restaurants i llocs vegans, llegeix cartes i consulta ressenyes.",
  scannerSummary: "Escaneja un codi de barres o comprova l'etiqueta d'ingredients.",
  recipesSummary: "Troba ingredients no vegans i substitucions pràctiques per a la recepta.",
  uploadTitle: "Puja el menú d'un restaurant",
  uploadBody: "PDF, JPEG, PNG o WebP. Fins a vuit fitxers.",
  analyze: "Analitza el menú",
  reviewing: "Revisa abans de publicar",
  publish: "Publica el menú",
  addDish: "Afegeix un plat",
  remove: "Elimina",
  source: "Font",
  why: "Per què?",
  scanPrompt: "Enfoca la càmera cap a un codi de barres.",
  manualCode: "Introdueix el codi de barres",
  lookUp: "Cerca",
  unknown: "Desconegut",
  vegan: "Vegà",
  probablyVegan: "Probablement vegà",
  vegetarian: "Vegetarià",
  probablyVegetarian: "Probablement vegetarià",
  nonVegetarian: "No vegetarià",
  all: "Tot",
  includeModifications: "Inclou plats que es poden adaptar",
  editHint: "Corregeix els noms, els preus i la classificació comparant-los amb el menú original.",
};

const caPhrases = {
  "Check products, understand restaurant menus and adapt recipes.":
    "Comprova productes, entén els menús dels restaurants i adapta receptes.",
  "Open tool": "Obre l'eina",
  "Tools": "Eines",
  "English": "Anglès",
  "Catalan": "Català",
  "Primary navigation": "Navegació principal",
  "App navigation": "Navegació de l'aplicació",
  "Restaurant menu": "Menú del restaurant",
  "Open original website": "Obre el web original",
  "Open saved original": "Obre l'original desat",
  "Diet filter": "Filtre alimentari",
  "Carnist": "Carnista",
  "Show adaptable": "Mostra els adaptables",
  "Select a diet to show matching dishes.": "Selecciona una dieta per mostrar els plats corresponents.",
  "Original menu": "Menú original",
  "Shared saved menu": "Menú compartit desat",
  "Update menu": "Actualitza el menú",
  "Restaurant name": "Nom del restaurant",
  "Search for a restaurant": "Cerca un restaurant",
  "Search restaurants": "Cerca restaurants",
  "Search": "Cerca",
  "Using approximate location": "S'està utilitzant la ubicació aproximada",
  "Prioritize places near me": "Prioritza els llocs propers",
  "Website": "Web",
  "Map": "Mapa",
  "Use this restaurant": "Utilitza aquest restaurant",
  "Selected restaurant": "Restaurant seleccionat",
  "Change": "Canvia",
  "Use a website or menu link": "Utilitza un web o un enllaç al menú",
  "Official website": "Web oficial",
  "Finding menu…": "S'està cercant el menú…",
  "Find menu": "Cerca el menú",
  "Check Google results": "Comprova els resultats de Google",
  "Can’t find the restaurant?": "No trobes el restaurant?",
  "Recent menus": "Menús recents",
  "Saved menu": "Menú desat",
  "Open": "Obre",
  "Add the menu": "Afegeix el menú",
  "Take photos": "Fes fotos",
  "Take one per page—you can add up to 8": "Fes-ne una per pàgina; en pots afegir fins a 8",
  "Choose files": "Tria fitxers",
  "Photos or a PDF, up to 8 files": "Fotos o un PDF, fins a 8 fitxers",
  "Photos are read in this order.": "Les fotos es llegeixen en aquest ordre.",
  "Extracting dishes…": "S'estan extraient els plats…",
  "Cancel analysis": "Cancel·la l'anàlisi",
  "Is this vegan?": "Això és vegà?",
  "Scan a barcode or check the ingredient label directly.":
    "Escaneja un codi de barres o comprova directament l'etiqueta d'ingredients.",
  "Product recipes can change. Check the current package when the result matters.":
    "Les receptes dels productes poden canviar. Comprova l'envàs actual quan el resultat sigui important.",
  "Barcode": "Codi de barres",
  "Ingredients": "Ingredients",
  "Checking product…": "S'està comprovant el producte…",
  "Scan another": "Escaneja'n un altre",
  "Read ingredient label": "Llegeix l'etiqueta d'ingredients",
  "Check label": "Comprova l'etiqueta",
  "Retake photo": "Torna a fer la foto",
  "or": "o",
  "Upload an image": "Puja una imatge",
  "Reading label…": "S'està llegint l'etiqueta…",
  "Check ingredients": "Comprova els ingredients",
  "Take a clear photo of the full ingredient label, then correct the extracted text before checking it.":
    "Fes una foto nítida de tota l'etiqueta d'ingredients i corregeix el text extret abans de comprovar-lo.",
  "Allergen trace warning": "Avís de traces d'al·lèrgens",
  "Photograph the ingredient label": "Fotografia l'etiqueta d'ingredients",
  "Keep the full list in focus and avoid glare.": "Mantén tota la llista enfocada i evita els reflexos.",
  "Open camera": "Obre la càmera",
  "Capture label": "Captura l'etiqueta",
  "Camera access is unavailable. Enter the barcode below.":
    "No es pot accedir a la càmera. Introdueix el codi de barres a continuació.",
  "Camera access is unavailable. Upload an image below instead.":
    "No es pot accedir a la càmera. Puja una imatge a continuació.",
  "Use your camera to scan a barcode.": "Utilitza la càmera per escanejar un codi de barres.",
  "Start camera": "Inicia la càmera",
  "Recipe Veganizer": "Veganitzador de receptes",
  "Recipe": "Recepta",
  "Use an example": "Utilitza un exemple",
  "Paste the ingredients or the full recipe. Vegan Tools will identify known animal-derived ingredients and suggest how much to use and how to use it where a reliable substitution rule exists.":
    "Enganxa els ingredients o la recepta completa. Vegan Tools identificarà els ingredients coneguts d'origen animal i suggerirà quina quantitat utilitzar i com fer-ho quan hi hagi una substitució fiable.",
  "Veganize recipe": "Veganitza la recepta",
  "Veganized recipe": "Recepta veganitzada",
  "This is an editable draft. Review the suggested quantities and instructions before cooking.":
    "Aquest és un esborrany editable. Revisa les quantitats i les instruccions suggerides abans de cuinar.",
  "Suggested substitutions": "Substitucions suggerides",
  "Choose a substitute": "Tria un substitut",
  "Suggestions are starting points: quantities and behaviour depend on the recipe. Check branded ingredients and adjust texture, moisture and cooking time.":
    "Els suggeriments són punts de partida: les quantitats i el comportament depenen de la recepta. Comprova els ingredients de marca i ajusta la textura, la humitat i el temps de cocció.",
  "Loading menu…": "S'està carregant el menú…",
  "Matched": "Coincidència",
  "Page": "Pàgina",
  "Adaptable to": "Adaptable a",
  "Menu": "Menú",
  "Dietary verdict": "Veredicte dietètic",
  "Practical adaptation": "Adaptació pràctica",
  "No adaptation": "Sense adaptació",
  "Adaptable to vegan": "Adaptable a vegà",
  "Adaptable to vegetarian": "Adaptable a vegetarià",
  "Explanation or notes": "Explicació o notes",
  "Cancel": "Cancel·la",
  "Save correction": "Desa la correcció",
  "Dish correction": "Correcció del plat",
  "Correct dish": "Corregir plat",
  "Correct dish or add note": "Corregir plat o afegir nota",
  "Close": "Tanca",
  "Edit dish": "Edita el plat",
  "Restaurant warning / note": "Avís o nota del restaurant",
  "Community notes": "Notes de la comunitat",
  "Community note": "Nota de la comunitat",
  "Notes that apply to the whole venue": "Notes aplicables a tot el restaurant",
  "Save notes": "Desa les notes",
  "Edit venue notes": "Edita les notes del restaurant",
  "Add venue notes": "Afegeix notes del restaurant",
  "Edit notes": "Edita les notes",
  "Saving & translating…": "Desant i traduint…",
  "No matching restaurant was found. Try adding a city or area.":
    "No s'ha trobat cap restaurant coincident. Prova d'afegir una ciutat o zona.",
  "Restaurant search failed.": "Ha fallat la cerca de restaurants.",
  "Analysis failed.": "Ha fallat l'anàlisi.",
  "Product check method": "Mètode de comprovació del producte",
  "Barcode checker": "Comprovador de codis de barres",
  "Ingredients checker": "Comprovador d'ingredients",
  "Could not submit dish correction.": "No s'ha pogut desar la correcció del plat.",
  "Could not update restaurant notes.": "No s'han pogut actualitzar les notes del restaurant.",
  "No animal-derived ingredients are listed in the menu description.":
    "La descripció del menú no indica cap ingredient d'origen animal.",
  "The menu marks this as vegan, but it does not provide enough ingredient detail for an independent explanation.":
    "El menú ho marca com a vegà, però no dona prou detalls dels ingredients per verificar-ho de manera independent.",
  "The menu marks this as vegetarian, but it does not list enough ingredients to identify the animal-derived component.":
    "El menú ho marca com a vegetarià, però no indica prou ingredients per identificar el component d'origen animal.",
} as const;

let language: Language =
  typeof localStorage !== "undefined" && localStorage.getItem("vegan-tools-language") === "ca"
    ? "ca"
    : "en";
if (typeof document !== "undefined") document.documentElement.lang = language;
const listeners = new Set<() => void>();

export function setLanguage(next: Language) {
  language = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("vegan-tools-language", next);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  listeners.forEach((listener) => listener());
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => language,
    () => "en" as Language,
  );
}

export type TranslationKey = keyof typeof en;
export type CatalanPhraseKey = keyof typeof caPhrases;

export const t = (key: TranslationKey): string =>
  language === "ca" ? ca[key] : en[key];

export function tx(english: CatalanPhraseKey): string {
  if (language === "ca") {
    const translated = caPhrases[english];
    if (!translated && typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing Catalan translation for: "${String(english)}"`);
    }
    return (translated as string) ?? english;
  }
  return english;
}

