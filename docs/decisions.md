# Vegan Tools — Registre de decisions

Memòria del projecte entre sessions: **què es va decidir, per què i què es va descartar**. El roadmap diu què toca fer; això explica per què les coses són com són.

**Com s'usa**
- Una entrada per decisió no òbvia, la més nova a dalt. Tres o quatre línies; si cal més, enllaça.
- No s'esborra ni es reescriu: si una decisió canvia, s'afegeix una entrada nova que digui quina substitueix.
- Llegeix-lo abans de proposar canvis d'abast o de reobrir un tema.
- Cada entrada indica l'origen: **(Nils)** si ho ha dit ell, **(deduït)** si surt del codi o de documents antics i ningú ho ha confirmat.

---

## 2026-11-16 — Cobertura del classificador: lèxic generat des d'Open Food Facts
- **Decisió**: el classificador combina el diccionari escrit a mà (32 entrades, amb explicacions i substitucions) amb un lèxic de ~4.250 termes animals en català, castellà, anglès, francès, alemany i italià, generat amb `npm run build:lexicon` des de la taxonomia d'OFF. Versió `2026.11.2`. **(Nils va triar aquesta via)**
- **Per què**: determinista, gratuït, offline i funciona també al classificador local del web. **Descartat**: delegar a Gemini els textos no reconeguts (cost, latència, xarxa) i reprendre el model ONNX.
- **Detalls que no són evidents**:
  - L'estat dietètic s'hereta pels `parents` de la taxonomia: OFF marca «fish» però no «cod». `taxonomy.json` (l'índex antic) no ho feia i per això no servia.
  - Un mot animal seguit o precedit d'un qualificador vegetal no compta («llet de coco», «rice milk», «carn de soja», «formatge vegetal»), i tampoc si es troba dins d'un terme vegà més llarg («cocoa butter»).
  - Hi ha una llista de termes exclosos per col·lisions entre idiomes («sole», «rind», «os», «coccio», «hueso»). Si apareix un fals positiu estrany, és el primer lloc on mirar: `scripts/build-animal-lexicon.mjs`.
  - Les dades en brut (`data/dataset/raw/`) no són al repositori; el JSON generat sí.
- **Porta de CI**: `golden-benchmark.test.ts` executa el classificador de producció sobre 182 etiquetes i falla si llegeix un producte animal com a vegà.
- **Límit conegut**: el conjunt daurat es va fer servir per afinar, així que ja no és una prova independent. Falta validar amb productes reals i amb sortida d'OCR.

## 2026-11-16 — «No he reconegut res» deixa de voler dir «vegà»
- **Decisió**: `classifyIngredients` retorna `probably_vegan` no definitiu quan no troba cap coincidència. Només una declaració vegana verificada o l'etiqueta `vegan` d'Open Food Facts poden donar `vegan`. Versió del classificador `2026.11.1`.
- **Per què**: el diccionari té 32 entrades i tot el que no reconeixia sortia com a `vegan` definitiu («Schweinefleisch, Speck», «bacallà», «chorizo»). Contradeia la norma de precaució d'`architecture.md` §6. Mesures a [`benchmark-results.md`](./benchmark-results.md).
- **No resolia**: la cobertura, que era la prioritat número 1 **(Nils)**. Resolta el mateix dia amb l'entrada de sobre.

## 2026-11-16 — El model ONNX no és a producció
- **Decisió**: l'Edge Classifier queda fora de producció i aparcat fins que es decideixi si es reprèn o es retira.
- **Per què**: no es va pujar perquè els resultats no eren prou bons **(Nils)**. L'informe de benchmark antic i el roadmap el donaven per completat i això era incorrecte: llindar de carn a 0,02, macro F1 de 0,12–0,29, cap `.onnx` exportat.
- **Compte**: el codi d'integració (`edge-classifier.ts`, `routes/products.ts`) segueix al repositori. Si algú hi posés el model actual, marcaria gairebé tot com a no vegetarià.

## 2026-11-16 — L'abast ampli és deliberat
- **Decisió**: no es retallen ni es congelen superfícies del producte. **(Nils)**
- **Per què**: l'amplitud impressiona i pot retenir usuaris que busquen coses diferents. Els punts forts són el **lector de cartes** i l'**escàner** (idealment universal). El receptari encara és pobre. Recursos és una sola pàgina, no una funcionalitat.
- **Descartat**: la «regla de congelació» que proposava l'anàlisi de product owner d'aquesta mateixa data.

## 2026-11-16 — Organització lleugera, sense Scrum
- **Decisió**: res de sprints ni PIs. Roadmap en tres blocs (Ara, màxim 5 ítems / Després / Aparcat), els ítems completats s'esborren del roadmap, i aquest registre conserva el context. **(Nils)**
- **Per què**: un sol desenvolupador que treballa a ràfegues; el context es perdia entre converses separades i la documentació quedava desfasada.
- **Objectius i mètriques**: les fases i xifres del roadmap són hipòtesis inicials de l'anàlisi, pendents de revisar després de la beta.

## 2026-11-15 — No se sol·licita NLnet
- **Decisió**: no s'hi aplica; primer pas de finançament, Liberapay i GitHub Sponsors. **(deduït de `funding/funding-options.md`)**
- **Per què**: la política d'IA de NLnet exclou propostes i codi fets amb IA.

---

## Decisions anteriors (sense data exacta, recuperades del roadmap antic)

- **Filtres d'al·lèrgies exclosos.** Risc mèdic greu (anafilaxi, contaminació creuada) si algú confia en la IA o l'OCR. L'app tracta només la composició ètica. **(deduït)**
- **Destacats curats 100 % vegans per contracte**, validat per `npm run audit:pins`. Abans el catàleg barrejava locals no vegans. **(deduït)**
- **Cap menció a HappyCow** a la interfície. Era una afirmació falsa («pins HappyCow») i un risc de marca registrada. **(deduït)**
- **Filtre «Obert ara» desactivat** fins que la cobertura d'horaris superi el 90 %. Amb dades parcials, el filtre amaga locals oberts. **(deduït)**
- **«Opcions veganes» fora dels tres filtres principals**, al calaix de filtres addicionals, per no omplir la cerca inicial de locals carnis. **(deduït)**
- **Begudes fora de l'anàlisi de cartes per defecte** (`includeDrinks`), per estalviar tokens de Gemini. **(deduït)**
- **`modifiableTo` només si la carta ho diu textualment.** El model no pot inferir adaptacions pel seu compte. **(deduït)**
- **Les etiquetes d'anàlisi d'Open Food Facts no compten com a declaració fiable** (`verifiedVeganClaim: false`): són dades comunitàries. **(deduït del codi)**
- **Imatges de productes no vegetarians difuminades per defecte** a l'escàner, amb opció de destapar-les per comprovar el codi de barres (Espai Segur). **(deduït)**
