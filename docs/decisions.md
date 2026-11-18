# Vegan Tools — Registre de decisions

Memòria del projecte entre sessions: **què es va decidir, per què i què es va descartar**. El roadmap diu què toca fer; això explica per què les coses són com són.

**Com s'usa**
- Una entrada per decisió no òbvia, la més nova a dalt. Tres o quatre línies; si cal més, enllaça.
- No s'esborra ni es reescriu: si una decisió canvia, s'afegeix una entrada nova que digui quina substitueix.
- Llegeix-lo abans de proposar canvis d'abast o de reobrir un tema.
- Cada entrada indica l'origen: **(Nils)** si ho ha dit ell, **(deduït)** si surt del codi o de documents antics i ningú ho ha confirmat.

---

## 2026-11-18 — PostGIS retirat per l'avís crític de seguretat de Supabase
- **Context**: el Security Advisor de Supabase va marcar com a crític `rls_disabled_in_public` (14-11-2026). La causa és `public.spatial_ref_sys`, la taula de PostGIS: és de `supabase_admin`, així que no s'hi pot activar RLS (les migracions de l'octubre ho intentaven i s'empassaven l'error), i la clau pública hi podia escriure. Comprovat el 18-11 amb escriptures que no afecten cap fila: no donen error de permís. **(deduït)**
- **Risc real**: no exposava dades d'usuaris (són definicions de sistemes de coordenades), però qualsevol podia esborrar-les i trencar les consultes espacials.
- **Decisió**: treure PostGIS i `btree_gist` del tot (`202611180001_drop_postgis.sql`). L'única columna que el feia servir, `venues.location`, s'escrivia però no es consultava mai; la ubicació real són `latitude` i `longitude`.
- **Descartat**: moure PostGIS a l'esquema `extensions`, que és el que recomana Supabase. Amb una columna `geography` cal esborrar-la i refer-la, o demanar-ho al suport, per a una extensió que no s'usa.
- **Si algun dia calen consultes espacials al servidor**: instal·lar PostGIS a `extensions` des del principi (`create extension postgis with schema extensions`), mai a `public`.

## 2026-11-16 — Hosting i base de dades: els límits no són el problema, les arrencades en fred sí
- **Context**: Nils va preguntar si 500 MB de DB (Supabase gratuït) i 512 MB de RAM (Render gratuït) eren massa justos i si calia buscar opcions més generoses i fiables. També que Supabase «sovint falla i es para».
- **Mesures** (deduït):
  - L'API, sense el model ONNX, ocupa uns **70 MB de RAM** després de servir peticions. Les pujades de PDF i fotos (fins a 10 MB) l'apugen puntualment, però queda molt lluny de 512 MB.
  - Una carta analitzada són uns 3–5 kB de JSON (les curades); amb un marge generós de 50 kB per carta, 500 MB donen per a **unes 10.000 cartes**. L'objectiu de la fase 2 són 500 (≈25 MB). El que pot créixer més és la memòria cau de productes d'Open Food Facts.
- **El problema real**: el pla gratuït de Render adorm l'API després de 15 minuts i tarda prop d'un minut a tornar; Supabase gratuït es pausa després de 7 dies sense activitat (cobert pel workflow de keep-alive).
- **Decisió**: **cap quota mensual de moment (Nils)**. Es queda Supabase gratuït i Render gratuït. «Si el que hi ha ara és la millor opció gratuïta, seguim així.»
  - Supabase va avisar de pausa el novembre de 2026 tot i que el keep-alive s'executava cada dia amb èxit: feia **una sola consulta** diària, i Supabase demana «unes quantes peticions d'usuari a la base de dades cada dia». Ara s'executa cada 4 hores i llegeix quatre taules públiques (unes 24 consultes al dia). Si tot i així es pausa, es pot reactivar des del tauler durant 90 dies.
  - Quan es vulgui pagar: Render Starter (~7 $/mes) per a l'API i Supabase Pro (~25 $/mes) per a la DB. Alternativa gratuïta per a l'API: Cloud Run (cal compte de facturació).
- **Descartat**:
  - **Oracle Cloud Always Free**: molt generós sobre el paper, però el 2026 hi ha informes de retallada de la quota ARM i reclama instàncies que considera inactives. No és «fiable».
  - **Neon** (1 GB gratuït): només dobla l'espai, i deixar Supabase vol dir substituir també l'Auth, les polítiques RLS i l'Storage.
  - **VPS propi (Hetzner, ~4–6 €/mes, 4 GB)**: maquinari generós, però afegeix manteniment (actualitzacions, TLS, còpies de seguretat) per a un sol desenvolupador, i les gammes més barates tenen disponibilitat irregular el 2026.
- **Preus**: tots de fonts de tercers de novembre de 2026; cal confirmar-los a les pàgines oficials.

## 2026-11-16 — Avaluació del stack: què es manté, què es retira
- **Retirat**: tot el camí del model propi. `edge-classifier.ts`, les dependències `onnxruntime-node` i `@huggingface/transformers` (~430 MB a `node_modules`, instal·lats a cada build de Render i a cada job de la CI), els 19 scripts de Python d'entrenament i avaluació, l'índex antic `taxonomy.json` (793 kB, cap ús) i `ingredient-normalizer.ts`. El repositori passa a ser només TypeScript. Tot és a l'historial de git. **(deduït; Nils va dir que el model no es va pujar perquè no funcionava)**
- **Retirat**: Tailwind CSS. Les pantalles no fan servir cap classe d'utilitat; només aportava el reset (preflight) i generava classes a partir de paraules soltes del codi (`.hidden`, `.border`, `.transition`). El reset és ara a `apps/web/src/base.css`, a les mateixes capes de cascada, i `.animate-spin` és l'única utilitat que es conserva. **(deduït)**
- **Desfet**: cinc cartes reals de restaurants (PDF i text rastrejat) que eren a `apps/api/data/menu-sources/` per error, tot i estar al `.gitignore`. Es mantenen al disc local, no al repositori. **(deduït)**
- **Es manté**: React 19 + Vite 7, Fastify 5, Zod 4, Supabase, `@google/genai`, TanStack Query, Vitest. Són actuals i no hi ha cap problema que justifiqui canviar-los.
- **Pendent, al roadmap**: mapa només amb MapLibre (dos motors de mapa avui) i treure les arrencades en fred de l'API abans de la beta. No es van fer ara perquè el primer és una reescriptura visual que cal provar a mòbil i el segon depèn del compte de Render.
- **Descartat**: migrar el frontend de Render a Cloudflare Pages. El lloc estàtic de Render ja serveix des de CDN i no s'adorm; el guany no compensa la feina.

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
- **Decisió**: l'Edge Classifier queda fora de producció. Retirat del repositori el mateix dia (vegeu «Avaluació del stack»).
- **Per què**: no es va pujar perquè els resultats no eren prou bons **(Nils)**. L'informe de benchmark antic i el roadmap el donaven per completat i això era incorrecte: llindar de carn a 0,02, macro F1 de 0,12–0,29, cap `.onnx` exportat.

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
