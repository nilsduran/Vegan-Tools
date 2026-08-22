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
- [x] **Fase 2**: Autocomplete ràpid (*typeahead*) al camp de cerca i píndoles de filtre per tipus de cuina i dietètica amb combinació AND/OR (`🍃 4+ fulles`, `🕒 Obert ara`, `🌱 100% Vegà`, `🍽️ Restaurant`, `☕ Cafeteria i fleca`, `🍝 Italià`, `🥢 Asiàtic` + panell desplegable de més filtres).
- [x] **Fase 3**: Panell inferior lliscant (*Bottom Sheet* responsive de 3 posicions: `collapsed` / `half` / `expanded` amb gestos tàctils de lliscament, tirador accessible i transicions suaus) per a dispositius mòbils.
- [x] **Fase 4**: Agrupació de marcadors (*Marker Clustering*) dinàmica segons el nivell de zoom per a zones d'alta densitat urbana amb zoom intel·ligent en fer-hi clic.
- [ ] **Expansió de Filtres i Categories**:
  - Afegir categories d'interès ètic i educatiu: **Santuaris d'animals** i **Classes / Tallers de cuina vegana**.
  - **Personalització i reordenació dels filtres**: Permetre a l'usuari triar i ordenar les píndoles preferides a la barra ràpida.

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

## 👥 5. Ressenyes Comunitàries & Autenticació d'Usuaris (Futur Llunyà)

Estat: **Definit conceptualment (previst per a fases avançades de comunitat)**.

### 🎯 Objectiu:
Permetre a la comunitat valorar restaurants amb la mètrica pròpia de **5 Fulles (🍃 1 a 5)** per mesurar l'experiència global vegana (qualitat, varietat i adaptacions de la carta), garantint la màxima seguretat i privacitat.

### 🔑 Principis d'Arquitectura i UX:
1. **Navegació 100% Oberta i Anònima**:
   - Cap persona necessita crear un compte per consultar el mapa, llegir cartes, escanejar codis de barres o veganitzar receptes.
   - El compte només és requerit en el moment voluntari d'escriure o editar una valoració.
2. **Seguretat Delegada (Supabase Auth)**:
   - Zero emmagatzematge manual de contrasenyes o gestió de ciberseguretat criptogràfica; delegat 100% a la infraestructura de Supabase (xifrat Argon2id / bcrypt, protecció contra atacs de força bruta, compliment GDPR).
3. **Mètodes d'Accés Minimalistes**:
   - 🌐 **Google OAuth** (mètode majoritari en 1 clic per a Android, Chrome i Gmail).
   - 🍏 **Apple Sign-In** (essencial per a usuaris iOS/Safari, amb opció de correu ocult per a màxima privacitat).
   - ✉️ **Correu Electrònic (Magic Link / Password)** (alternativa neutral sense dependència de grans tecnològiques).
4. **Integritat de Dades**:
   - Polítiques Row-Level Security (RLS) a PostgreSQL que garanteixen que 1 usuari = 1 ressenya per local, i que només l'autor pot editar o esborrar el seu vot.
5. **Característiques i Etiquetes Col·laboratives (Crowdsourcing de Filtres)**:
   - Els usuaris podran afegir i votar característiques del restaurant durant la ressenya (`🌱 100% Vegà`, `🌾 Opcions sense gluten`, `☀️ Terrassa`, `🐾 Pet-friendly`, `☕ Llet vegetal sense suplement`, `♿ Accessible`).
   - Això permet alimentar i verificar els filtres del mapa a través de l'experiència real de la comunitat sense dependre d'inferències automàtiques o dades de tercers incompletes.

---

## 📢 6. Llançament de la Beta, Creixement i Difusió

Estat: **Planificació de sortida**.

- [ ] **Llançament de la versió Beta pública**:
  - Desplegament a producció amb domini propi i certificat SSL.
  - Canals de feedback ràpid per a la comunitat (formulari de correcció de plats i suggeriments de millora).
- [ ] **Estratègia de difusió comunitària**:
  - Presentació en fòrums, comunitats veganes (Reddit r/vegan, grups de Telegram/Discord, comunitats locals de Catalunya).
  - Presència i difusió en fires i esdeveniments vegans (Vegan Fest Catalunya, mercats ecològics).
  - Contacte amb creadors de contingut gastronòmic i divulgadors d'estil de vida basat en plantes.

---

## 🔒 7. Privacitat, GDPR i Filosofia "Zero Banners de Cookies"

Estat: **Arquitectura Privacy-First per disseny**.

- **Sense Galetes de Tercers ni Rastrejadors**:
  - Vegan Tools no utilitza cookies publicitàries, ni píxels de Meta, ni eines de seguiment intrusiu de Google.
  - **Sense banner molest de cookies**: En no emmagatzemar dades personals per a finalitats de perfilat comercial, **no és legalment necessari mostrar el típic banner de consentiment de cookies**, oferint una experiència d'usuari immediata, neta i respectuosa.
- **Emmagatzematge Local Estrictament Funcional**:
  - L'emmagatzematge del navegador (`localStorage`) s'utilitza únicament per desar la preferència d'idioma de l'usuari (`ca`/`en`) i l'historial recent de codis de barres escanejats al mateix dispositiu.
- **Geolocalització Transparent**:
  - La ubicació GPS s'utilitza únicament en memòria per calcular distàncies locals i mai s'emmagatzema en cap base de dades.

---

## 🛡️ Polítiques d'Enginyeria & Workflow de Desenvolupament
- **Guia d'Agents**: [`AGENTS.md`](../AGENTS.md)
- **Registre de Bugs**: [`docs/bugs.md`](./bugs.md)
- **Test Suite**: 119 tests automatitzats passant al 100%.
- [ ] **Optimització del Cicle de Desenvolupament (Execució de Tests per Feature/Workflow)**:
  - Durant el desenvolupament iteratiu i ràpid d'una subfuncionalitat, **limitar l'execució de tests exclusivament als fitxers i paquets afectats** (ex: `npx vitest run apps/web/src/pages/MenuReaderPage.test.tsx` o `npm run typecheck`) per no alentir el flux de treball.
  - L'execució de la suite completa (`npm run check`, que inclou `pretypecheck` -> `typecheck` -> tots els 110 tests -> `build` de producció -> `check:secrets`) es reserva únicament per a moments clau: **abans de fer push, obrir una PR o fer merge a `main`**.
