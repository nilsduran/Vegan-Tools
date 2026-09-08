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

### ⚡ Estabilitat del Desenvolupament
12. **✅ [COMPLETAT] Configuració de timeout a Vitest (`vitest.config.ts`)**:
    - *Problema*: La manca d'un fitxer de configuració a l'arrel feia que proves pesades com `restaurant-search.test.ts` fallessin per timeout (5.000 ms) sota alta concurrència de CPU a Windows.
    - *Solució*: Crear `vitest.config.ts` amb `testTimeout: 10000`.

---

## 🟡 Nivell 2: Canvis Petits i No Tant Importants (Poliment i Neteja) — ✅ COMPLETAT

Tasques de baixa dificultat que resolen deute tècnic menor, inconsistències visuals i neteja de codi sense bloquejar el funcionament de l'aplicació.

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
   - *Solució*: Modularitzat en fitxers JSON independents (`barcelona.json`, `girona.json`, `vic.json`, `tarragona.json`, `manresa.json`, `london.json`, `berlin.json`, `paris.json`), garantint per contracte que **el 100% dels destacats siguin estrictament vegans (`isVegan: true`)** i unificant `CURATED_RESTAURANTS` directament des de la font de domini.
3. **✅ [COMPLETAT] Arrodoniment automàtic al hub de ciutat més proper a la portada (`HomePage.tsx`, `featured-restaurants.ts`)**:
   - Detecció d'ubicació per coordenades GPS o IP que "arrodoneix" a la gran ciutat més propera amb selecció curada de restaurants vegans mitjançant `findClosestCityHub()`. Com a prova local o fallback per defecte arrenca a Barcelona.
4. **✅ [COMPLETAT] Reordenació del Top 3 de filtres immediats i normalització a «Vegà» (`FilterPills.tsx`, `i18n.ts`)**:
   - Simplificació de "100% vegà" a "Vegà" (ja s'entén en contraposició a "Opcions veganes").
   - Top 3 de filtres principals visibles per defecte: **4+ fulles (qualitat)**, **Vegà** i **Vegetarià** (locals sense carn ni peix). El filtre d'**Opcions veganes** es mou al calaix de filtres addicionals per evitar inundar la cerca inicial amb llocs carnis.
5. **🖼️ Galeria d'imatges d'Espai Segur per a les targetes de restaurants destacats a la portada (`HomePage.tsx`)**:
   - *Problema*: Les targetes de la pàgina principal actualment només mostren la icona de cuina, oferint una experiència visual bàsica.
   - *Solució*: Enriquir les targetes amb imatges reals de la carta, plats i façana del restaurant, protegides per la política estricta d'Espai Segur (tolerància zero amb imatges de carn o crueltat).

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
8. **🔒 Defensa contra DNS Rebinding a la descoberta de cartes (`menu-discovery.ts`)**:
   - *Problema*: `assertPublicUrl` valida la IP abans de la petició, però `fetch()` torna a resoldre el DNS, permetent que un atacant amb TTL 0 accedeixi a xarxes locals o metadades cloud (`127.0.0.1`, `169.254.169.254`).
   - *Acció*: Implementar un Dispatcher TCP fixat a la IP validada (undici Agent).

### 🔍 Intel·ligència Artificial i Cartes
9. **Auditoria ètica de begudes, vins i cerveses com a opció extra (`menu-analyzer.ts`)**:
   - *Estratègia d'estalvi de tokens*: No s'analitza per defecte per no malgastar recursos. S'activa únicament com a opció secundària/extra si l'usuari ho demana o si la carta és exclusivament de begudes/vins.
10. **Extracció automàtica de plats adaptables (`modifiableTo`) amb Gemini**:
    - *Estratègia sòlida i rigorosa*: El model només pot extreure `modifiableTo: "vegan"` i `modificationNote` si el propi text imprès de la carta indica explícitament que és adaptable (ex: "opció vegana disponible", "demanar sense formatge", "opció amb tofu o heura"). Mai s'han d'inventar receptes.

### 👤 Perfil i Experiència d'Usuari
11. **⛔ [EXCLÒS PER SEGURETAT MÈDICA] Filtres d'al·lèrgies i anafilaxi**:
    - *Decisió ètica*: Per evitar riscos greus per a la salut de les persones (xocs anafilàctics, contaminació creuada a fàbriques/cuines) per un excés de confiança en la IA o l'OCR, **s'exclou qualsevol garantia o filtre mèdic d'al·lèrgies**. L'app se centra exclusivament en la composició ètica vegana/vegetariana.
12. **Diari de visites estil Letterboxd, Top 4 i Favorits (`ProfilePage.tsx`)**:
    - *Log diari*: Permetre registrar visites a restaurants en diferents dies (màxim 1 cop per dia pel mateix local), de manera que les valoracions i ressenyes puguin evolucionar en el temps.
    - *Distribució d'estrelles*: Gràfic de barres al perfil amb l'histograma de puntuacions de l'usuari, agrupat en franges de mig punt (0.5, 1.0, 1.5, ... 5.0) però desant la puntuació decimal exacta.
    - *Top 4 Restaurants*: Destacar els 4 restaurants preferits de l'usuari a la capçalera del seu perfil.
13. **Pàgines de perfil dedicades per a cada restaurant (`/restaurant/:id`)**:
    - Crear fitxes independents indexables per a motors de cerca, amb galeria d'imatges d'espai segur, horaris detallats i enllaços directes per compartir.
14. **Auditoria i revisió periòdica dels pins curats i comunitaris del mapa**:
    - Establir un procés sistemàtic de verificació periòdica per auditar que els marcadors curats i els resultats d'OpenStreetMap mantinguin informació actualitzada (obertures, tancaments, canvis de carta i oferta vegana) i gestionar correccions reportades per la comunitat.

---

## 🔵 Nivell 4: Canvis Grans o Molt Grans No Immediats (Llarg Termini)

Projectes de gran envergadura o expansions estratègiques de menor urgència operativa immediata, que es desenvoluparan un cop consolidada la base de codi.

1. **🏛️ Consolidació global de la base de dades relacional**:
   - Migració completa de tots els repositoris fragmentats cap a un model relacional unificat (`restaurants`, `restaurant_media`, `restaurant_reviews`, `restaurant_menus`, `dishes`, `community_tags`) amb suport complet per a SQLite/libSQL en local i PostgreSQL/Supabase en producció.
2. **🏛️ Unificació del SDK de Supabase al backend**:
   - Substituir les consultes manuals `fetch` cap a PostgREST a `store.ts` pel client SDK oficial `@supabase/supabase-js`.
3. **🍳 Hub complet de Receptes Mestres Veganes & Mode Cuina**:
   - Desenvolupament del directori complet de receptes tradicionals, formatges artesans i rebosteria sense ou/llet, amb instruccions pas a pas a pantalla completa, temporitzadors i generador de llista de la compra.
4. **🐾 Capa ètica de Santuaris d'Animals i Refugis al mapa**:
   - Creació d'un filtre i marcadors cartogràfics propis per a santuaris i projectes de rescat d'animals (amb el tipus `sanctuary` al model de domini).
5. **📚 Hub de Recursos, Nutrició i Antiespecisme (`/resources`)**:
   - Desenvolupament de la secció de divulgació ètica, guies nutricionals basades en evidències (B12, ferro, proteïnes) i catàleg de llibres i documentals.
6. **🎨 Suport complet per a Mode Clar / Mode Fosc**:
   - Sistema global de commutació de tema visual amb sincronització automàtica segons la preferència del sistema (`prefers-color-scheme`).
7. **🕒 Estratègia d'horaris en segon pla per reactivar el filtre «Obert ara»**:
   - Sistema de recol·lecció periòdica d'horaris comercials mitjançant Gemini Search Grounding / webs oficials / Google Places fins a assolir una cobertura massiva (>90%) abans d'activar el filtre públic.
8. **🌐 Subdominis d'idioma i enrutament internacional**:
   - Configuració per a resolució d'idiomes mitjançant subdominis (`ca.vegantools.org` / `en.vegantools.org`) o prefixes de ruta per a posicionament SEO global.
9. **🌱 Pàgina dedicada del projecte i manifest de valors (`/valors` o `/about`)**:
   - Desenvolupar una pàgina institucional independent per explicar la missió antiespecista, la política d'Espai Segur (tolerància zero amb imatges d'explotació), la privacitat radical zero-tracking i el rigor del 99% d'evidències.
10. **🐮 Investigació exhaustiva de HappyCow i proposta de valor guanyadora**:
    - **Objectiu**: Analitzar a fons el disseny, arquitectura de la informació, funcionalitats i dinàmiques de comunitat de HappyCow (el referent històric del sector) per tancar mancances i consolidar les àrees on **Vegan Tools** pot oferir una experiència substancialment superior:
      - *Què té de bo HappyCow*: Massa crítica d'usuaris, directori global ampli, ressenyes amb fotografies aportades per la comunitat, filtres bàsics (vegà, vegetarià, opcions) i sistema de gamificació/ambaixadors.
      - *Mancances estructurals de HappyCow que Vegan Tools supera*:
        1. **Anàlisi real de la carta amb IA**: HappyCow es limita a etiquetes genèriques i ressenyes d'usuaris sovint desfasades; Vegan Tools llegeix la carta real en PDF/foto/web i audita plat per plat amb justificació d'ingredients.
        2. **Detecció automàtica de plats adaptables**: Suggeriments d'enginyeria culinària per saber exactament com demanar un plat en llocs no 100% vegans (ex: "sense formatge", "substituir maionesa").
        3. **Plataforma 360° integrada**: HappyCow és només un directori de restaurants; Vegan Tools integra en una sola app la cerca de restauració, l'escàner de productes de supermercat (codi de barres + OCR d'ingredients) i el veganitzador de receptes casolanes.
        4. **Espai Segur (Safe Space) real**: HappyCow mostra freqüentment en portada fotos d'hamburgueses de carn o plats d'animals en llocs mixtes; Vegan Tools té una política estricta de filtre ètic antiespecista.
        5. **Privacitat i transparència zero-tracking**: Sense xarxes publicitàries invasives, sense rastrejadors de dades de geolocalització a tercers, i amb una base oberta basada en OpenStreetMap i Open Food Facts.


---

## 🛡️ Documents de Referència
- 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./values.md)
- 🏛️ **Guia d'Arquitectura i Descoberta de Cartes**: [`docs/architecture.md`](./architecture.md)
- 🐛 **Registre d'Incidències i Bug Tracking**: [`docs/bugs.md`](./bugs.md)
- 📊 **Auditoria de Dades d'OpenStreetMap**: [`docs/osm-audit-results.md`](./osm-audit-results.md)
- 🎯 **Metodologia de Fiabilitat**: [`docs/reliability.md`](./reliability.md)
