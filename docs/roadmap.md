# Vegan Tools — Full de Ruta

Backlog viu en tres blocs: **Ara** (màxim 5 ítems), **Després** (ordenat) i **Aparcat**. El que es completa s'esborra d'aquí; l'historial és a `git log`. Cada ítem conserva el seu nivell de la matriu d'[AGENTS.md](../AGENTS.md): 🟢 N1 · 🟡 N2 · 🟠 N3 · 🔵 N4.

## 🎯 Rumb

- **Proposta de valor**: saber què pots demanar a qualsevol restaurant, amb la font a la vista.
- **Públic inicial**: vegans ètics a Barcelona i Catalunya, en català.
- **Mètrica nord**: cartes analitzades consultades per setmana (comptador agregat, sense dades d'usuari).
- **Mètrica de guarda**: zero falsos «vegà» al benchmark daurat.
- **Abast**: ampli a propòsit. Els punts forts són el lector de cartes i l'escàner; el receptari és el més fluix.

| Fase | Quan | Criteri de sortida |
|---|---|---|
| 0. Llançable | fins a finals de 2026 | Bloc «Ara» buit. |
| 1. Beta Barcelona | T1 2027 | 100 cartes de Barcelona analitzades, 20 persones provant-ho, 5 converses de feedback. |
| 2. Catalunya | T2–T3 2027 | 500 cartes, 1.000 visites mensuals, 50 diaris actius. |
| 3. Sostenibilitat | T4 2027 | Costos coberts per donacions o subvencions. |

*Les xifres són hipòtesis inicials; es revisen en acabar la fase 1.*

---

## ▶️ Ara (Fase 0)

1. 🟢 **Frescor de la carta** (`MenuView.tsx`, `RestaurantDetailPane.tsx`)
   - Mostrar «Carta analitzada fa 8 mesos» a partir del `savedAt` de la memòria cau, amb avís a partir de 6 mesos i botó per tornar-la a analitzar.
2. 🟢 **Nivell d'evidència visible als veredictes** (escàner i cartes)
   - Etiqueta al costat de cada veredicte amb la font: «Certificat V-Label», «Etiqueta verificada», «Open Food Facts», «Anàlisi automàtica».
3. 🟢 **Exportar i esborrar el compte de veritat** (`SettingsPage.tsx`, API)
   - L'exportació i l'esborrat local ja funcionen. Falta `DELETE /v1/users/me` (visites, ressenyes, Top 4 i usuari de Supabase Auth) i que l'exportació inclogui les dades del núvol. El diàleg ja promet un esborrat permanent que avui no es fa.
4. 🟠 **Preparar la beta: domini canònic i comptadors agregats**
   - Un sol domini públic (`vegantools.org` al sitemap, `onrender.com` al README).
   - Sobre el traçat de peticions existent: taxa d'encert de la memòria cau, cartes consultades, tokens de Gemini per ruta, errors de proveïdors. Només comptadors, mai identificadors, ubicacions ni cerques.

---

## ⏭️ Després

### Fase 1 — Beta Barcelona
1. 🟠 **Validar el classificador d'ingredients amb productes reals** (`packages/domain`)
   - El conjunt daurat ja dona 0 falsos vegans i bloqueja la CI, però són 182 etiquetes netes. Falta provar-lo amb textos reals d'Open Food Facts i amb sortida d'OCR (errors de lectura, paraules partides).
   - Falsos positius coneguts: lecitina i aromes amb origen vegetal declarat («lecitina de gira-sol») surten com a dubtosos.
2. 🟠 **Pre-analitzar 100 cartes de Barcelona** perquè la primera visita trobi contingut a la memòria cau.
3. 🟠 **Lector universal de codis a l'escàner** (`/scanner`): QR i qualsevol codi de barres en un sol lector; els codis numèrics van al flux de productes, les URL i QR de cartes al descobridor de cartes.
4. 🟠 **Proves E2E dels fluxos nuclears (Playwright)**: cerca → fitxa → carta, escaneig d'un codi de barres i registre al diari.
5. 🟡 **Perfils de Liberapay i GitHub Sponsors** enllaçats des de `/about` (vegeu [`funding/funding-options.md`](./funding/funding-options.md)).
6. 🟡 **Reclutar 20 persones de prova** i fer 5 converses de feedback abans de planificar la fase 2.

### Fase 2 — Catalunya
7. 🟠 **Pàgines de ciutat prerenderitzades** (`/barcelona`, `/girona`, …) amb JSON-LD `Restaurant` i entrada al sitemap.
8. 🟡 **Ampliar el receptari de 13 a 30–40 receptes**, cobrint les categories existents, amb fonts acreditades i fotografies d'Espai Segur.
9. 🟡 **Glossari d'additius i ingredients** (`/glossari`), generat des de `ingredient-dictionary.ts`: contingut indexable i offline.
10. 🟡 **Instagram (`@vegan_tools`)**: publicar contingut i després enllaçar-lo al peu, a la capçalera i a `/recursos`.
11. 🟡 **Adhesius QR «Verificat per Vegan Tools»** per a locals 100 % vegans.
12. 🟠 **Capa de santuaris i refugis al mapa** (`type: "sanctuary"`), amb pin propi, filtre i fitxa orientada a visita respectuosa, donacions i apadrinament.
13. 🟠 **Taxonomia de tags i filtres, segona fase**: separar categories gastronòmiques d'atributs, unificar sinònims i aplicar-ho a dades, filtres i etiquetes (auditoria feta amb `npm run audit:cuisine-tags`).
14. 🟡 **Capa «Desats» al mapa** per a la llista «Vull anar-hi», amb sincronització al compte i accés des del perfil.
15. 🟠 **Auditoria d'accessibilitat (WCAG 2.2 AA)**: contrast, teclat, lectors de pantalla i alternativa en llista al mapa.
16. 🟠 **Racionalització de proveïdors de cerca** (`restaurant-search.ts`): de 4 proveïdors a un flux primari/secundari, mesurant cobertura abans i després.
17. 🟡 **Historial d'escaneig local** (`/scanner`), només a `localStorage`.
18. 🟡 **Unificar `AddRestaurantModal` i `EditRestaurantModal`** en un sol formulari.

### Fase 3 — Sostenibilitat
19. 🟠 **Sol·licituds a EA Animal Welfare Fund i ACE Movement Grants** amb dades d'ús reals de les fases 1 i 2.

---

## 🅿️ Aparcat

Sense data. No és una prohibició: es puja a «Després» quan tingui sentit.

**Escàner i productes**
- 🟠 Alternatives veganes per a productes no vegans (Open Food Facts).
- 🟠 Cosmètica i higiene (Open Beauty Facts).
- 🟠 Moda, calçat i materials.
- 🟠 Model propi ONNX: fora de producció; el lèxic d'Open Food Facts cobreix ara el que havia de cobrir; decidir si es retira el codi d'integració.
- 🔵 Historial d'escaneig sincronitzat i base de dades global de productes.

**Mapa i restaurants**
- 🟡 Filtre «plats adaptables» a la cerca (necessita cobertura de cartes significativa).
- 🔵 Hubs curats fora de Catalunya: es mantenen els existents, no se n'afegeixen.
- 🔵 Horaris en segon pla per reactivar «Obert ara» (cobertura > 90 %).
- 🔵 Sincronització opcional amb OpenStreetMap (OAuth 2.0).
- 🔵 Capa d'esdeveniments i jornades a santuaris.
- 🔵 Rajoles de Barcelona en local (PMTiles).

**Perfil i comunitat**
- 🟠 Estadístiques gastronòmiques avançades al perfil.
- 🔵 Estadístiques d'impacte personals i comunitàries.
- 🔵 Llistes públiques compartibles (`/lists`).
- 🔵 Gamificació, ambaixadors locals i recerca de HappyCow.
- 🔵 Moderador automàtic d'Espai Segur per a imatges pujades.

**Receptari**
- 🔵 Fotografies pas a pas al Mode Cuina.

**Plataforma**
- 🔵 Aplicacions natives per a iOS i Android (Capacitor).
- 🔵 Subdominis o prefixos d'idioma per a SEO internacional.
- 🟡 Mida d'icones i etiquetes a la navegació mòbil.
- 🟡 Finestra del ping de manteniment de Render.
- 🟡 Redirecció geogràfica d'afiliats d'Amazon (OneLink), posposada fins que hi hagi trànsit públic.

---

## ⛔ Decisions fermes

- **Filtres d'al·lèrgies i anafilaxi: exclosos per seguretat mèdica.** L'app tracta la composició ètica vegana/vegetariana; no dona garanties d'al·lèrgens ni de contaminació creuada.
- **Destacats curats: 100 % vegans per contracte** (`isVegan: true`), validat per `npm run audit:pins`.

---

## 🛡️ Documents de Referència
- 🏛️ [`docs/architecture.md`](./architecture.md) — arquitectura, descoberta de cartes i jerarquia d'evidències.
- 💚 [`docs/values.md`](./values.md) — manifest ètic i carta de valors.
- 🧠 [`docs/decisions.md`](./decisions.md) — què es va decidir i per què.
