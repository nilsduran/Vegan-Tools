# Vegan Tools — Registre d'Incidències, Bugs i Prevenció de Regressions

Aquest document recull tots els bugs, problemes d'UX i incidències trobats durant el desenvolupament de Vegan Tools, organitzats per àrea funcional, amb la seva causa arrel, estat actual i les mesures per evitar que es tornin a reproduir.

---

## 🗺️ 1. Mapa Interactiu & Cerca de Restaurants (`/map`)

| ID | Descripció del Bug / Incidència | Causa Arrel | Estat | Resolució / Prevenció |
| :--- | :--- | :--- | :--- | :--- |
| **MAP-01** | **Desplaçament de pins en fer zoom**: Els pins es movien i no quedaven fixats a les coordenades del carrer. | `iconSize` i `iconAnchor` a `RestaurantMap.tsx` estaven a `[0, 0]`, fent que Leaflet calculés malament el centre de transformació. | ✅ **RESOLT** | Ancoratge estricte: `iconSize: [36, 46]`, `iconAnchor: [width/2, height]`, `popupAnchor: [0, -height]`. Classe CSS amb `margin: 0; padding: 0`. |
| **MAP-02** | **Desaparició de pins en prémer un restaurant**: En clicar un pin, s'esborraven tots els marcadors del mapa i no es mostrava el restaurant. | `selectRestaurant()` feia `setRestaurantResults([])` buidant l'estat i provocant que el deep-linking no trobés el restaurant. | ✅ **RESOLT** | No es buida `restaurantResults` en seleccionar; es mantenen els pins visibles i es ressalta el seleccionat. |
| **MAP-03** | **Zoom inicial a tota Europa**: En obrir el mapa per primer cop, es feia un zoom out gegant mostrant tot el continent. | `RestaurantMap.tsx` executava `fitBounds()` sobre tota la llista curada que incloïa Londres, Berlín i París. | ✅ **RESOLT** | L'endpoint `/v1/restaurants/curated` filtra estrictament per radi regional (<= 55 km de la IP). El mapa s'inicia centrat a la localitat de l'usuari a `zoom: 13`. |
| **MAP-04** | **Cerca de franquícies buida ("La Tagliatella")**: Cerques de noms comercials no donaven resultats sense posar la ciutat. | Nominatim aplicava un filtre `viewbox` rígid que donava 0 resultats fora del rectangle estricte. | ✅ **RESOLT** | Integració prèvia del motor Photon (Komoot OSM) que aplica *soft proximity scoring* sense tall territorial rígid. |
| **MAP-05** | **Banner blanc flotant inferior no desitjat**: Apareixia una targeta blanca horitzontal amb un botó verd de Carta a sota del mapa. | Component `.map-selected-card` renderitzat a la part inferior dreta del canvas de Leaflet. | ✅ **RESOLT** | Eliminat completament de `RestaurantMap.tsx`. La informació es mostra a la barra lateral i la pujada a la secció inferior. |
| **MAP-06** | **Títols de pins visibles només a cert nivell de zoom**: Els noms es mostraven sempre o bé no es veien. | Manca de classe de control de zoom a Leaflet. | ✅ **RESOLT** | Els tooltips es mostren automàticament a `zoom >= 14` i s'oculten amb `opacity: 0` quan es fa zoom out. |
| **MAP-07** | **Protocol `geo:` no operatiu a Desktop**: L'enllaç d'indicacions no feia res en ordinadors d'escriptori. | `geo:lat,lng` és un esquema RFC només interpretat per sistemes mòbils (Android/iOS). | ✅ **RESOLT** | Utilitari `getDirectionsUrl()` que obre Google Maps Directions a Desktop i `geo:` a Mobile. |
| **MAP-08** | **Creu d'esborrar cerca (X) amb requadre residual**: El botó tenia una capsa de vora innecessària. | Bounding box heretada d'estils previs de botó secundari. | ✅ **RESOLT** | Botó net transparent sense capsa amb una `X` grisa centrada que canvia de to en passar-hi el ratolí. |
| **MAP-09** | **Llista lateral inicial innecessària**: La barra lateral mostrava tota la llista de curats sense haver cercat. | No es diferenciava entre pins inicials del mapa i resultats de cerca de text. | ✅ **RESOLT** | Estat `curatedPins` dedicat només al mapa. La llista lateral només s'omple quan l'usuari cerca activament. |
| **MAP-10** | **Resolució fallida de restaurants curats**: En clicar un pin destacat del mapa, no s'obria el restaurant per manca de proveïdor a `/resolve`. | `/v1/restaurants/resolve` només reconeixia `foursquare` o `openstreetmap`. | ✅ **RESOLT** | Suport directe per a proveïdor `curated` i IDs amb prefix `curated-`. |

---

## 📄 2. Lector de Cartes & Editor de Menú (`/menu`)

| ID | Descripció del Bug / Incidència | Causa Arrel | Estat | Resolució / Prevenció |
| :--- | :--- | :--- | :--- | :--- |
| **MENU-01** | **Cartes no detectades per rebuig de domini**: Cartes que fallaven en utilitzar dominis de reserves (TheFork, TripAdvisor). | L'algorisme de descobriment no verificava el domini oficial ni tenia reintent de segon nivell. | ✅ **RESOLT** | Sistema de fallback de domini verificat i suport directe per a pujada de PDF i fotografies (fins a 8 pàgines). |
| **MENU-02** | **Discrepància en el botó de pujar carta**: El botó de càrrega manual es va col·locar a la cerca en lloc de la secció inferior. | Interpretació errònia de la ubicació del formulari de càrrega. | ✅ **RESOLT** | Retirat de la barra de cerca i consolidat a la secció inferior dedicada `bottom-menu-upload` sota el mapa. |
| **MENU-03** | **Descripcions duplicades de plats**: Plats que repetien el nom dins de la descripció a la vista de carta. | Normalització de text que no comprovava coincidència per subcadena amb el títol. | ✅ **RESOLT** | Filtre `visibleMenuDescription()` a `packages/domain` per suprimir repeticions redundants. |

---

## 🔍 3. Escàner de Productes & Ingredients (`/scanner`, `/ingredients`)

| ID | Descripció del Bug / Incidència | Causa Arrel | Estat | Resolució / Prevenció |
| :--- | :--- | :--- | :--- | :--- |
| **SCAN-01** | **UI d'introducció manual de codi de barres desalineada**: El camp de teclat era massa petit i alineat a l'esquerra. | Estils de flexbox estrets que no omplien l'amplada del contenidor. | ✅ **RESOLT** | Redissenyat a amplada completa (`.barcode-form`) amb tipografia monoespaiada i botó gran d'acció. |
| **SCAN-02** | **Productes no trobats a Open Food Facts**: Si el codi de barres no existia, la pàgina quedava bloquejada. | Manca de flux d'acció immediata per al cas buit. | ✅ **RESOLT** | Afegit botó directe de fallback `📷 Fes foto a l'etiqueta d'ingredients` per a anàlisi OCR immediat. |

---

## 🍳 4. Veganitzador de Receptes (`/recipes`)

| ID | Descripció del Bug / Incidència | Causa Arrel | Estat | Resolució / Prevenció |
| :--- | :--- | :--- | :--- | :--- |
| **REC-01** | **Detecció de rovells d'ou no tractats**: "Rovells d'ou" es classificaven com a ous sencers sense el substitut greixós adequat. | Manca de regles específiques per a fraccions d'ou a l'analitzador de receptes. | ✅ **RESOLT** | Afegit suport per a `rovells d'ou` / `egg yolks` amb concordança gramatical i substituts (tofu sedós / lli). |
| **REC-02** | **Falta de botó de copiat ràpid**: Els usuaris havien de seleccionar tot el text manualment per desar la recepta. | Manca de component de porta-retalls. | ✅ **RESOLT** | Botó `📋 Copia` / `Copiat!` amb feedback visual a la capçalera de la recepta. |

---

## 🌐 5. Internacionalització & Compartició (`i18n`)

| ID | Descripció del Bug / Incidència | Causa Arrel | Estat | Resolució / Prevenció |
| :--- | :--- | :--- | :--- | :--- |
| **I18N-01** | **Enllaços compartits sense idioma definit**: En compartir `/map`, l'altre usuari podia obrir-lo en anglès per defecte. | La resolució d'idioma només mirava `localStorage` i capçaleres del navegador. | ✅ **RESOLT** | Suport per paràmetres de consulta `?lang=ca` / `?lang=en` i prefixos de ruta `/ca/` / `/en/`. |
| **I18N-02** | **Terminologia inconsistent ("Carnista" vs "No vegà", "Menú" vs "Carta")**: Ús de paraules no naturals o ambigües. | Traccions literals inicials. | ✅ **RESOLT** | Normalitzat a `No vegà` / `Non-vegan` i `Carta` / `Menu` arreu de la plataforma. |
