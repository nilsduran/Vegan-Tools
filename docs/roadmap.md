# Vegan Tools — Project Roadmap & Implementation Status

Aquest document resumeix l'estat actual del desenvolupament, les funcionalitats implementades a la branca `feature/interactive-map` i els passos següents per a futures converses.

---

## 🗺️ Estat del Mapa Interactiu (`/map`)

El mapa interactiu s'ha desenvolupat completament a la branca `feature/interactive-map` i està 100% integrat amb el lector i analitzador de cartes.

### 🌟 Funcionalitats implementades del Mapa:
1. **Visualització i Exploració Completa (Leaflet + OpenStreetMap)**:
   - Mapa interactiu amb pins verds per a restaurants vegans/amb opcions i indicador destacat per al restaurant seleccionat.
   - Botó flotant *"Cerca en aquesta zona"* que s'activa automàticament en desplaçar (`pan`) o moure el mapa.
   - Càlcul estricte de coordenades GPS visibles (`latitude, longitude`) sense biaix forçat de Barcelona, permetent explorar qualsevol ciutat del món.
2. **Cerca Universal de Restaurants (Global Search)**:
   - Cerca per text lliure d'establiments arreu del món (*"Purezza"*, *"Loving Hut"*, *"Honest Greens"*, *"Teresa Carles"*, etc.) sense requerir ciutat explícita.
   - Suggeriments i cerca en viu a la barra superior flotant.
   - Botó quadrat discret de creu (✖️) per netejar simultàniament el text de cerca, els marcadors trobats i la selecció activa.
3. **Fitxa de Detall del Restaurant (`RestaurantDetailPane`)**:
   - Insígnia d'estat: *100% Vegà*, *Vegetarià* o *Opcions veganes*.
   - Estimació de temps i distància a peu 🚶 o en cotxe 🚗 respecte a la posició de l'usuari.
   - Adreça completa i horaris d'obertura (quan estan disponibles a OpenStreetMap / Foursquare).
   - Accions ràpides:
     - **Carta**: Obre i analitza automàticament la carta oficial del restaurant o carrega la carta en memòria cau. Icona de fulla amb animació giratòria de càrrega (`spin`).
     - **Web**: Enllaç directe al lloc web oficial del restaurant.
     - **Indicacions**: Enllaç universal de navegació GPS (`google.com/maps/dir/?api=1&destination=lat,lng`) sense registre ni sortida forçada a serveis de tercers.
     - **Puja la carta**: Permet als usuaris fotografiar o pujar cartes noves en PDF o fotos (fins a 8 pàgines).
4. **Llista de Resultats Flotant**:
   - Llista lateral estilitzada i compacta sobre el mapa.
   - Enllaços directes a sota de cada restaurant (*Carta*, *Web*, *Indicacions*) en format de text subratllat verd amb icones.
   - Eliminació de superposicions amb la capçalera (`z-index` acurat).

---

## 🚀 Altres Millores Implementades Recentment

### 1. 🍳 Veganitzador de Receptes (`/recipes`)
- **Porta-retalls discret**: Botó `📋 Copia` / `Copiat!` a la capçalera de la recepta veganitzada per copiar el resultat amb un sol clic.
- **Catàleg de receptes típiques i postres**:
  1. 🥞 **Pancakes tradicionals** (ous, llet, mantega, mel).
  2. 🍲 **Canelons tradicionals** (carn picada, fetge, mantega, beixamel amb llet, formatge ratllat, ou).
  3. 🍮 **Crema catalana** (llet, 4 rovells d'ou, midó de blat de moro/Maizena, canyella, pell de llimona).
  4. 🍰 **Pa de pessic** (farina, 4 ous, iogurt, mantega desfeta, llet).
  5. 🍪 **Galetes de xocolata** (mantega, ou, xips de xocolata negra, sucre morè).
- **Detecció precisa de rovells d'ou**: Suport complet per a `rovells d'ou`, `clares d'ou`, `egg yolks`, `yemas de huevo` amb càlcul precís de substituts (tofu sedós / aquafaba / ous de lli) i concordança gramatical catalana (*"Bat el tofu sedós"*, *"Bat l'aquafaba"*).

### 2. 🔍 Escàner de Productes (`/scanner`)
- **Fallback ràpid a OCR**: Quan un codi de barres no es troba a Open Food Facts, apareix directament el botó `📷 Fes foto a l'etiqueta d'ingredients` per analitzar l'envàs a l'instant.
- **Historial de productes recents**: Barra inferior que desa en `localStorage` els últims productes consultats amb foto, nom i veredicte vegà.
- **Formulari de codi manual**: Disseny d'amplada completa (`.barcode-form`) amb tipografia monoespaiada i botó d'acció ràpida.

### 3. 🌐 Internacionalització i Terminologia (i18n)
- Substitució del terme *"Carnista"* per **`No vegà`** (CA) / **`Non-vegan`** (EN).
- Adopció coherent del terme **`Carta`** en comptes de "Menú" a totes les cadenes en català (*"Carta del restaurant"*, *"Afegeix la carta"*, *"Analitza la carta"*).
- Botó de navegació reanomenat a **`Indicacions`** ("Directions").

---

## 📋 Full de Ruta per a Futures Sessions (Roadmap)

### Fase 1: Ressenyes i Comunitat (Properament)
- [ ] Sistema de valoracions de la comunitat:
  - ⭐ Puntuació general (1 a 5 estrelles).
  - 🍃 Puntuació de compromís vegà (1 a 5 fulles).
- [ ] Formulari d'opinió i ressenya amb verificació d'usuaris.

### Fase 2: Deep Linking i Millores de Compartició
- [ ] Rutes amb paràmetre d'URL per a restaurants (`/map?place=restaurant-id`): en obrir un enllaç compartit, centrar el mapa i obrir directament la fitxa del restaurant.
- [ ] Subenllaços nets per a cartes públiques de restaurants.

### Fase 3: Optimitzacions Avançades
- [ ] Clustering de marcadors al mapa per a zones amb alta densitat de restaurants.
- [ ] Filtres ràpids per tipus de cuina al mapa (Pizzeria, Hamburgueseria, Cafeteria, Tapes, Asiàtic).
- [ ] Proves End-to-End visuals (Playwright) per verificar fluxos complets de cerca i mapa.

---

## 🔒 Polítiques de Desenvolupament i Git
- **Branca activa de treball**: `feature/interactive-map`.
- **Branca de producció**: `main`.
- **Test suite**: 92 tests automatitzats (100% funcionals). Comprovació amb `npm run check`.
