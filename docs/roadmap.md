# Vegan Tools — Full de Ruta

Backlog viu en tres blocs: **Ara** (màxim 5 ítems), **Després** (ordenat) i **Aparcat**. El que es completa s'esborra d'aquí; l'historial és a `git log`. Cada ítem conserva el seu nivell de la matriu d'[AGENTS.md](../AGENTS.md): 🟢 N1 · 🟡 N2 · 🟠 N3 · 🔵 N4.

## 🎯 Rumb

- **Proposta de valor**: saber què pots demanar a qualsevol restaurant, amb la font a la vista.
- **Públic inicial**: vegans ètics a Barcelona i Catalunya, en català.
- **Mètrica nord**: cartes analitzades consultades per setmana (comptador agregat, sense dades d'usuari).
- **Mètrica de guarda**: zero falsos «vegà» al benchmark daurat.
- **Abast**: ampli a propòsit. Els punts forts són el lector de cartes i l'escàner. El receptari està desactivat fins que tingui la mateixa qualitat (22-11-2026).

| Fase | Quan | Criteri de sortida |
|---|---|---|
| 0. Llançable | fins a finals de 2026 | Bloc «Ara» buit. |
| 1. Beta Barcelona | T1 2027 | 100 cartes de Barcelona analitzades, 20 persones provant-ho, 5 converses de feedback. |
| 2. Catalunya | T2–T3 2027 | 500 cartes, 1.000 visites mensuals, 50 diaris actius. |
| 3. Sostenibilitat | T4 2027 | Costos coberts per donacions o subvencions. |

*Les xifres són hipòtesis inicials; es revisen en acabar la fase 1.*

---

## ▶️ Ara (Fase 0)

1. 🟢 **Posar en producció la feina del 22-11-2026**
   - Aplicar a Supabase les migracions `202611220001_account_deletion.sql` (esborrat de compte) i `202611220002_usage_counters.sql` (comptadors), i després fusionar la PR. Sense la primera, l'esborrat de compte falla si l'usuari té referències antigues; sense la segona, els comptadors no es desen (l'API continua funcionant).

---

## ⏭️ Després

### Fase 1 — Beta Barcelona
1. 🟠 **Validar el classificador d'ingredients amb productes reals** (`packages/domain`)
   - El conjunt daurat ja dona 0 falsos vegans i bloqueja la CI, però són 182 etiquetes netes. Des del 22-11-2026, `npm run eval:scan` també prova 21 productes reals d'Open Food Facts (19/21, 0 falsos vegans). Falta ampliar-lo amb sortida d'OCR (errors de lectura, paraules partides) i fotos pròpies a `eval/photos`.
   - Resolt el 22-11-2026: un origen vegetal declarat («lecitina de gira-sol», «E471 (palma)», «glicerina vegetal») ja no fa dubtós el producte (classificador `2026.11.3`).
2. 🟠 **Pre-analitzar 100 cartes de Barcelona** perquè la primera visita trobi contingut a la memòria cau.
3. 🟠 **Proves E2E dels fluxos que falten** (`e2e/`): ja hi ha l'escàner amb càmera simulada, la comprovació d'ingredients i les pàgines principals, en mòbil i escriptori. Falten cerca → fitxa → carta i el registre al diari.
4. 🟡 **Perfils de Liberapay i GitHub Sponsors** enllaçats des de `/about` (vegeu [`funding/funding-options.md`](./funding/funding-options.md)).
5. 🟡 **Reclutar 20 persones de prova** i fer 5 converses de feedback abans de planificar la fase 2.
6. 🟠 **API sense arrencades en fred abans de la beta**: el pla gratuït de Render adorm l'API després de 15 minuts sense trànsit i la primera petició triga prop d'un minut. La RAM no és el problema (l'API ocupa uns 70 MB dels 512 MB).
   - *Sense pagar*: Google Cloud Run (escala a zero amb arrencades d'un o dos segons; el nivell gratuït cobreix de sobres aquest trànsit). Cal un compte de facturació i un `Dockerfile`.
   - *Pagant* (Nils no vol quotes mensuals de moment): Render Starter (~7 $/mes, no s'adorm, zero migració).
   - Comprovar preus a les pàgines oficials abans de decidir; vegeu [`decisions.md`](./decisions.md) («Hosting i base de dades»).
7. 🟡 **Supabase sense pauses**: de moment, el keep-alive reforçat (cada 4 hores, quatre taules). Si torna a avisar de pausa, opcions: Supabase Pro (~25 $/mes, quan es vulgui pagar) o una visita al tauler per reactivar-lo. El límit de 500 MB no és el problema: hi caben milers de cartes.

### Fase 2 — Catalunya
8. 🟠 **Pàgines de ciutat prerenderitzades** (`/barcelona`, `/girona`, …) amb JSON-LD `Restaurant` i entrada al sitemap.
9. 🟡 **Glossari d'additius i ingredients** (`/glossari`), generat des de `ingredient-dictionary.ts`: contingut indexable i offline.
10. 🟡 **Instagram (`@vegan_tools`)**: publicar contingut i després enllaçar-lo al peu, a la capçalera i a `/recursos`.
11. 🟡 **Adhesius QR «Verificat per Vegan Tools»** per a locals 100 % vegans.
12. 🟠 **Capa de santuaris i refugis al mapa** (`type: "sanctuary"`), amb pin propi, filtre i fitxa orientada a visita respectuosa, donacions i apadrinament.
13. 🟠 **Taxonomia de tags i filtres, segona fase**: separar categories gastronòmiques d'atributs, unificar sinònims i aplicar-ho a dades, filtres i etiquetes (auditoria feta amb `npm run audit:cuisine-tags`).
14. 🟡 **Capa «Desats» al mapa** per a la llista «Vull anar-hi», amb sincronització al compte i accés des del perfil.
15. 🟠 **Auditoria d'accessibilitat (WCAG 2.2 AA)**: contrast, teclat, lectors de pantalla i alternativa en llista al mapa.
16. 🟠 **Racionalització de proveïdors de cerca** (`restaurant-search.ts`): de 4 proveïdors a un flux primari/secundari, mesurant cobertura abans i després.
17. 🟡 **Unificar `AddRestaurantModal` i `EditRestaurantModal`** en un sol formulari.
18. 🟠 **Mapa ràpid al mòbil** *(proposta, pendent que en Nils la validi: canvia el motor del mapa; cal tornar a mesurar quan s'apliqui l'ordre de fons preferit del 22-11-2026, perquè amb CARTO o Geoapify primer MapLibre només es carrega com a reserva)* (`RestaurantMap.tsx`, `MenuReaderPage.tsx`): en un mòbil de gamma mitjana el mapa triga uns 5 s a aparèixer i el fons uns 9 s (objectiu: 3 s). La pàgina `/map` descarrega 665 kB de JavaScript, i 290 kB són MapLibre. Passar a MapLibre sol (treure Leaflet, ~43 kB, i el pont `@maplibre/maplibre-gl-leaflet` 0.1.x) i mirar per què el contenidor del mapa espera. Cal reescriure pins, agrupació i finestres emergents, i provar-ho a mòbil.
19. 🟡 **Portada més lleugera** *(proposta, pendent que en Nils la validi)*: LCP de 3,7 s en un mòbil de gamma mitjana (objectiu: 2,5 s). Al paquet inicial hi ha el client de Supabase (diàleg d'inici de sessió), el classificador i les cartes curades, i la portada no els necessita per pintar-se.

### Fase 3 — Sostenibilitat
20. 🟠 **Sol·licituds a EA Animal Welfare Fund i ACE Movement Grants** amb dades d'ús reals de les fases 1 i 2.

---

## 🅿️ Aparcat

Sense data. No és una prohibició: es puja a «Després» quan tingui sentit.

**Escàner i productes**
- 🟠 Alternatives veganes per a productes no vegans des d'Open Food Facts (la càmera ja en suggereix de forma automàtica).
- 🟡 Llegir l'etiqueta de composició de la roba amb les regles deterministes (avui la roba es jutja per reconeixement automàtic).
- 🟡 Desar a Supabase les consultes de marques cruelty free (avui, 24 h a la memòria de l'API).
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

**Receptari** *(desactivat des del 22-11-2026, `apps/web/src/features.ts`)*
- 🟡 Ampliar el receptari de 13 a 30–40 receptes amb fonts acreditades i fotografies d'Espai Segur abans de tornar-lo a activar.
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
