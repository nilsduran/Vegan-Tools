# Vegan Tools — Project Roadmap & Vision

Aquest document detalla l'estat actual del desenvolupament, les funcionalitats completades a la branca `feature/interactive-map` i la planificació estratègica de Vegan Tools.

---

## 🗺️ 1. Mapa Interactiu & Exploració (`/map`)

Estat: **Fase 1 completada i optimitzada** (en desenvolupament a `feature/interactive-map`).

### 🌟 Funcionalitats implementades:
- **Visualització d'alta precisió (Leaflet + OpenStreetMap + CARTO Voyager)**:
  - Ancoratge mil·limètric de pins (`iconAnchor: [width/2, height]`) sense desplaçament en fer zoom.
  - Títols dels restaurants visibles directament sobre el mapa a `zoom >= 14` i ocults en fer zoom out per mantenir el mapa net.
  - Pins curats inicials de referència per a cada regió (amb resolució instantània).
- **Cerca intel·ligent amb biaix de proximitat universal (Komoot Photon + Nominatim)**:
  - Cerca per nom comercial o carrer ("Desoriente", "La Tagliatella", "Purezza") que prioritza automàticament la ubicació de l'usuari sense obligar a escriure la ciutat.
- **Accions i Fitxa del Restaurant (`RestaurantDetailPane`)**:
  - Distància exacta calculada (`350 m`, `1.4 km`) respecte la posició de l'usuari.
  - Accions en una sola línia: `<Utensils /> Carta`, `<Globe /> Web`, `<Navigation /> Indicacions`.
  - Enllaços adaptatius: protocol `geo:lat,lng` a mòbil i Google Maps Directions a desktop.
- **Memòria cau instantània de cartes (`RestaurantMenuCache`)**:
  - Resposta immediata (< 5ms) en tornar a obrir un restaurant ja consultat.
- **Sincronització d'estat a la URL (`/map?place=id`) i compatibilitat amb el botó Enrere**.

### 🔜 Propers passos del Mapa:
- [ ] **Fase 2**: Autocomplete ràpid (*typeahead*) al camp de cerca i píndoles de filtre per tipus de cuina (`🌱 100% Vegà`, `🍕 Pizzeria`, `🍔 Burgers`, `🕒 Obert ara`).
- [ ] **Fase 3**: Panell inferior lliscant (*Bottom Sheet* responsive de 3 posicions) per a dispositius mòbils.
- [ ] **Fase 4**: Agrupació de marcadors (*Marker Clustering*) per a zones d'alta densitat urbana.

---

## 🍳 2. Receptari Vegà & Veganitzador (`/recipes`)

Estat: **Receptari bàsic i veganitzador actius; expansió a Hub de Receptes planificada**.

### 🌟 Funcionalitats actuals:
- **Veganitzador intel·ligent**: Substitució automàtica d'ous (inclosos rovells i clares específics), làctics, carns i gelatines amb concordança gramatical catalana.
- **Porta-retalls ràpid** i selecció d'exemples tradicionals (Pancakes, Canelons, Crema Catalana, Pa de Pessic, Galetes).

### 🚀 Plans d'expansió (El Gran Receptari Vegà per defecte):
- [ ] **Mini Receptari Curat de les Millors Receptes Veganes**:
  - Convertir `/recipes` en un hub culinari de referència amb receptes 100% veganes provades i garantides per defecte (no només adaptacions d'ingredients).
  - Categories clau:
    1. 🧀 **Formatges vegans casolans** (formatge fresc de nous de macadàmia, parmesà de festucs, mozzarella fondent de tapioca).
    2. 🍲 **Plats de cullera i tradicionals** (escudella vegana, estofats de seitan, arrossos de muntanya amb bolets).
    3. 🍰 **Pastisseria i postres sense ou ni llet** (mousse d'aquafaba, pastís de xocolata, crema pastissera).
    4. 🥗 **Plats ràpids d'alt contingut proteic** (tofu marinat cruixent, tempeh glacejat, llegums especiats).
- [ ] **Filtres per temps de preparació, nivell de dificultat i al·lèrgens (sense gluten, sense fruita seca)**.
- [ ] **Mode cuina pas a pas** amb instruccions clares i temporitzadors.

---

## 📚 3. Recursos, Guies i Activisme Vegà (`/resources`)

Estat: **Nova secció en disseny (inspirada en VeganEasy.org i col·lectius de referència)**.

### 🎯 Objectiu:
Proporcionar una porta d'entrada accessible, positiva, ben documentada i sense judicis per a qualsevol persona interessada en el veganisme, la nutrició o la defensa dels animals.

### 📑 Continguts planificats:
1. **Guia d'iniciació nutricional (Basada en evidències científiques)**:
   - Suplementació de vitamina B12 (dosis recomanades i freqüència).
   - Fonts de ferro, calci, proteïna vegetal i àcids grassos omega-3.
   - Consells pràctics per fer la transició de manera saludable i sostenible.
2. **Documentals i Llibres Recomanats**:
   - Documentals sobre ètica, salut i medi ambient (*Earthlings*, *Dominion*, *Cowspiracy*, *The Game Changers*).
   - Enllaços directes a plataformes de visualització oberta.
3. **Respostes a Dubtes Freqüents i Arguments Ètics**:
   - Explicacions clares i constructives a preguntes habituals ("I les proteïnes?", "I les tradicions?", "És més car ser vegà?").
4. **Directori d'Activisme i Santuaris**:
   - Mapa i directori de santuaris d'animals a Catalunya i l'Estat (per fer voluntariat o visites educatives).
   - Associacions i grups de defensa dels drets dels animals.

---

## 🎨 4. Redisseny Global de la Interfície (UI/UX)

Estat: **Previst per a la Fase de Consolidació**.

- [ ] **Nou sistema de disseny unificat**:
  - Paleta de colors moderna i contrastada (verds botànics, fons càlids, tipografies netes).
  - Micro-interaccions fluides (transicions suaus d'obertura de cartes, càrrega amb esquelets *skeleton loaders*).
  - Disseny responsive d'alt nivell (adaptació òptima des de telèfons compactes fins a monitors panoràmics).
- [ ] **Mode Fosc / Mode Clar** respectant les preferències del sistema operatiu.

---

## 📢 5. Llançament de la Beta, Creixement i Difusió

Estat: **Planificació de sortida**.

- [ ] **Llançament de la versió Beta pública**:
  - Desplegament a producció amb domini propi i certificat SSL.
  - Canals de feedback ràpid per a la comunitat (formulari de correcció de plats i suggeriments de millora).
- [ ] **Estratègia de difusió comunitària**:
  - Presentació en fòrums, comunitats veganes (Reddit r/vegan, grups de Telegram/Discord, comunitats locals de Catalunya).
  - Presència i difusió en fires i esdeveniments vegans (Vegan Fest Catalunya, mercats ecològics).
  - Contacte amb creadors de contingut gastronòmic i divulgadors d'estil de vida basat en plantes.

---

## 🔒 6. Privacitat, GDPR i Filosofia "Zero Banners de Cookies"

Estat: **Arquitectura Privacy-First per disseny**.

- **Sense Galetes de Tercers ni Rastrejadors**:
  - Vegan Tools no utilitza cookies publicitàries, ni píxels de Meta, ni eines de seguiment intrusiu de Google.
  - **Sense banner molest de cookies**: En no emmagatzemar dades personals per a finalitats de perfilat comercial, **no és legalment necessari mostrar el típic banner de consentiment de cookies**, oferint una experiència d'usuari immediata, neta i respectuosa.
- **Emmagatzematge Local Estrictament Funcional**:
  - L'emmagatzematge del navegador (`localStorage`) s'utilitza únicament per desar la preferència d'idioma de l'usuari (`ca`/`en`) i l'historial recent de codis de barres escanejats al mateix dispositiu.
- **Geolocalització Transparent**:
  - La ubicació GPS s'utilitza únicament en memòria per calcular distàncies locals i mai s'emmagatzema en cap base de dades.

---

## 🛡️ Polítiques d'Enginyeria
- **Guia d'Agents**: [`AGENTS.md`](../AGENTS.md)
- **Registre de Bugs**: [`docs/bugs.md`](./bugs.md)
- **Test Suite**: 98 tests automatitzats passant al 100%. Verificació amb `npm run check`.
