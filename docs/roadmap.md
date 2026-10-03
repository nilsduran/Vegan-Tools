# Vegan Tools — Full de Ruta (Roadmap) & Priorització Estratègica

Aquest document estableix l'estat del desenvolupament, les fites consolidades i la planificació d'enginyeria de **Vegan Tools**, ordenada estrictament segons la matriu de **Dificultat i Importància**:

1. 🟢 **Nivell 1: Canvis petits i senzills però importants** (*Quick Wins d'Alt Impacte*)
2. 🟡 **Nivell 2: Canvis petits i no tant importants** (*Poliment, Neteja i Deute Tècnic Menor*)
3. 🟠 **Nivell 3: Canvis mitjans-grans importants** (*Arquitectura, Seguretat i Funcionalitats Clau*)
4. 🔵 **Nivell 4: Canvis grans o molt grans però no prioritaris** (*Expansió Futura i Llarg Termini*)

---

## 🟢 Nivell 1: Canvis Petits i Senzills però Importants (Quick Wins) — ✅ COMPLETAT

Tasques de baixa complexitat tècnica amb un impacte immediat i directe en la fiabilitat de la informació, l'experiència d'usuari i els principis ètics de l'aplicació.

### 🗺️ Mapa Interactiu (`/map`)
1. **✅ [COMPLETAT] Corregir la classificació dietètica a la fitxa (`RestaurantDetailPane.tsx`)**:
   - *Problema*: La funció `getVeganBadge()` només comprova si `restaurant.name` conté la subcadena `"vegan"`, `"vegà"` o `"plant-based"`. Ignora completament `restaurant.isVegan`, `restaurant.tags`, `restaurant.cuisine` i `restaurant.diet`. Locals de referència 100% vegans (*Alive Restaurant*, *Rasoterra*, *Bionèctar*, *Roots & Rolls*, *Flax & Kale*) es mostren erròniament com a «Opcions veganes» (`badge-vegan-options`).
   - *Solució*: Refactoritzar `getVeganBadge` per prioritzar `restaurant.isVegan === true`, etiquetes `tags.includes("vegan")` i dades estructurades abans de recórrer al nom.
2. **✅ [COMPLETAT] Corregir els predicats defectuosos als filtres ràpids (`FilterPills.tsx`)**:
   - *Filtre Restaurant*: La condició `!c.tags?.includes("ice_cream")` fa que pràcticament qualsevol negoci que no sigui una gelateria (cafeteries, fleques, hamburgueseries) coincideixi com a restaurant general.
   - *Filtre Opcions Veganes*: La regla `(c.tags && c.tags.length > 0 && !c.tags.includes("carnivore_only"))` assigna el distintiu d'opcions veganes a qualsevol local amb una etiqueta qualsevol (com `cafe` o `fast_food`) sense cap verificació d'oferta vegetal real.
   - *Solució*: Endurir els predicats per exigir tags dietètics contrastats (`diet.vegan`, `diet.vegetarian`, `cuisine`, o plats analitzats).
3. **✅ [COMPLETAT] Eliminar el doble salt brusc al BottomSheet mòbil (`BottomSheet.tsx`)**:
   - *Problema*: A la barra de subjecció (`.bottom-sheet-handle-bar`) s'activa tant la detecció de gest a `onDragEnd` (`deltaY < 6 && deltaTime < 220`) com l'esdeveniment natiu de clic (`onClick={cycleSnapPoint}`). Un sol toc dispara `cycleSnapPoint()` dues vegades consecutives, saltant-se l'estat intermedi (`half`) i passant bruscament de `collapsed` a `expanded`.
   - *Solució*: Eliminar l'esdeveniment `onClick` redundant i controlar el cicle d'estats exclusivament des de la finalització del gest.
4. **✅ [COMPLETAT] Eliminar les bafarades invasives de validació HTML5 (`SearchTypeahead.tsx`)**:
   - *Problema*: L'element `<input>` té definits els atributs `required` i `minLength={2}` dins d'un `<form>`. En prémer `Enter` amb un text curt o buit, el navegador llança una bafarada HTML5 emergent que bloqueja la interacció i tapa la pantalla.
   - *Solució*: Eliminar `required` i `minLength` natius de l'HTML i gestionar la validació de manera silenciosa a `handleSubmit`.
5. **✅ [COMPLETAT] Harmonització cromàtica dels pins del mapa (`RestaurantMap.tsx`)**:
   - *Problema*: El codi utilitza actualment lila (`#7c3aed`) per a vegetarià i gris pissarra (`#475569`) per a opcions, discrepant de la guia botànica.
   - *Solució*: Aplicar la paleta acordada: verd bosc (`#047857`) per a 100% vegà, ambre (`#d97706`) per a vegetarià i blau (`#2563eb`) per a opcions veganes.

### 🍳 Receptari (`/recipes`)
6. **✅ [COMPLETAT] Eliminar l'anti-patró de React a l'editor del Veganitzador (`RecipeVeganizerPage.tsx`)**:
   - *Problema*: L'àrea de text editable (`<textarea>`) passa la seva propietat `value` per `localizeGeneratedText(veganizedText, language)` a cada cicle de render. Quan l'usuari intenta editar el text, la funció de traducció el muta en temps real i desplaça el cursor al final de la caixa a cada tecla premuda.
   - *Solució*: Guardar el text traduït a l'estat quan es rep la resposta de l'API i passar directament `value={veganizedText}` sense transformacions dinàmiques al render.

### 🔍 Escàner & Ètica (`/scanner`, `/`)
7. **✅ [COMPLETAT] Protecció de l'Espai Segur (Safe Space) per a fotos d'Open Food Facts (`ProductScannerPage.tsx` & `styles.css`)**:
   - *Problema*: La funció `lookupOpenFoodFacts` retorna directament `imageUrl: product.image_front_url`. Quan s'escaneja un producte carni o pesquer, la fotografia de l'envàs es mostrava sense cap filtre a `ProductScannerPage.tsx`.
   - *Solució*: Per als productes classificats com a `non_vegetarian`, la imatge es mostra per defecte amb un difuminat protector (`filter: blur(18px)`) i un botó que permet a l'usuari retirar el difuminat per verificar la coincidència del codi de barres.
8. **✅ [COMPLETAT] Substitució de la icona Apple Touch SVG per PNG (`index.html`)**:
   - *Problema*: `index.html` tenia definit `<link rel="apple-touch-icon" href="/icon.svg" />`. Safari a iOS no admet fitxers SVG per a icones d'inici i mostra un quadrat negre buit a la pantalla d'inici dels iPhone.
   - *Solució*: Generar i vincular un fitxer PNG estàndard de 180x180 px (`apple-touch-icon.png`).

### 📱 UI & Navegació Mòbil
9. **✅ [COMPLETAT] Resolució de la doble barra de navegació mòbil a Capacitor (`App.tsx` / `styles.css`)**:
   - *Problema*: En plataformes natives es renderitzaven tant `.mobile-bottom-nav` com `.bottom-nav`. A més, `.bottom-nav` tenia definit per CSS `grid-template-columns: repeat(4, 1fr)` mentre hi ha 5 enllaços de navegació, trencant l'alineació visual del cinquè element.
   - *Solució*: Unificar en un sol component de navegació inferior net amb 5 columnes adaptables.
10. **✅ [COMPLETAT] Eliminació de mencions no autoritzades a HappyCow (`HomePage.tsx`)**:
    - *Problema*: La portada afirmava que el mapa té «pins HappyCow», afirmació errònia que generava confusió i riscos de marca registrada.
    - *Solució*: Substituir la frase per referències transparents a OpenStreetMap i al catàleg curat propi de Vegan Tools.

### 🌐 Internacionalització & Terminologia
11. **✅ [COMPLETAT] Normalització de terminologia segons AGENTS.md**:
    - *Problema*: S'havia detectat l'ús del terme prohibit «menú» en diverses cadenes catalanes de `i18n.ts` i `generated-i18n.ts`, i l'ús de la clau interna `"meat"` a `MenuView.tsx`.
    - *Solució*: Substituir per «carta» i canviar la clau interna a `"non_vegan"`.

#### ⚡ Estabilitat del Desenvolupament
12. **✅ [COMPLETAT] Configuració de timeout a Vitest (`vitest.config.ts`)**:
    - *Problema*: La manca d'un fitxer de configuració a l'arrel feia que proves pesades com `restaurant-search.test.ts` fallessin per timeout (5.000 ms) sota alta concurrència de CPU a Windows.
    - *Solució*: Crear `vitest.config.ts` amb `testTimeout: 10000`.

### 🛒 Monetització Ètica & Conversió Ràpida (Termini 180 dies)
13. **🛒 Redirecció Geogràfica d'Afiliats d'Amazon & OneLink (`/recursos`)**:
    - *Objectiu*: Donada l'estricta política d'Amazon Associates que cancel·la el compte si no s'aconsegueixen 3 vendes qualificades en 180 dies, tots els enllaços de compra de llibres i suplements de `/recursos` han de redirigir de forma intel·ligent segons el mercat de l'usuari (usuaris de Catalunya/Espanya cap a `amazon.es` amb tag d'afiliat espanyol/OneLink, Regne Unit cap a `amazon.co.uk`, etc., en lloc de forçar sempre `amazon.com`).
    - *Solució*: Utilitat de resolució geogràfica d'enllaços al client que adapta el domini de destí conservant el format de divulgació FTC/Associates.

---

## 🟡 Nivell 2: Canvis Petits i No Tant Importants (Poliment i Neteja)

Tasques de baixa dificultat que resolen deute tècnic menor, inconsistències visuals, neteja de codi i comunicació bàsica.

1. **✅ [COMPLETAT] Neteja de càsting de tipus innecessari a TypeScript (`RestaurantMap.tsx`)**:
   - Eliminar `(restaurant as { isFeatured?: boolean }).isFeatured`, ja que `isFeatured` ja està definit formalment a `RestaurantCandidateSchema`.
2. **✅ [COMPLETAT] Unificació de PointerEvents i eliminació de TouchEvents redundants (`BottomSheet.tsx`)**:
   - Eliminar els controladors `onTouch*` i delegar exclusivament en l'API estàndard de Pointer Events amb captura de punter (`setPointerCapture`).
3. **✅ [COMPLETAT] Noms de demostració sensibles a l'idioma a l'autenticació (`auth.tsx`)**:
   - Substituir el text rígid "Usuari Google" / "Usuari Apple" quan no hi ha Supabase per cadenes traduïdes segons l'idioma actiu ("Google User" en anglès).
4. **✅ [COMPLETAT] Centralització de ternaris dispersos d'idioma**:
   - Migrar desenes de ternaris inline `language === "ca" ? "..." : "..."` a `App.tsx`, `HomePage.tsx`, `ProfilePage.tsx` i `CameraPermissionModal.tsx` cap al diccionari centralitzat `i18n.ts`.
5. **✅ [COMPLETAT] Refactorització d'estils en línia a classes de disseny (`HomePage.tsx`, `ProfilePage.tsx`)**:
   - Substituir l'ús massiu de `style={{ ... }}` per regles dedicades i reutilitzables a `styles.css` (`.home-*` i `.profile-*`).
6. **✅ [COMPLETAT] Formulari ràpid «Suggereix un canvi» a la fitxa del restaurant**:
   - Botó i diàleg lleuger perquè qualsevol usuari pugui notificar ràpidament una correcció d'adreça, tancament permanent o novetat a la carta sense necessitat d'editar fitxers font.
7. **📱 Presència a xarxes socials i enllaços comunitaris (Instagram)**:
   - Afegir enllaços visibles i elegants al perfil d'Instagram (`@vegantools`) al peu de pàgina (`App.tsx`), capçalera i a la secció de comunitat de `/recursos` per canalitzar usuaris i difondre contingut ètic.

---

## 🟠 Nivell 3: Canvis Mitjans-Grans Importants (Arquitectura i Funcionalitats Clau)

Tasques que requereixen disseny d'enginyeria, modificació d'esquemes o canvis estructurals que tenen un impacte estratègic clau en el rendiment, la seguretat i el valor del producte.

### 📦 Rendiment Web & Frontend
1. **✅ [COMPLETAT] Code-splitting i optimització del paquet de producció (Vite)**:
   - *Problema*: La compilació anterior generava un paquet monolític de més de 710 kB (`index.js`).
   - *Solució*: Implementada càrrega mandrosa (`React.lazy()`) amb `<Suspense fallback={<PageLoader />}>` per a totes les pàgines i configurat `manualChunks` a `vite.config.ts`. El paquet inicial s'ha reduït a 260 kB (85 kB gzipped), aïllant Leaflet (`vendor-leaflet`, 149 kB), Barcode polyfill (`vendor-barcode`, 6.5 kB) i icones (`vendor-icons`, 13 kB).

### 🏛️ Dades i Catàleg de Destacats
2. **✅ [COMPLETAT] Desacoblament dels Restaurants Destacats (*Curated Top Picks*) en fitxers JSON per ciutat**:
   - *Problema*: Anteriorment `CURATED_RESTAURANTS` a `apps/api` barrejava locals carnis/no vegans, mentre que els destacats de Barcelona estaven codificats rígidament en TypeScript.
   - *Solució*: Modularitzat en fitxers JSON independents (`barcelona.json`, `girona.json`, `london.json`, `berlin.json`, `paris.json`, `newyork.json`), garantint per contracte que **el 100% dels destacats siguin estrictament vegans (`isVegan: true`)** i unificant `CURATED_RESTAURANTS` directament des de la font de domini.
3. **✅ [COMPLETAT] Arrodoniment automàtic al hub de ciutat més proper a la portada (`HomePage.tsx`, `featured-restaurants.ts`)**:
   - Detecció d'ubicació per coordenades GPS o IP que "arrodoneix" a la gran ciutat més propera amb selecció curada de restaurants vegans mitjançant `findClosestCityHub()`. Com a prova local o fallback per defecte arrenca a Barcelona.
4. **✅ [COMPLETAT] Reordenació del Top 3 de filtres immediats i normalització a «Vegà» (`FilterPills.tsx`, `i18n.ts`)**:
   - Simplificació de "100% vegà" a "Vegà" (ja s'entén en contraposició a "Opcions veganes").
   - Top 3 de filtres principals visibles per defecte: **4+ fulles (qualitat)**, **Vegà** i **Vegetarià** (locals sense carn ni peix). El filtre d'**Opcions veganes** es mou al calaix de filtres addicionals per evitar inundar la cerca inicial amb llocs carnis.
5. **✅ [COMPLETAT] Galeria d'imatges d'Espai Segur per a les targetes de restaurants destacats a la portada (`HomePage.tsx`)**:
   - *Solució*: Implementades targetes amb ràtio 16:10 i imatges autèntiques d'alta resolució integrades de manera nativa a `vegantools.org` (sense redireccions externes ni iframes), amb insígnies d'estil de cuina, puntuació mitjana i degradat de reserva (*fallback*), protegides per la política estricta d'Espai Segur (tolerància zero amb carn o crueltat).

### 🧹 Backend Fastify & Seguretat
6. **✅ [COMPLETAT] Modularització del monòlit `apps/api/src/app.ts` (>2.470 línies)**:
   - *Problema*: La funció `buildApp()` contenia totes les rutes, controladors, cerques espacials i lògica d'integració en un sol fitxer gegant.
   - *Solució*: Descompost en rutes i controladors aïllats sota `apps/api/src/routes/`:
     - `/routes/location.ts` (geolocalització aproximada per IP i capçals Cloudflare/Vercel)
     - `/routes/restaurants.ts` (cerca espacial multi-proveïdor, resolució de dominis i destacats)
     - `/routes/menus.ts` (descoberta web, càrrega de fitxers multipart, edició, republicació i notes)
     - `/routes/reviews.ts` (ressenyes ètiques i estadístiques comunitàries)
     - `/routes/products.ts` (consulta Open Food Facts i OCR d'etiquetes)
     - `/routes/recipes.ts` (veganitzador culinari)
7. **✅ [COMPLETAT] Refactorització de la signatura de `buildApp()`**:
   - *Problema*: Acceptava 8 arguments posicionals, obligant a passar múltiples `undefined` consecutius a `server.ts`.
   - *Solució*: Substituït per una interfície neta `AppDependencies` amb suport retrocompatible tant per a objecte d'opcions com per a paràmetres posicionals existents.
8. **✅ [COMPLETAT] Defensa contra DNS Rebinding a la descoberta de cartes (`menu-discovery.ts`)**:
   - *Problema*: `assertPublicUrl` valida la IP abans de la petició, però `fetch()` torna a resoldre el DNS, permetent que un atacant amb TTL 0 accedeixi a xarxes locals o metadades cloud (`127.0.0.1`, `169.254.169.254`).
   - *Solució*: Dispatcher TCP amb `undici.Agent` personalitzat connectant directament a la IP validada en el socket de xarxa per immunitzar contra canvis maliciosos de TTL.

### 🔍 Intel·ligència Artificial i Cartes
9. **✅ [COMPLETAT] Auditoria ètica de begudes, vins i cerveses com a opció extra (`menu-analyzer.ts`)**:
   - *Estratègia d'estalvi de tokens*: Anàlisi de begudes i vins desactivada per defecte per optimitzar el consum de tokens del model. S'ofereix exclusivament mitjançant el paràmetre explícit `includeDrinks?: boolean` quan es processen cartes específiques de begudes.
10. **✅ [COMPLETAT] Extracció automàtica de plats adaptables (`modifiableTo`) amb Gemini**:
    - *Estratègia sòlida i rigorosa*: El model només extreu `modifiableTo: "vegan"` i `modificationNote` si el propi text imprès de la carta indica textualment la possibilitat d'adaptar-lo (ex: "opció vegana disponible", "demanar sense formatge", "substitució per heura"). S'ha suprimit la segona crida redundant d'inferència.

### 👤 Perfil i Experiència d'Usuari
11. **⛔ [EXCLÒS PER SEGURETAT MÈDICA] Filtres d'al·lèrgies i anafilaxi**:
    - *Decisió ètica*: Per evitar riscos greus per a la salut de les persones (xocs anafilàctics, contaminació creuada a fàbriques/cuines) per un excés de confiança en la IA o l'OCR, **s'exclou qualsevol garantia o filtre mèdic d'al·lèrgies**. L'app se centra exclusivament en la composició ètica vegana/vegetariana.
12. **✅ [COMPLETAT] Diari de visites estil Letterboxd, Top 4 i Favorits (`ProfilePage.tsx`, `diary.ts`)**:
    - *Log diari*: Registre de visites a restaurants en diferents dies (amb límit estricte d'1 registre per dia per local, format `YYYY-MM-DD`), amb notes personals, plats demanats i valoració amb pas de mig punt (0.5 a 5.0).
    - *Distribució d'estrelles*: Histograma de puntuacions al perfil amb 10 barres verticals (0.5 a 5.0), mitjana aritmètica calculada i recompte de visites.
    - *Top 4 Restaurants*: Selector dels 4 restaurants preferits de l'usuari ancorats a la capçalera del perfil amb calaix de cerca.
13. **✅ [COMPLETAT] Pàgines de perfil dedicades per a cada restaurant (`/restaurant/:id`)**:
    - Fitxes independents indexables (`RestaurantDetailPage.tsx`) amb portada d'alta definició, horaris detallats calculats en local sense dependències (`evaluateOpeningHours`), indicacions de transport, enllaç oficial, diari de visites personals i ressenyes ètiques comunitàries.
14. **✅ [COMPLETAT] Auditoria i revisió periòdica dels pins curats i comunitaris del mapa (`scripts/audit-curated-pins.mjs`)**:
    - Script automatitzat d'auditoria sistemàtica (`npm run audit:pins`) que valida la integritat del 100% dels pins curats dels 6 hubs (30 restaurants):
      - Verificació estricta del 100% vegà (`isVegan: true`).
      - Rangs geogràfics vàlids (latitud [-90, 90], longitud [-180, 180]).
      - Sintaxi i validesa d'horaris comercials segons format OSM (`openingHours`).
      - Coherència de protocol web (`https://`) i existència d'imatges d'Espai Segur.
      - Integrat directament a la pipeline de verificació `npm run check`.
15. **🏷️ Distintius d'Usuari al Perfil i Ressenyes (`Vegan`, `Vegetarian`, `Non Veg`) & Onboarding Suau**:
    - *Onboarding suau en 3 passos al registre*: 1) Idioma (anglès per defecte, amb selecció de Català o English), 2) Nom d'usuari lliure i net, 3) Preferència dietètica (`Vegan`, `Vegetarian`, `Non Veg`). S'executa una sola vegada per nou perfil sense insistències repetitives.
    - *Distintius d'estil de vida a la comunitat*: Els perfils d'usuari i les seves ressenyes mostren de manera transparent la seva etiqueta dietètica per contextualitzar les valoracions.
    - *Format de nom d'usuari*: Noms d'usuari sense prefix forçat d'arroba (`@`), amb suport per a majúscules (`Nils`, `VegiChef`) i filtre estricte que impedeix registrar combinacions de `vegan` i `tool`/`tools` per evitar suplantacions de la plataforma oficial.

### 🐾 Expansió Ètica & Culinària (Noves Funcionalitats Clau)
16. **🐾 Capa ètica de Santuaris d'Animals i Refugis al mapa (`/map`)**:
    - *Reclassificat des de Nivell 4 per importància ètica troncal*: Creació de la categoria de santuaris i refugis d'animals (`type: "sanctuary"` al domini) amb pin verd distintiu, filtre ràpid al mapa i fitxa de detall que prioritzi la visita respectuosa, donacions i l'apadrinament d'animals rescatats.
17. **✅ [COMPLETAT] Receptari 100% Vegetal com a Base de `/recipes`, Mode Cuina & Veganitzador com a Subfeature**:
    - *Reestructuració estratègica de la secció de receptes*: El Receptari (col·lecció de 12 receptes mestres 100% vegetals) esdevé la base principal de `/recipes`, amb filtres per categories (Tradicionals, Ràpides, Postres, Bàsics, Proteiques), cerca per ingredients, escalat interactiu de racions, acreditació de fonts culinàries (`source`), etiquetatge enriquit (`tags`), fotografies culinàries d'alta fidelitat allotjades en local, i Mode Cuina pas a pas a pantalla completa (lletra gran, pantalla desperta via Wake Lock API i temporitzadors de cocció). El Veganitzador de receptes intel·ligent s'integra com a subfeature especialitzada i accessible des d'una pestanya dedicada.
18. **✅ [COMPLETAT] Model Lleuger Propi (Edge Classifier ONNX) & Dataset Multilingüe**:
    - *Pipeline de dades i model completada*: Dataset equilibrat de 12.000 mostres amb la distribució exacta (25% ca, 25% en, 15% de, 15% es, 20% altres) extret de la taxonomia canònica d'Open Food Facts, particionat per família taxonòmica (*GroupStratifiedSplit*).
    - *Entrenament i calibració*: Notebook a punt per a Google Colab GPU T4 (`notebooks/train_vegan_classifier_colab.ipynb`) amb funció de pèrdua asimètrica `BCEWithLogitsLoss(pos_weight=[2.5, 1.8, 1.5])` per protegir contra el risc moral, calibració en CPU (*Threshold Moving*) i exportació automàtica a ONNX INT8.
    - *Integració a l'API Fastify*: Servei en cascada a `apps/api/src/edge-classifier.ts` i `apps/api/src/routes/products.ts` que executa inferència local (~15 ms) amb `onnxruntime-node` i fallback transparent a Gemini si el model no és present o la incertesa és màxima.
    - *Especificació tècnica i mètriques reals*: Veure [`docs/ml-classifier-design.md`](./ml-classifier-design.md) i [`docs/benchmark-results.md`](./benchmark-results.md).

---

## 🔵 Nivell 4: Canvis Grans o Molt Grans No Immediats (Llarg Termini)

Projectes d'infraestructura, investigació o serveis en segon pla que requereixen recursos externs continuats o es posposen un cop consolidats els nivells 1 a 3.

1. **✅ [COMPLETAT] Consolidació Relacional de la Base de Dades i SDK Supabase (Fase 2)**:
   - Substitució de crides manuals PostgREST pel client SDK oficial `@supabase/supabase-js`.
   - Migracions PostgreSQL declaratives (`supabase/migrations/202609080001_restaurant_visits.sql`) amb Row Level Security (RLS).
   - Repositoris duals (memòria per a tests i Supabase per a producció) per a visites, ressenyes i Top 4 amb sincronització transparent en línia i suport offline.
2. **✅ [COMPLETAT] Suport complet per a Mode Clar / Mode Fosc (`theme.ts`, `styles.css`, `RestaurantMap.tsx`)**:
   - Detecció de sistema, commutador manual a la capçalera, persistència i adaptació automàtica de les rajoles Leaflet.
3. **✅ [COMPLETAT] Pàgina dedicada del manifest de valors (`/valors` i `/about`)**:
   - Manifest antiespecista, política d'Espai Segur, privacitat zero-tracking i 3 preguntes de governança.
4. **✅ [COMPLETAT] Hub de Recursos, Mitjans, Llibres i Guia Pràctica (`/recursos`)**:
   - Pàgina àgil amb vídeos integrats de Gary Yourofsky, Earthling Ed i debats Jubilee; directori de documentals; recomanacions de llibres amb enllaços d'afiliat Amazon i advertències legals FTC; guia de B12, cosmètica i teixits vegans.
5. **🕒 Estratègia d'horaris en segon pla per reactivar el filtre «Obert ara»**:
   - Sistema de recol·lecció periòdica d'horaris comercials mitjançant Gemini Search Grounding / webs oficials / Google Places fins a assolir una cobertura massiva (>90%) abans d'activar el filtre públic.
6. **🌐 Subdominis d'idioma i enrutament internacional**:
   - Configuració per a resolució d'idiomes mitjançant subdominis (`ca.vegantools.org` / `en.vegantools.org`) o prefixes de ruta per a posicionament SEO global.
7. **🐮 Investigació exhaustiva de HappyCow i propostes comunitàries de llarg termini**:
   - Sistema de gamificació, ambaixadors locals i llistes comunitàries compartibles.
8. **📱 Aplicacions mòbils natives per a iOS i Android**:
   - Empaquetament i desplegament a App Store i Google Play mitjançant Capacitor o solució multi-plataforma nativa per oferir una experiència fluida, notificacions locals i millor integració de la càmera per a l'escàner d'ingredients i codis de barres.
9. **📸 Fotografies pas a pas per a les receptes del Mode Cuina**:
   - Integració de fotografies intermèdies opcionals per a cada pas de cocció al Receptari i Mode Cuina, garantint sempre que el 100% de les imatges respectin estrictament la política d'Espai Segur (sense productes ni sofriment animal).
10. **📦 Historial d'Escaneig Personal i Base de Dades Global de Productes**:
    - Historial d'escaneig d'aliments i cosmètics associat al perfil de l'usuari amb cerca ràpida de productes habituals.
    - Base de dades global compartida a Supabase/PostgreSQL com a memòria cau persistent (Open Food Facts + Open Beauty Facts) per garantir respostes a 0ms i estalviar quota d'APIs externes per a tota la comunitat.
11. **📊 Estadístiques Personals i Comunitàries d'Impacte (`/profile` & Comunitat)**:
    - *Objectiu de futur*: Quan la plataforma assoleixi volum d'usuaris i activitat suficient, introduir un mòdul d'estadístiques: resum d'impacte ètic acumulat (àpats vegans gaudits, petjada ecològica i d'animals), mapa de calor de ciutats i barris més explorats, estils culinaris favorits i mètriques agregades de valoracions comunitàries.

---

## 🛡️ Documents de Referència
- 🗺️ **Full de Ruta i Backlog Prioritzat**: [`docs/roadmap.md`](./roadmap.md)
- 🏛️ **Guia d'Arquitectura i Descoberta de Cartes**: [`docs/architecture.md`](./architecture.md)
- 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./values.md)
