# Vegan Tools — Full de Ruta (Roadmap) & Visió Estratègica

Aquest document estableix l'estat del desenvolupament, les fites assolides i la planificació estratègica de **Vegan Tools**, organitzada en **Funcionalitats** i **Consideracions**.

---

## 🌟 Funcionalitats

### 🗺️ 1. Mapa Interactiu i Descoberta Gastronòmica (`/map`)
Estat: **Fases 1 a 4 Completades i Estabilitzades** (Branca activa: `feature/interactive-map`).
- **Renderitzat Cartogràfic**: Leaflet + CARTO Voyager, ancoratge fix de pins (`iconAnchor`), eliminació de salts en fer zoom i agrupament dinàmic (*Marker Clustering*).
- **Cerca Universal**: Cerca intel·ligent per nom comercial, carrer i ciutats globals amb *debounce* de 300ms, biaix de proximitat suau (`lat/lng`) i viatges instantanis a ciutats.
- **Fitxa de Detall del Restaurant (`RestaurantDetailPane`)**: Distància a peu exacta, fila d'accions (`Carta`, `Web`, `Indicacions`), càrrega instantània de cartes en memòria cau (<5ms) i deep-linking a la URL (`?place=id`).
- **UI Mòbil / Bottom Sheet**: Panell compacte inferior flotant amb marges, alçada ajustada (`84vh`), suport tàctil (*Pointer & Touch Events*), bloqueig en repòs i col·lapse automàtic en tocar el mapa.
- **Barra de Filtres Ràpids**: `🍃 4+ fulles`, `🌱 100% Vegà`, `🌿 Opcions veganes`, `🚫🌾 Sense gluten`, `🍕 Italià`, `🍜 Asiàtic`, `🍣 Sushi`, `🍔 Burger`, `🥙 Kebab`, `🥗 Vegetarià`, `🍢 Tapes`, etc.
- **⭐ Restaurants Destacats (*Curated Top Picks*)**: Llista curada de 20 a 50 establiments d'excel·lència gastronòmica per gran ciutat. **Requisit estricte**: Tots els destacats han de ser **exclusivament 100% vegans** i estaran identificats al mapa amb un marcador/pin **daurat distintiu** (sense cap altre color secundari).
  - *Format de Dades per al Roadmap*: Modularitzar la col·lecció en fitxers **JSON nets i desacoblats per ciutat** (ex: `data/featured/barcelona.json`, `data/featured/girona.json`, `data/featured/london.json`) perquè siguin fàcilment editables, auditables i exportables.
- **📱 Testing Manual i Exploratori en Mòbil (Pendent)**:
  - Sessió de proves manuals en dispositius reals (iOS Safari i Android Chrome) per verificar gestos tàctils, estats del BottomSheet (`collapsed`, `half`, `expanded`), botons de trucada/indicacions/carta i rendiment general del mapa.

### 🏛️ 2. Arquitectura de Base de Dades Unificada & Pàgines de Restaurant
Estat: **Disseny d'Enginyeria & Model ER**.
- **Model Relacional Sòlid**: Superar els repositoris fragmentats en memòria i consolidar l'esquema (`restaurants`, `restaurant_media`, `restaurant_reviews`, `restaurant_menus`, `dishes`, `community_tags`) amb suport per a SQLite/libSQL en local i PostgreSQL/Supabase en producció.
- **Pàgines de Perfil de Restaurant Dedicades (`/restaurant/:id`)**: Fitxa completa per a cada negoci amb galeria d'imatges d'**espai segur** (zero carn/explotació animal), història del local, desglossament d'horaris per dia de la setmana, carta interactiva analitzada i ressenyes ètiques.
- **💬 Sistema de Ressenyes Ètiques & Valoració de Fulles**: Opinions verificades de la comunitat, valoració botànica (1 a 5 fulles), recomanacions de plats concrets i política d'espai segur estricta (tolerància zero amb imatges de carn o explotació animal).

### 🍳 3. Receptari Mestre & Veganitzador Intel·ligent (`/recipes`)
Estat: **Veganitzador actiu; Hub de receptes en expansió**.
- **Veganitzador per IA & Regles Culinàries**: Substitució precisa d'ingredients animals per alternatives reals contrastades.
- **Hub de Receptes Mestres Veganes**: Formatges vegans artesans, rebosteria sense ou ni llet, plats tradicionals catalans i internacionals amb filtres per al·lèrgens (sense gluten, sense fruita seca, sense soja).
- **Mode Cuina**: Instruccions pas a pas a pantalla completa amb temporitzadors integrats i generador de llista de la compra.

### 🔍 4. Escàner d'Ingredients & Auditoria de Productes (`/`)
Estat: **Operatiu amb Open Food Facts & OCR d'Etiquetes**.
- **Classificació d'Additius i Traçabilitat**: Detecció d'additius ocults (E120, carmí, albúmina, sèrum de llet, gelatina, additius de peix) amb jerarquia d'evidències del 99% de precisió.
- **Historial Local i Mode Desconnectat**: Consulta ràpida de productes recents sense emmagatzemar perfils d'usuari permanents.

### 👤 5. Perfils d'Usuari, Preferències & Configuració (`/profile`)
Estat: **Disseny & Autenticació Bàsica**.
- **Preferències Dietètiques i d'Al·lèrgies**: Filtre personalitzat automàtic (sense gluten, sense soja, sense fruits secs, només 100% vegà).
- **🎨 Temes Visuals (Mode Clar / Mode Fosc)**: Suport per a commutació entre **Mode Clar** (*Light*) i **Mode Fosc** (*Dark*) amb sincronització automàtica segons la preferència del sistema (`prefers-color-scheme`).
- **Llista de Restaurants Guardats i Preferits**: Marcadors personals al mapa de locals per visitar o favorits.
- **Historial d'Aportacions i Ressenyes**: Gestió de les pròpies cartes pujades, fotos d'espai segur i valoracions de fulles.
- **Privacitat Estricta**: Opció d'ús 100% anònim / local sense compte o amb autenticació Supabase sense rastreig.

### 📚 6. Hub de Recursos, Nutrició i Santuaris (`/resources`)
Estat: **Disseny de Continguts**.
- Guia de nutrició basada en evidències (B12, ferro, proteïnes vegetals, omega-3).
- Catàleg de documentals, llibres i respostes a preguntes freqüents sobre antiespecisme.
- Directori i mapa de santuaris d'animals i refugis.

### 🧹 7. Refactorització Modular del Backend Fastify (`apps/api`)
Estat: **Planificat**.
- Modularitzar el fitxer monolític `app.ts` (>2.000 línies) en controladors i rutes aïllades (`/routes/restaurants.ts`, `/routes/menus.ts`, `/routes/reviews.ts`, `/routes/veganizer.ts`).

---

## 💡 Consideracions

1. **🌐 Internacionalització, Enrutament i Subdominis d'Idioma**:
   - Resolució per subdomini (`ca.vegantools.org` / `en.vegantools.org`) o paràmetre d'idioma a la URL (`?lang=en` o `/en/`, `/ca/`) per compartir enllaços directes i optimització SEO internacional.
2. **🎨 Revisió Visual del Mapa (Colors, Ratings i Icones)**:
   - Harmonització de la paleta botànica de colors dels pins (verd bosc per a 100% vegà, ambre per a vegetarià, blau per a opcions).
   - Disseny unificat del sistema de fulles (🍃 1 a 5) i icones vectorials SVG.
3. **✨ Ressaltat Bidireccional Pin ↔ Llista (Desktop)**:
   - En passar el cursor per sobre d'un restaurant a la llista lateral, fer que el seu marcador al mapa s'il·lumini o ressalti visualment.
4. **🐾 Capa Ètica de Santuaris d'Animals**:
   - Marcadors diferenciats al mapa per a **Santuaris d'animals i refugis** (d'acord amb el Manifest Ètic a [`docs/values.md`](./values.md)).
6. **🚩 Botó «Suggereix un canvi» a la Fitxa del Restaurant**:
   - Formulari ràpid perquè la comunitat pugui notificar canvis d'adreça, tancaments permanents o nous plats vegans.
7. **📲 PWA & Capacitats Offline**:
   - Millora del manifest de la PWA per a instal·lació a pantalla d'inici i funcionament bàsic de consulta sense connexió.
8. **🕒 Estratègia d'Horaris en Segon Pla**:
   - Recollir i emmagatzemar progressivament horaris reals amb Gemini Search Grounding / webs oficials / Google Places al backend fins a assolir una cobertura massiva (>90%) abans de reactivar el filtre públic «Obert ara».
9. **✂️ Concisió Visual i Reducció d'Informació Redundant**:
   - Auditar totes les pantalles per eliminar textos explicatius excessivament llargs, frases repetides i duplicats d'informació a una mateixa pàgina, afavorint una interfície neta, àgil i directa.
10. **📷 Permisos de Càmera a Safari iOS & Escàner de Codi de Barres**:
    - Safari a iPhone exigeix exclusivament context HTTPS per habilitar la transmissió directa per streaming de vídeo (`getUserMedia`).
    - En entorns de desenvolupament local (HTTP via Wi-Fi), s'ha de garantir que el selector d'imatges directe per càmera (`<input type="file" capture="environment">`) funcioni de forma instantània com a alternativa nativa robusta.

---

## 🛡️ Documents de Referència
- 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./values.md)
- 🏛️ **Guia d'Arquitectura i Descoberta de Cartes**: [`docs/architecture.md`](./architecture.md)
- 🐛 **Registre d'Incidències i Bug Tracking**: [`docs/bugs.md`](./bugs.md)
- 📊 **Auditoria de Dades d'OpenStreetMap**: [`docs/osm-audit-results.md`](./osm-audit-results.md)
- 🎯 **Metodologia de Fiabilitat**: [`docs/reliability.md`](./reliability.md)
