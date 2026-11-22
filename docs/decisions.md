# Vegan Tools — Registre de decisions

Memòria del projecte entre sessions: **què es va decidir, per què i què es va descartar**. El roadmap diu què toca fer; això explica per què les coses són com són.

**Com s'usa**
- Una entrada per decisió no òbvia, la més nova a dalt. Tres o quatre línies; si cal més, enllaça.
- No s'esborra ni es reescriu: si una decisió canvia, s'afegeix una entrada nova que digui quina substitueix.
- Llegeix-lo abans de proposar canvis d'abast o de reobrir un tema.
- Cada entrada indica l'origen: **(Nils)** si ho ha dit ell, **(deduït)** si surt del codi o de documents antics i ningú ho ha confirmat.

---

## 2026-11-22 — Receptes desactivades fins que tinguin la qualitat de la resta
- **Decisió**: el receptari i el veganitzador de receptes queden amagats (enllaços, targeta de la portada i rutes `/recipes`, que redirigeixen a l'inici). El codi es manté; es tornen a activar amb `RECIPES_ENABLED` a `apps/web/src/features.ts`. **(Nils)**
- **Per què**: «millor un abast més limitat però d'alta qualitat que no pas qualitat heterogènia». **(Nils)** Matisa l'entrada «L'abast ampli és deliberat» del 16-11: l'amplitud es manté on la qualitat és alta.

## 2026-11-22 — Escàner universal: un enrutador determinista, sense model ni MCP
- **Context**: Nils va proposar un classificador de categoria i potser un MCP amb una eina per a cada tipus de producte, i treure el requadre verd de la càmera. **(Nils)**
- **Decisió**: `classifyScannedCode` (domini) decideix què és cada codi: producte (codi de barres amb dígit de control vàlid, QR GS1 Digital Link, enllaç d'Open Facts), carta de restaurant, altre enllaç o text. La categoria del producte (alimentació, cosmètica, altres) la dona la base de dades que el coneix: Open Food, Beauty i Products Facts, consultades alhora. **(deduït)**
- **Per què no un model ni un MCP**: el codi ja diu què és, així que un model només afegiria latència, cost i errors a una decisió exacta. Un MCP serveix perquè un agent d'IA cridi eines; aquí no hi ha cap agent a l'escàner. **(deduït)**
- **Requadre verd retirat**: el lector analitza tota la imatge, i el requadre feia creure que el codi hi havia de cabre. **(Nils ho va suggerir)**
- **Qualitat de lectura**: els codis amb dígit de control incorrecte s'ignoren com a lectures errònies; Full HD, enfocament continu i llanterna quan el mòbil en té.
- **QR de carta**: obre `/scan/menu`, que analitza la carta i mostra què es pot demanar.

## 2026-11-22 — El diari de visites era llegible per qualsevol
- **Trobat** (deduït): `GET /v1/users/:id/visits` no demanava autenticació, i el diari inclou notes personals. Ara només el pot llegir el propietari. El Top 4 continua sent públic (no conté notes).
- **Esborrat de compte**: `DELETE /v1/users/me` esborra ressenyes, visites, Top 4 i l'usuari de Supabase Auth; si un pas falla, la petició falla i l'app no diu que s'ha esborrat. Cal aplicar la migració `202611220001_account_deletion.sql` a Supabase.

## 2026-11-22 — Comptadors d'ús agregats, sense pantalla pròpia
- **Decisió**: taula `usage_counters` (dia, mètrica, recompte) amb peticions per plantilla de ruta, encerts de la memòria cau de cartes i crides i tokens de Gemini per funció. Es consulten al tauler de Supabase; no s'ha fet cap endpoint ni panell. **(deduït, AGENTS.md §4.7)**
- **Privacitat**: mai identificadors d'usuari, ubicacions, cerques ni identificadors de restaurant.
- **Límit conegut**: «cartes consultades per setmana» (la mètrica nord) s'aproxima amb `menus.cache.hit` i les rutes de cartes; les cartes curades que el web mostra sense passar per l'API no es compten.

## 2026-11-22 — Mapa: només millores internes mentre es decideix el fons
- **Fet**: en passar el ratolí per la llista ja no es reconstrueixen tots els marcadors, i les etiquetes de nom només es creen on es veuen. Sense canvi visible. **(deduït)**
- **No fet**: la migració a MapLibre sol (proposta pendent del roadmap). L'ordre de fons preferit del mateix dia (CARTO, Geoapify, OpenFreeMap) fa que MapLibre només es carregui com a reserva, així que cal tornar a mesurar abans de decidir. **(deduït)**

## 2026-11-22 — Ordre preferit dels fons del mapa
- **Preferència**: CARTO Voyager primer, Geoapify OSM Bright Smooth segon, i OpenFreeMap com a fallback sense clau. Quan una font falla, el mapa passa a la següent. **(Nils)**
- **Per què**: Nils recorda que els fons anteriors tenien més color que OpenFreeMap `positron`. Voyager i OSM Bright Smooth necessiten clau gratuïta (CARTO des del 25-09-2026 i Geoapify); sense claus el mapa segueix funcionant amb OpenFreeMap. **(Nils)**
- **Protomaps**: Nils el vol com a tercera opció, però encara no és possible: el fitxer PMTiles del planeta fa uns 120 GB i l'API allotjada necessita clau. Pendent de decidir on s'allotja. **(deduït)**
- **Atribució**: s'escurça a «© OpenFreeMap © OpenMapTiles © OpenStreetMap», i es treu el prefix «Leaflet». **(Nils ho va demanar)**

## 2026-11-22 — Idioma accessible sense compte
- **Problema**: sense iniciar sessió no es podia canviar l'idioma (ni el tema). El selector de la capçalera es va treure el 3-10-2026 (`7b5cd94`) en crear la pàgina de Configuració, que només s'enllaçava des del perfil amb sessió. **(Nils ho va detectar)**
- **Decisió**: tornar el selector de banderes a la capçalera, a totes les pàgines, i mostrar l'enllaç a Configuració també al perfil sense sessió. **(Nils va triar «capçalera i perfil»)**
- **Retirat**: `SettingsModal.tsx`, la versió antiga de la configuració, que no s'usava enlloc. **(deduït)**
- **Pendent de valorar**: els botons de bandera fan 28×19 px, per sota dels 44 px recomanats per tocar amb el dit; és el disseny original i no s'ha canviat.

## 2026-11-21 — `main` protegida: tot entra per PR amb la CI en verd
- **Decisió**: protecció de branca a GitHub sobre `main`, també per a administradors: cal una PR (sense aprovació obligatòria, perquè és un sol desenvolupador) i que passin Typecheck, Tests, Audits, Production build i E2E. Sense force-push ni esborrat de `main`. Les branques remotes s'esborren en fusionar. **(Nils va dir que sí)**
- **Per què**: el 15-11-2026 una fusió d'una sessió d'agent (`ccb8f9b`) va trencar `main` perquè es va pujar sense esperar la CI. Amb diversos agents treballant en paral·lel, és el control que atura un error abans de producció. **(deduït)**
- **Alternativa descartada**: construir arquitectura d'IA pròpia (orquestració d'agents, indexació del codi). Els problemes reals havien estat de verificació i de context, no de falta d'eines. **(deduït; Nils ho havia preguntat)**
- **Fusió automàtica** (22-11-2026): activada al repositori perquè una PR es fusioni sola quan passa la CI. **(Nils)**
- **Conseqüència**: la CI només s'executa en PR i en pujades a `main`, així que el flux és sempre branca → PR → fusió. `strict` desactivat: no cal rebasar una PR si `main` ha avançat.

## 2026-11-18 — Velocitat: cap canvi de producte sense validar-lo
- **Decisió**: els objectius de velocitat estan bé, però no es canvia la interfície, els serveis ni els proveïdors només perquè potencialment siguin més ràpids sense comentar-ho abans. **(Nils)**
- **Com s'aplica**: si una mesura suggereix un canvi visible o de servei, es proposa amb la xifra i s'espera el sí. Els arranjaments interns invisibles i els bugs no cal consultar-los. Regla a `AGENTS.md` §4.7.
- **Revisió del que ja es va fer el mateix dia**:
  - Els vídeos de `/recursos` ara es carreguen en prémer «Reprodueix». És un canvi visible fet per velocitat i privacitat (YouTube enviava la IP de cada visitant a Google). Validat per en Nils el mateix dia: es manté. **(Nils)**
  - Motor de l'escàner compilat amb l'app en lloc de baixar-lo de jsdelivr: canvi intern, sense efecte visible; arregla el funcionament sense connexió i la petició a tercers.
  - Fragments del build i la funció d'icones de cuina en un mòdul a part: interns.
  - «Mapa ràpid al mòbil» i «Portada més lleugera» queden al roadmap com a propostes pendents de validar.

## 2026-11-18 — Proves de mòbil i escriptori, i un estàndard de velocitat
- **Context**: Nils va trobar que la càmera no funcionava a l'escàner de codis (com si no tingués permís) però sí a la foto d'ingredients, i que hi ha processos lents. Va demanar que les proves ho tinguessin en compte i que hi hagués un estàndard de qualitat i de velocitat. **(Nils)**
- **Causa del bug** (deduït): des del 29-10-2026 (`db9efd8`) l'escàner demanava formats (aztec, data_matrix, pdf417) que el polyfill ZBar no suporta, i el seu constructor llança un error. Afectava tots els dispositius sense `BarcodeDetector` natiu (iPhone, Firefox, Chrome de Windows). L'error es capturava amb els de permís i mostrava «No es pot accedir a la càmera». L'única prova que hi havia simulava el component sencer.
- **Decisions**:
  - Proves E2E amb Playwright en un perfil d'escriptori i un de mòbil, contra el build de producció i amb l'API simulada. L'escàner es prova amb una càmera falsa que mostra un EAN-13 real.
  - Pressupostos de JavaScript per ruta com a porta dura (són deterministes), i límits de temps amplis a la CI perquè les proves no siguin inestables. Estàndard a `architecture.md` §8.
  - E2E a `npm run check` i a la CI. **(deduït del que va demanar Nils)**
- **Trobat i arreglat de passada** (deduït):
  - El polyfill carregava el motor ZBar des de `cdn.jsdelivr.net` a cada visita a l'escàner: no funcionava sense connexió i feia una petició a tercers. Ara es compila amb l'app i es pre-carrega.
  - Els vídeos de `/recursos` (YouTube) es carregaven sempre, tot i `loading="lazy"`: 1,4 MB de JavaScript i la IP del visitant enviada a Google. Ara només es carreguen en prémer «Reprodueix»; la pàgina baixa a 200 kB.
  - La portada i la fitxa de restaurant carregaven Leaflet per una funció d'icones, i totes les pàgines carregaven l'escàner per culpa de l'ajudant de precàrrega de Vite.
- **Descartat per ara**: WebKit (iPhone) a la CI. La càmera falsa només existeix a Chromium, i el camí del polyfill és el mateix.

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
