import type { IngredientFinding } from "@vegan-tools/domain";
import type { Language } from "./i18n";

const ingredientNamesCa: Record<string, string> = {
  gelatin: "Gelatina",
  carmine: "Carmí",
  shellac: "Goma laca",
  isinglass: "Ictiocol·la",
  "animal-meat": "Carn",
  "fish-seafood": "Peix o marisc",
  "animal-fat": "Greix animal",
  "animal-rennet": "Quall animal",
  milk: "Llet",
  whey: "Sèrum de llet",
  casein: "Caseïna",
  butter: "Mantega",
  cheese: "Formatge",
  cream: "Nata",
  lactose: "Lactosa",
  egg: "Ou",
  honey: "Mel",
  beeswax: "Cera d'abella",
  lanolin: "Lanolina",
  "royal-jelly": "Gelea reial",
  glycerol: "Glicerol",
  "mono-diglycerides": "Mono- i diglicèrids",
  "fatty-acid-esters": "Èsters d'àcids grassos",
  "stearic-acid": "Àcid esteàric",
  "vitamin-d3": "Vitamina D3",
  "natural-flavour": "Aroma natural",
  lecithin: "Lecitina",
  agar: "Agar-agar",
  pectin: "Pectina",
  carrageenan: "Carragenina",
  "carnauba-wax": "Cera de carnauba",
  "nutritional-yeast": "Llevat nutricional",
};

const ingredientReasonsCa: Record<string, string> = {
  gelatin: "La gelatina es fa amb col·lagen animal.",
  carmine: "El carmí és un colorant vermell fet amb insectes cotxinilla.",
  shellac: "La goma laca és una resina secretada per insectes.",
  isinglass: "La ictiocol·la és col·lagen obtingut de la bufeta natatòria dels peixos.",
  "animal-meat": "Aquest ingredient és carn animal.",
  "fish-seafood": "Aquest ingredient prové d'un peix o d'un altre animal aquàtic.",
  "animal-fat": "És greix obtingut d'animals sacrificats.",
  "animal-rennet": "El quall animal s'obté del revestiment de l'estómac de remugants joves.",
  milk: "La llet és d'origen animal; per tant, la recepta no és vegana.",
  whey: "El sèrum de llet és un subproducte lacti.",
  casein: "La caseïna i els caseïnats són proteïnes de la llet.",
  butter: "La mantega es fa amb nata làctia.",
  cheese: "El formatge conté lactis; alguns formatges també poden portar quall animal.",
  cream: "La nata làctia es fa amb llet.",
  lactose: "La lactosa és el sucre present de manera natural a la llet.",
  egg: "L'ou és d'origen animal; per tant, la recepta no és vegana.",
  honey: "La mel la produeixen les abelles i no es considera vegana.",
  beeswax: "La cera d'abella la produeixen les abelles.",
  lanolin: "La lanolina és una cera obtinguda de la llana d'ovella.",
  "royal-jelly": "La gelea reial la produeixen les abelles.",
  glycerol: "El glicerol pot ser d'origen vegetal, sintètic o animal; l'etiqueta poques vegades n'especifica l'origen.",
  "mono-diglycerides": "L'E471 pot provenir de greixos vegetals o animals si no se n'indica l'origen.",
  "fatty-acid-esters": "Els èsters E472 poden emprar àcids grassos d'origen vegetal o animal.",
  "stearic-acid": "L'àcid esteàric es pot obtenir de greix vegetal o animal.",
  "vitamin-d3": "La vitamina D3 sovint prové de la lanolina, tot i que n'hi ha de vegana obtinguda de líquens.",
  "natural-flavour": "No s'indica l'origen concret d'un aroma natural genèric.",
  lecithin: "Actualment la lecitina sol ser vegetal, però si no se n'especifica l'origen també pot provenir de l'ou.",
  agar: "L'agar és un gelificant obtingut d'algues vermelles.",
  pectin: "La pectina és una fibra obtinguda de fruites i altres plantes.",
  carrageenan: "La carragenina s'obté d'algues vermelles.",
  "carnauba-wax": "La cera de carnauba s'obté de fulles de palmera.",
  "nutritional-yeast": "El llevat nutricional és un ingredient derivat d'un fong.",
};

const substitutionsCa: Record<string, string> = {
  "agar-agar": "agar-agar",
  pectin: "pectina",
  carrageenan: "carragenina",
  "beetroot colour": "colorant de remolatxa",
  anthocyanins: "antocianines",
  "red fruit concentrate": "concentrat de fruites vermelles",
  "carnauba wax": "cera de carnauba",
  "plant-based glaze": "glacejat vegetal",
  bentonite: "bentonita",
  "pea protein fining": "clarificant de proteïna de pèsol",
  "unfined product": "producte sense clarificar",
  tofu: "tofu",
  tempeh: "tempeh",
  seitan: "seitan",
  legumes: "llegums",
  "textured vegetable protein": "proteïna vegetal texturitzada",
  "hearts of palm": "cors de palmera",
  "smoked tofu": "tofu fumat",
  nori: "nori",
  "seaweed seasoning": "condiment d'algues",
  "vegan butter": "mantega vegana",
  "olive oil": "oli d'oliva",
  "neutral vegetable oil": "oli vegetal neutre",
  "microbial rennet": "quall microbià",
  "vegetable rennet": "quall vegetal",
  "unsweetened soy milk": "llet de soja sense sucre",
  "oat milk": "llet de civada",
  "almond milk": "llet d'ametlla",
  "pea protein": "proteïna de pèsol",
  "soy protein": "proteïna de soja",
  "plant milk powder": "llet vegetal en pols",
  "vegan cheese": "formatge vegà",
  "nutritional yeast": "llevat nutricional",
  "cashew cream": "crema d'anacards",
  "oat cream": "crema de civada",
  "soy cream": "crema de soja",
  "coconut cream": "crema de coco",
  "plant-based sugar or syrup appropriate to the recipe": "sucre o xarop vegetal adequat per a la recepta",
  "flax egg for binding": "ou de lli per lligar",
  "aquafaba for whipping": "aquafaba per muntar",
  "silken tofu for moisture": "tofu sedós per aportar humitat",
  "commercial egg replacer": "substitut comercial de l'ou",
  "maple syrup": "xarop d'auró",
  "agave syrup": "xarop d'atzavara",
  "date syrup": "xarop de dàtil",
  "candelilla wax": "cera de candelilla",
  "plant squalane": "esqualà vegetal",
  "shea butter": "mantega de karité",
  "vegetable wax": "cera vegetal",
  "No direct culinary substitute is normally required": "Normalment no cal cap substitut culinari directe",
  "plant-derived glycerol confirmed by the manufacturer": "glicerol d'origen vegetal confirmat pel fabricant",
  "sunflower lecithin": "lecitina de gira-sol",
  "plant-derived E471 confirmed by the manufacturer": "E471 d'origen vegetal confirmat pel fabricant",
  "a manufacturer-confirmed plant-derived emulsifier": "un emulsionant d'origen vegetal confirmat pel fabricant",
  "plant-derived stearic acid confirmed by the manufacturer": "àcid esteàric d'origen vegetal confirmat pel fabricant",
  "lichen-derived vitamin D3": "vitamina D3 obtinguda de líquens",
  "vitamin D2": "vitamina D2",
  "a flavouring whose plant source is disclosed": "un aroma que indiqui el seu origen vegetal",
  "soy lecithin": "lecitina de soja",
  "vegan alternative": "alternativa vegana",
};

const rawIngredientNamesCa = Object.fromEntries([
  ["Gelatine", "Gelatina"],
  ["Carmine", "Carmí"],
  ["Shellac", "Goma laca"],
  ["Isinglass", "Ictiocol·la"],
  ["Meat", "Carn"],
  ["Fish or seafood", "Peix o marisc"],
  ["Animal fat", "Greix animal"],
  ["Animal rennet", "Quall animal"],
  ["Milk", "Llet"],
  ["Whey", "Sèrum de llet"],
  ["Casein", "Caseïna"],
  ["Butter", "Mantega"],
  ["Cheese", "Formatge"],
  ["Dairy cream", "Nata"],
  ["Lactose", "Lactosa"],
  ["Egg", "Ou"],
  ["Honey", "Mel"],
  ["Beeswax", "Cera d'abella"],
  ["Lanolin", "Lanolina"],
  ["Royal jelly", "Gelea reial"],
  ["Glycerol", "Glicerol"],
  ["Mono- and diglycerides", "Mono- i diglicèrids"],
  ["Fatty acid esters", "Èsters d'àcids grassos"],
  ["Stearic acid", "Àcid esteàric"],
  ["Vitamin D3", "Vitamina D3"],
  ["Natural flavouring", "Aroma natural"],
  ["Lecithin", "Lecitina"],
]);

const exactGeneratedCa: Record<string, string> = {
  "No readable ingredient list was provided.": "No s'ha proporcionat cap llista d'ingredients llegible.",
  "The vegan claim conflicts with animal-derived ingredients on the label. Check the current package.":
    "La declaració vegana entra en conflicte amb ingredients d'origen animal de l'etiqueta. Comprova l'envàs actual.",
  "A trusted vegan claim resolves ingredients whose origin would otherwise be ambiguous.":
    "Una declaració vegana fiable resol els ingredients que altrament tindrien un origen ambigu.",
  "A trusted source confirms the vegan claim and no conflicting ingredient was found.":
    "Una font fiable confirma que és vegà i no s'hi ha trobat cap ingredient incompatible.",
  "A trusted source confirms that the product is vegetarian, but not that it is vegan.":
    "Una font fiable confirma que el producte és vegetarià, però no que sigui vegà.",
  "The provided ingredient list contains no animal-derived or origin-ambiguous ingredient.":
    "La llista d'ingredients proporcionada no conté cap ingredient d'origen animal ni d'origen ambigu.",
  "No animal-derived or origin-ambiguous ingredient was detected, but the ingredient evidence is incomplete.":
    "No s'ha detectat cap ingredient d'origen animal ni d'origen ambigu, però la informació dels ingredients és incompleta.",
  "No trustworthy product evidence was found. Scan the current ingredient label.":
    "No s'ha trobat cap informació fiable del producte. Escaneja l'etiqueta d'ingredients actual.",
  "This is an unprocessed fruit or vegetable.":
    "És una fruita o verdura sense processar.",
  "Apple pastries commonly contain dairy or egg and may occasionally use other animal fats.":
    "La brioixeria de poma sol contenir lactis o ou i, de vegades, altres greixos animals.",
  "Dark chocolate is often vegan, but some recipes contain milk or other animal-derived ingredients.":
    "La xocolata negra sovint és vegana, però algunes receptes contenen llet o altres ingredients d'origen animal.",
  "Open Food Facts marks this product as non-vegetarian.":
    "Open Food Facts marca aquest producte com a no vegetarià.",
  "Open Food Facts marks this product as non-vegan, but the available data does not establish whether it is vegetarian.":
    "Open Food Facts marca aquest producte com a no vegà, però les dades disponibles no permeten saber si és vegetarià.",
  "Open Food Facts marks this product as vegan and no conflicting ingredient was found.":
    "Open Food Facts marca aquest producte com a vegà i no s'hi ha trobat cap ingredient incompatible.",
  "Open Food Facts places this product in a plant-based category, but an ingredient list or vegan label is still needed for confirmation.":
    "Open Food Facts situa aquest producte en una categoria vegetal, però encara cal una llista d'ingredients o una etiqueta vegana per confirmar-ho.",
  "Paste a recipe to identify ingredients that need replacing.":
    "Enganxa una recepta per identificar els ingredients que cal substituir.",
  "No non-vegan ingredient was detected. Review branded or unspecified ingredients before cooking.":
    "No s'ha detectat cap ingredient no vegà. Revisa els ingredients de marca o no especificats abans de cuinar.",
  "Some ingredients need more information before this recipe can be veganized reliably.":
    "Cal més informació sobre alguns ingredients per poder veganitzar la recepta de manera fiable.",
  "Ask whether it can be prepared without alioli and fried in olive oil.":
    "Pregunta si es pot preparar sense allioli i fregit amb oli d'oliva.",
  "May be fried in animal fat or contain non-vegan sauce ingredients":
    "Es pot haver fregit amb greix animal o contenir ingredients no vegans a la salsa.",
  "May be fried in animal fat or contain non-vegan sauce ingredients.":
    "Es pot haver fregit amb greix animal o contenir ingredients no vegans a la salsa.",
  "Vegan substitution notes:": "Notes de substitució vegana:",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceTerms(value: string): string {
  const terms: Record<string, string> = {
    ...substitutionsCa,
    "flax eggs": "ous de lli",
    "flax egg": "ou de lli",
    "ground flaxseed": "llavors de lli moltes",
    "silken tofu": "tofu sedós",
    "commercial egg replacer": "substitut comercial de l'ou",
    "adjust quantity to taste or package instructions": "ajusta la quantitat al gust o segons les instruccions de l'envàs",
    "the original quantity": "la quantitat original",
    "package ratio": "proporció de l'envàs",
    "animal fat": "greix animal",
    butter: "mantega",
    eggs: "ous",
    egg: "ou",
    tbsp: "cullerades",
    tsp: "culleradetes",
  };
  return Object.entries(terms)
    .sort(([a], [b]) => b.length - a.length)
    .reduce(
      (text, [english, catalan]) =>
        text.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "gi"), catalan),
      value,
    );
}

function translateIngredientList(value: string): string {
  return value
    .split(",")
    .map((name) => rawIngredientNamesCa[name.trim()] ?? name.trim())
    .join(", ");
}

function translateMenuPhrase(value: string): string {
  const phrases: Record<string, string> = {
    "the vanilla ice cream": "el gelat de vainilla",
    "the cheese garnish": "la guarnició de formatge",
    "plant-based bolognese": "bolonyesa vegetal",
    "the potatoes": "les patates",
    "the cheese": "el formatge",
    "the sauce": "la salsa",
    "the cod": "el bacallà",
    "the ham": "el pernil",
    "the egg": "l'ou",
    "fried in olive oil": "fregit amb oli d'oliva",
    sautéed: "saltades",
    alioli: "allioli",
    cheese: "formatge",
    ham: "pernil",
  };
  const translated = Object.entries(phrases)
    .sort(([a], [b]) => b.length - a.length)
    .reduce(
      (text, [english, catalan]) =>
        text.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "gi"), catalan),
      value,
    );
  return replaceTerms(translated)
    .replace(/\band\b/gi, "i")
    .replace(/\bor\b/gi, "o");
}

function translateGeneratedLine(line: string): string {
  const trimmed = line.trim();
  const prefix = line.slice(0, line.indexOf(trimmed));
  const bullet = trimmed.startsWith("- ") ? "- " : "";
  const value = bullet ? trimmed.slice(2) : trimmed;
  const exact = exactGeneratedCa[value];
  if (exact) return `${prefix}${bullet}${exact}`;

  let match = value.match(/^Vegetarian but not vegan: contains (.+)\.$/);
  if (match) return `${prefix}${bullet}Vegetarià però no vegà: conté ${translateIngredientList(match[1]!)}.`;
  match = value.match(/^Contains (.+)\.$/);
  if (match) return `${prefix}${bullet}Conté ${translateIngredientList(match[1]!)}.`;
  match = value.match(/^No clearly non-vegetarian ingredient was found, but the origin of (.+) needs confirmation\.$/);
  if (match) {
    return `${prefix}${bullet}No s'ha trobat cap ingredient clarament no vegetarià, però cal confirmar l'origen de ${translateIngredientList(match[1]!)}.`;
  }
  match = value.match(/^(\d+) ingredients? can be replaced with vegan alternatives\.$/);
  if (match) {
    const count = Number(match[1]);
    return `${prefix}${bullet}${count} ${count === 1 ? "ingredient es pot substituir" : "ingredients es poden substituir"} per alternatives veganes.`;
  }
  match = value.match(/^Ask whether it can be prepared without (.+)\.$/);
  if (match) return `${prefix}${bullet}Pregunta si es pot preparar sense ${translateMenuPhrase(match[1]!)}.`;
  match = value.match(/^Ask whether it can be prepared by omitting (.+)\.$/);
  if (match) return `${prefix}${bullet}Pregunta si es pot preparar sense ${translateMenuPhrase(match[1]!)}.`;
  match = value.match(/^Ask whether it can be prepared with (.+)\.$/);
  if (match) return `${prefix}${bullet}Pregunta si es pot preparar amb ${translateMenuPhrase(match[1]!)}.`;
  match = value.match(/^Ask whether the (.+) can be served (.+)\.$/);
  if (match) return `${prefix}${bullet}Pregunta si ${translateMenuPhrase(`the ${match[1]!}`)} es poden servir ${translateMenuPhrase(match[2]!)}.`;

  match = value.match(/^Use (\d+) tbsp aquafaba for (\d+) eggs?; whip it when the original eggs provide air or volume\.$/);
  if (match) return `${prefix}${bullet}Utilitza ${match[1]} cullerades d'aquafaba per a ${match[2]} ou${match[2] === "1" ? "" : "s"}; munta-la si els ous originals aporten aire o volum.`;
  match = value.match(/^Blend (\d+) g silken tofu until smooth for (\d+) eggs?; this works best for moisture and density, not whipping\.$/);
  if (match) return `${prefix}${bullet}Tritura ${match[1]} g de tofu sedós fins que quedi fi per substituir ${match[2]} ou${match[2] === "1" ? "" : "s"}; funciona millor per aportar humitat i densitat, no per muntar.`;
  match = value.match(/^Use enough commercial egg replacer for (\d+) eggs?, following that product's package ratio\.$/);
  if (match) return `${prefix}${bullet}Utilitza prou substitut comercial de l'ou per a ${match[1]} ou${match[1] === "1" ? "" : "s"}, seguint la proporció indicada a l'envàs.`;
  match = value.match(/^Replace (.+) 1:1 with (.+)\. Choose an unsweetened version for savoury recipes\.$/);
  if (match) return `${prefix}${bullet}Substitueix ${match[1]} en proporció 1:1 per ${replaceTerms(match[2]!)}. Tria'n una versió sense sucre per a receptes salades.`;
  match = value.match(/^Replace (.+) 1:1 with (.+), then reduce other liquid slightly if the mixture becomes too loose\.$/);
  if (match) return `${prefix}${bullet}Substitueix ${match[1]} en proporció 1:1 per ${replaceTerms(match[2]!)} i redueix una mica els altres líquids si la barreja queda massa fluida.`;
  match = value.match(/^Replace (.+) 1:1 with (.+?)(; make sure its flavour suits the dish)?\.$/);
  if (match) return `${prefix}${bullet}Substitueix ${match[1]} en proporció 1:1 per ${replaceTerms(match[2]!)}${match[3] ? "; comprova que el seu sabor encaixi amb el plat" : ""}.`;
  match = value.match(/^Start with (.+) (.+) instead of (.+) butter; add a little more only if the mixture is too dry\.$/);
  if (match) return `${prefix}${bullet}Comença amb ${match[1]} de ${replaceTerms(match[2]!)} en lloc de ${match[3]} de mantega; afegeix-ne una mica més només si la barreja queda massa seca.`;
  match = value.match(/^Use about 80% as much (.+) as butter, then adjust for texture\.$/);
  if (match) return `${prefix}${bullet}Utilitza aproximadament un 80% de ${replaceTerms(match[1]!)} respecte de la quantitat de mantega i ajusta-ho segons la textura.`;
  match = value.match(/^Start with (.+) (.+) and adjust for the desired texture\.$/);
  if (match) return `${prefix}${bullet}Comença amb ${match[1]} de ${replaceTerms(match[2]!)} i ajusta-ho fins a obtenir la textura desitjada.`;
  match = value.match(/^Use (.+) according to its package ratio for the recipe's total liquid; gelling agents are not interchangeable 1:1\.$/);
  if (match) return `${prefix}${bullet}Utilitza ${replaceTerms(match[1]!)} segons la proporció indicada a l'envàs per al líquid total de la recepta; els gelificants no són intercanviables en proporció 1:1.`;
  match = value.match(/^Start with the same weight of (.+), then adjust seasoning and cooking time\.$/);
  if (match) return `${prefix}${bullet}Comença amb el mateix pes de ${replaceTerms(match[1]!)} i ajusta el condiment i el temps de cocció.`;
  match = value.match(/^Start with a similar weight of (.+); add seaweed seasoning if a marine flavour is appropriate\.$/);
  if (match) return `${prefix}${bullet}Comença amb un pes semblant de ${replaceTerms(match[1]!)}; afegeix condiment d'algues si hi escau un sabor marí.`;
  match = value.match(/^Start with (.+) (.+) instead of (.+) animal fat\.$/);
  if (match) return `${prefix}${bullet}Comença amb ${match[1]} de ${replaceTerms(match[2]!)} en lloc de ${match[3]} de greix animal.`;
  match = value.match(/^Use about 80% as much (.+) as solid animal fat\.$/);
  if (match) return `${prefix}${bullet}Utilitza aproximadament un 80% de ${replaceTerms(match[1]!)} respecte de la quantitat de greix animal sòlid.`;
  match = value.match(/^Add nutritional yeast gradually to taste; it provides savoury flavour but is not a 1:1 texture replacement\.$/);
  if (match) return `${prefix}${bullet}Afegeix llevat nutricional gradualment al gust; aporta sabor umami, però no substitueix la textura en proporció 1:1.`;
  match = value.match(/^Use (.+); start with (.+) only where the product supports a direct substitution, and check its instructions\.$/);
  if (match) return `${prefix}${bullet}Utilitza ${replaceTerms(match[1]!)}; comença amb ${match[2]} només si el producte admet una substitució directa i comprova'n les instruccions.`;

  match = value.match(/^Mix (\d+) tbsp ground flaxseed with (\d+) tbsp water and rest for 10 minutes to replace (\d+) eggs?\.$/);
  if (match) return `${prefix}${bullet}Barreja ${match[1]} cullerada${match[1] === "1" ? "" : "es"} de llavors de lli moltes amb ${match[2]} cullerades d'aigua i deixa-ho reposar 10 minuts per substituir ${match[3]} ou${match[3] === "1" ? "" : "s"}.`;
  match = value.match(/^Measure (\d+) tbsp aquafaba and whip it if the original eggs provide air or volume\.$/);
  if (match) return `${prefix}${bullet}Mesura ${match[1]} cullerades d'aquafaba i munta-la si els ous originals aporten aire o volum.`;
  match = value.match(/^Blend (\d+) g silken tofu until smooth before adding it\.$/);
  if (match) return `${prefix}${bullet}Tritura ${match[1]} g de tofu sedós fins que quedi fi abans d'afegir-lo.`;
  match = value.match(/^Prepare enough commercial egg replacer for (\d+) eggs? according to its package\.$/);
  if (match) return `${prefix}${bullet}Prepara prou substitut comercial de l'ou per a ${match[1]} ou${match[1] === "1" ? "" : "s"} segons les instruccions de l'envàs.`;
  match = value.match(/^Mix (\d+) tbsp ground flaxseed with (\d+) tbsp water and rest for 10 minutes before the step that uses the eggs\.$/);
  if (match) return `${prefix}${bullet}Barreja ${match[1]} cullerada${match[1] === "1" ? "" : "es"} de llavors de lli moltes amb ${match[2]} cullerades d'aigua i deixa-ho reposar 10 minuts abans del pas que utilitza els ous.`;
  match = value.match(/^Prepare (.+) according to its package; different gelling agents require different temperatures and ratios\.$/);
  if (match) return `${prefix}${bullet}Prepara ${replaceTerms(match[1]!)} segons les instruccions de l'envàs; els diferents gelificants necessiten temperatures i proporcions diferents.`;
  match = value.match(/^Cook the (.+) appropriately; do not reuse the original meat cooking time as a safety rule\.$/);
  if (match) return `${prefix}${bullet}Cuina ${replaceTerms(match[1]!)} adequadament; per seguretat, no reutilitzis el temps de cocció de la carn original.`;
  match = value.match(/^Adjust the cooking method and time for (.+) instead of following the original fish timing\.$/);
  if (match) return `${prefix}${bullet}Ajusta el mètode i el temps de cocció per a ${replaceTerms(match[1]!)} en lloc de seguir el temps del peix original.`;

  return `${prefix}${bullet}${replaceTerms(value)}`;
}

export function localizeIngredientName(
  finding: Pick<IngredientFinding, "id" | "name">,
  language: Language,
): string {
  return language === "ca" ? ingredientNamesCa[finding.id] ?? finding.name : finding.name;
}

export function localizeIngredientReason(
  finding: Pick<IngredientFinding, "id" | "reason">,
  language: Language,
): string {
  return language === "ca" ? ingredientReasonsCa[finding.id] ?? localizeGeneratedText(finding.reason, language) : finding.reason;
}

export function localizeSuggestion(suggestion: string, language: Language): string {
  return language === "ca" ? substitutionsCa[suggestion] ?? replaceTerms(suggestion) : suggestion;
}

export function localizeGeneratedText(text: string, language: Language): string {
  if (language !== "ca" || !text) return text;
  return text.split(/\r?\n/).map(translateGeneratedLine).join("\n");
}
