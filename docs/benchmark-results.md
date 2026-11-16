# Vegan Tools — Estat real de la classificació d'ingredients

*Mesurat el 2026-11-16 sobre `classifyIngredients` de producció (`packages/domain`), abans (versió `2026.07.4`) i després (versió `2026.11.2`).*
*Compte: `scripts/benchmark-ml-classifier.py` sobreescriu aquest fitxer si es torna a executar, amb una plantilla antiga que marca la latència com a ✅ sense comprovar-la.*

## Què decideix un veredicte en producció

- **Escàner per codi de barres** (`GET /v1/products/:gtin`): classificador de domini sobre el text d'ingredients d'Open Food Facts, corregit per les etiquetes d'anàlisi d'OFF (`non-vegetarian`, `non-vegan`, `vegan`). El resultat mai és `definitive`.
- **Etiqueta fotografiada o escrita**: el web classifica en local amb el mateix codi (`apps/web/src/api.ts`, `assurance: "label_based"`).
- **Cartes de restaurant**: Gemini; no passen per aquí.
- **Model ONNX**: no intervé. No existeix cap `.onnx` exportat i `/data/` és a `.gitignore`. Tampoc hi ha cap fallback a Gemini en aquest flux; Gemini només fa l'OCR.

## Com funciona ara el classificador

1. **Diccionari escrit a mà** (`ingredient-dictionary.ts`, 32 entrades): ingredients amb explicació, número E i substitucions.
2. **Lèxic d'Open Food Facts** (`animal-lexicon.ts` + `data/animal-lexicon.json`): 2.521 termes de carn i peix i 1.725 de lactis, ous i abelles, en català, castellà, anglès, francès, alemany i italià. Es regenera amb `npm run build:lexicon`.
3. **Sense coincidències**: `probably_vegan` no definitiu. Només una declaració vegana verificada o l'etiqueta `vegan` d'OFF donen `vegan`.

## Mesures

«Fals vegà» = el text conté l'ingredient i el veredicte és `vegan` o `probably_vegan`.

### Conjunt daurat (182 etiquetes escrites a mà)

| | Abans | Després |
|---|---|---|
| Carn o peix llegit com a vegà | 7/38 (18,4 %) | **0/38** |
| Lactis, ou o mel llegit com a vegà | 6/34 (17,6 %) | **0/34** |
| Producte vegetal marcat com a sospitós | 6/90 (6,7 %) | 4/90 (4,4 %) |

Abans fallava en alemany (4/5 amb carn) i italià (3/4). Aquest conjunt és ara una prova automàtica (`packages/domain/src/golden-benchmark.test.ts`) que bloqueja la CI.

### Conjunt de test sintètic (3.430 mostres)

| | Abans | Després |
|---|---|---|
| Carn o peix llegit com a vegà | 205/325 (63,1 %) | 4/325 (1,2 %) |
| Lactis, ou o mel llegit com a vegà | 90/207 (43,5 %) | 0/207 |
| Producte vegetal marcat com a sospitós | 52/2.648 (2,0 %) | 17/2.648 (0,6 %) |

### Comprovació amb 44 exemples nous

Etiquetes escrites després de construir el lèxic, sense mirar-ne el resultat abans: 41 de 44 correctes a la primera (fallaven «Leberwurst», «vongole» i «yoghurt»). Corregits després amb una regla per a compostos alemanys, una per a plurals i les variants de «iogurt».

### Rendiment

0,9 ms per llista en un portàtil. El lèxic afegeix 82 kB (sense comprimir) al paquet web.

## Com llegir-ho amb prudència

- **El conjunt sintètic no és una prova independent.** Es va generar des de la mateixa taxonomia d'OFF d'on surt el lèxic, així que el 1,2 % és optimista.
- **El conjunt daurat tampoc ho és del tot.** El vaig fer servir per afinar (el cas «Hühnerfleisch» es va afegir en veure'l fallar).
- **La dada més honesta és la dels 44 exemples nous: 93 % a la primera**, i és una mostra petita.
- **No s'ha provat amb sortida d'OCR** (errors de lectura, paraules partides) ni amb un volum gran de textos reals d'OFF.

## Errors coneguts

- **Falsos vegans que queden** al sintètic: nucleòtids en romanès i finès (idiomes fora del lèxic), «hueso» i «spot» (exclosos expressament per col·lisions amb «huesos de albaricoque» i l'anglès comú).
- **Falsos positius**: «lecitina de gira-sol», «lecitina de soja» i «aroma natural de vainilla» surten com a dubtosos pel diccionari antic, tot i declarar origen vegetal. «Iogurt vegetal de soja» amb «ferments de iogurt» surt com a vegetarià.
- **Col·lisions entre idiomes**: un mot animal en un idioma pot ser un mot corrent en un altre. Hi ha una llista d'exclusions a `scripts/build-animal-lexicon.mjs`; n'apareixeran més.

## Model ML: no és utilitzable

- Llindars a `data/models/decision_config.json`: 0,02 (carn), 0,05 (lactis), 0,10 (dual). Amb 0,02 gairebé tot es marca com a carn; d'aquí venia el 100 % de recall de l'informe antic.
- Macro F1 de validació 0,29 (criteri ≥ 0,92); F1 de lactis i d'additius 0,00 al test antic. Latència p50 de 45 ms (criteri < 25 ms).
- El codi d'integració (`edge-classifier.ts`, `routes/products.ts`) segueix al repositori. Amb el model actual, passaria gairebé qualsevol llista a `non_vegetarian` definitiu.

## Scripts

- `npm run build:lexicon` regenera el lèxic (necessita `data/dataset/raw/ingredients.json`, que no és al repositori).
- `scripts/evaluate-golden-benchmark.py` avalua un regex propi en Python, no el codi de producció. La prova bona és `golden-benchmark.test.ts`.
