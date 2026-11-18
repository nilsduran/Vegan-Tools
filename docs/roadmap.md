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
4. 🟠 **Proves E2E dels fluxos que falten** (`e2e/`): ja hi ha l'escàner amb càmera simulada, la comprovació d'ingredients i les pàgines principals, en mòbil i escriptori. Falten cerca → fitxa → carta i el registre al diari.
5. 🟡 **Perfils de Liberapay i GitHub Sponsors** enllaçats des de `/about` (vegeu [`funding/funding-options.md`](./funding/funding-options.md)).
6. 🟡 **Reclutar 20 persones de prova** i fer 5 converses de feedback abans de planificar la fase 2.
7. 🟠 **API sense arrencades en fred abans de la beta**: el pla gratuït de Render adorm l'API després de 15 minuts sense trànsit i la primera petició triga prop d'un minut. La RAM no és el problema (l'API ocupa uns 70 MB dels 512 MB).
   - *Sense pagar*: Google Cloud Run (escala a zero amb arrencades d'un o dos segons; el nivell gratuït cobreix de sobres aquest trànsit). Cal un compte de facturació i un `Dockerfile`.
   - *Pagant* (Nils no vol quotes mensuals de moment): Render Starter (~7 $/mes, no s'adorm, zero migració).
   - Comprovar preus a les pàgines oficials abans de decidir; vegeu [`decisions.md`](./decisions.md) («Hosting i base de dades»).
8. 🟡 **Supabase sense pauses**: de moment, el keep-alive reforçat (cada 4 hores, quatre taules). Si torna a avisar de pausa, opcions: Supabase Pro (~25 $/mes, quan es vulgui pagar) o una visita al tauler per reactivar-lo. El límit de 500 MB no és el problema: hi caben milers de cartes.

### Fase 2 — Catalunya
9. 🟠 **Pàgines de ciutat prerenderitzades** (`/barcelona`, `/girona`, …) amb JSON-LD `Restaurant` i entrada al sitemap.
10. 🟡 **Ampliar el receptari de 13 a 30–40 receptes**, cobrint les categories existents, amb fonts acreditades i fotografies d'Espai Segur.
11. 🟡 **Glossari d'additius i ingredients** (`/glossari`), generat des de `ingredient-dictionary.ts`: contingut indexable i offline.
12. 🟡 **Instagram (`@vegan_tools`)**: publicar contingut i després enllaçar-lo al peu, a la capçalera i a `/recursos`.
13. 🟡 **Adhesius QR «Verificat per Vegan Tools»** per a locals 100 % vegans.
14. 🟠 **Capa de santuaris i refugis al mapa** (`type: "sanctuary"`), amb pin propi, filtre i fitxa orientada a visita respectuosa, donacions i apadrinament.
15. 🟠 **Taxonomia de tags i filtres, segona fase**: separar categories gastronòmiques d'atributs, unificar sinònims i aplicar-ho a dades, filtres i etiquetes (auditoria feta amb `npm run audit:cuisine-tags`).
16. 🟡 **Capa «Desats» al mapa** per a la llista «Vull anar-hi», amb sincronització al compte i accés des del perfil.
17. 🟠 **Auditoria d'accessibilitat (WCAG 2.2 AA)**: contrast, teclat, lectors de pantalla i alternativa en llista al mapa.
18. 🟠 **Racionalització de proveïdors de cerca** (`restaurant-search.ts`): de 4 proveïdors a un flux primari/secundari, mesurant cobertura abans i després.
19. 🟡 **Historial d'escaneig local** (`/scanner`), només a `localStorage`.
20. 🟡 **Unificar `AddRestaurantModal` i `EditRestaurantModal`** en un sol formulari.
21. 🟠 **Mapa ràpid al mòbil** (`RestaurantMap.tsx`, `MenuReaderPage.tsx`): en un mòbil de gamma mitjana el mapa triga uns 5 s a aparèixer i el fons uns 9 s (objectiu: 3 s). La pàgina `/map` descarrega 665 kB de JavaScript, i 290 kB són MapLibre. Passar a MapLibre sol (treure Leaflet, ~43 kB, i el pont `@maplibre/maplibre-gl-leaflet` 0.1.x) i mirar per què el contenidor del mapa espera. Cal reescriure pins, agrupació i finestres emergents, i provar-ho a mòbil.
22. 🟡 **Portada més lleugera**: LCP de 3,7 s en un mòbil de gamma mitjana (objectiu: 2,5 s). Al paquet inicial hi ha el client de Supabase (diàleg d'inici de sessió), el classificador i les cartes curades, i la portada no els necessita per pintar-se.

### Fase 3 — Sostenibilitat
23. 🟠 **Sol·licituds a EA Animal Welfare Fund i ACE Movement Grants** amb dades d'ús reals de les fases 1 i 2.

---

## 🅿️ Aparcat

Sense data. No és una prohibició: es puja a «Després» quan tingui sentit.

**Escàner i productes**
- 🟠 Alternatives veganes per a productes no vegans (Open Food Facts).
- 🟠 Cosmètica i higiene (Open Beauty Facts).
- 🟠 Moda, calçat i materials.
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
