# Vegan Tools — Incident Log, Bug Tracking & Regression Prevention

This document chronicles known bugs, UX issues, root causes, and regression prevention rules across the Vegan Tools codebase.

---

## 🗺️ 1. Interactive Map & Restaurant Discovery (`/map`)

| ID | Issue Description | Root Cause | Status | Resolution & Prevention Rule |
| :--- | :--- | :--- | :--- | :--- |
| **MAP-01** | **Pin drift on map zoom**: Marker icons shifted away from actual street coordinates when zooming in/out. | `iconSize` and `iconAnchor` in `RestaurantMap.tsx` were set to `[0, 0]`, confusing Leaflet's coordinate anchor calculation. | ✅ **RESOLVED** | Strict anchor definition: `iconSize: [36, 46]`, `iconAnchor: [width/2, height]`, `popupAnchor: [0, -height]`. CSS class with zero margin/padding. |
| **MAP-02** | **Markers disappeared upon selection**: Clicking a pin caused all other pins to vanish from the map canvas. | `selectRestaurant()` was calling `setRestaurantResults([])`, clearing the candidate state. | ✅ **RESOLVED** | Candidate results are preserved on selection; the selected pin is highlighted without clearing neighboring markers. |
| **MAP-03** | **Excessive initial zoom out**: Opening the map initially zoomed out to show the entire European continent. | `RestaurantMap.tsx` ran `fitBounds()` over the full curated list (including London/Berlin/Paris). | ✅ **RESOLVED** | Curated endpoint filters strictly by regional radius (<= 55 km from user IP). Map initializes centered on user coordinates at `zoom: 13`. |
| **MAP-04** | **Commercial franchise search failure**: Queries for franchise names ("La Tagliatella") returned zero results without entering the city. | Nominatim applied a rigid `viewbox` filter that dropped results outside the viewport. | ✅ **RESOLVED** | Integrated soft proximity scoring engines (Geoapify Places & Komoot Photon) that do not enforce rigid rectangular bounding boxes. |
| **MAP-05** | **Ghost label tooltips on zoom out**: Marker text labels cluttered the map when zoomed out. | Missing zoom threshold styling in Leaflet. | ✅ **RESOLVED** | Marker tooltips are automatically displayed only at `zoom >= 14` with smooth opacity transitions. |
| **MAP-06** | **`geo:` protocol unresponsive on desktop**: Clicking "Directions" on desktop browsers did nothing. | `geo:lat,lng` is a mobile RFC schema supported only on Android/iOS. | ✅ **RESOLVED** | `getDirectionsUrl()` utility routes to Google Maps Directions on desktop and `geo:` on mobile devices. |
| **MAP-07** | **Unwanted residual sidebar list**: Sidebar displayed all regional curated places before any search was conducted. | No separation between map pins and active search results. | ✅ **RESOLVED** | Dedicated `curatedPins` state for initial map rendering; sidebar list populates only upon active user search. |
| **MAP-08** | **Cross-city search false negatives ("Bionèctar", "Purezza")**: Searching for a venue in another city returned zero results if user GPS was active. | Distance filter rigidly clamped candidate distances to 10 km when user coordinates were provided. | ✅ **RESOLVED** | Explicit restaurant name queries allow nationwide search up to 150 km or global matching, while generic queries ("restaurants") remain radius-bound. |
| **MAP-09** | **Search Typeahead floating overlay occlusion**: Empty suggestions dropdown covered filter pills. | `SearchTypeahead` rendered dropdown container even when zero suggestions were available. | ✅ **RESOLVED** | Suggestions dropdown renders strictly when items exist; previous selection clears instantly when user edits text. |

---

## 📄 2. Menu Reader & Dish Parser (`/menu`)

| ID | Issue Description | Root Cause | Status | Resolution & Prevention Rule |
| :--- | :--- | :--- | :--- | :--- |
| **MENU-01** | **Booking domain menu rejection**: Discovery failed when restaurants linked to TheFork or TripAdvisor instead of their own site. | Crawler lacked third-party domain filtering and alternative AI search grounding. | ✅ **RESOLVED** | `GoogleSearchRestaurantWebsiteFinder` filters out aggregators and extracts verified official restaurant domains. |
| **MENU-02** | **Duplicate dish descriptions in menu view**: Dish titles were repeated inside the body description. | Normalization did not check for substring collision with the dish title. | ✅ **RESOLVED** | `visibleMenuDescription()` in `@vegan-tools/domain` strips redundant name prefixes. |
| **MENU-03** | **Redundant re-analysis of cached menus**: Reopening an already parsed restaurant showed "Extracting dishes..." again. | `/v1/menus/discover` did not check `RestaurantMenuCache.get()` before launching a new extraction. | ✅ **RESOLVED** | Pre-check on `RestaurantMenuCache`; returns instant `<5ms` cached response with `ready` status. |

---

## 🔍 3. Product & Recipe Tools (`/scanner`, `/recipes`)

| ID | Issue Description | Root Cause | Status | Resolution & Prevention Rule |
| :--- | :--- | :--- | :--- | :--- |
| **SCAN-01** | **Empty state on missing barcode**: Products not present in Open Food Facts left the screen blank. | Missing fallback call-to-action. | ✅ **RESOLVED** | Added direct fallback button: *"📷 Take a photo of the ingredient label"* for instant OCR analysis. |
| **REC-01** | **Egg yolk classification**: "Egg yolks" were substituted as whole eggs without necessary fat ratio adjustment. | Missing specific rule mapping for egg fractions. | ✅ **RESOLVED** | Added explicit handling for `egg yolks` / `rovells d'ou` with silken tofu or flaxseed lipid substitutes. |
| **REC-02** | **Missing recipe export**: Users had to manually select text to save veganized recipes. | Missing clipboard action. | ✅ **RESOLVED** | Added one-click `📋 Copy` button with visual confirmation in the recipe header. |

---

## 🌐 4. Internationalization & Terminology (`i18n`)

| ID | Issue Description | Root Cause | Status | Resolution & Prevention Rule |
| :--- | :--- | :--- | :--- | :--- |
| **I18N-01** | **Inconsistent dietary terminology**: Use of ambiguous or non-standard terms. | Early literal translations. | ✅ **RESOLVED** | Standardized across all views: `No vegà` / `Non-vegan`, `Carta` / `Menu`, `Indicacions` / `Directions`. |
| **I18N-02** | **Shared link language preservation**: Sharing a URL opened in browser default language instead of sender's choice. | Locale resolution only inspected local storage. | ✅ **RESOLVED** | Added support for `?lang=ca` / `?lang=en` query parameters and route prefixes. |
