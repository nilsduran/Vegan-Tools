# AGENTS.md — Vegan Tools Engineering & AI Guidelines

Aquest document estableix les directrius tècniques, els principis d'arquitectura, el flux de treball i les regles d'enginyeria per a qualsevol agent d'IA que col·labori en el repositori **Vegan Tools**.

---

## 🧭 1. Documents de Referència i Filosofia de Documentació

Per evitar la dispersió en múltiples fitxers obsolets o secundaris, el repositori concentra el coneixement clau en **3 pilars documentals actius**:

1. 🗺️ **Full de Ruta i Backlog Prioritzat**: [`docs/roadmap.md`](./docs/roadmap.md)
   - L'única font de veritat sobre l'estat del desenvolupament, deute tècnic i tasques pendents, ordenades estrictament pels 4 nivells de priorització.
2. 🏛️ **Guia d'Arquitectura i Descoberta**: [`docs/architecture.md`](./docs/architecture.md)
   - Diagrames de flux, resolució de dominis amb IA, jerarquia d'evidències (precisió 99%), seguretat SSRF i referència de l'API.
3. 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./docs/values.md)
   - Principis morals antiespecistes, política estricta d'espai segur (tolerància zero amb imatges d'explotació animal) i privacitat zero-tracking.

*(Tots els documents secundaris anteriors com `bugs.md`, `reliability.md`, `osm-audit-results.md` i `market-research.md` s'han integrat i eliminat per mantenir la documentació neta i sense duplicitats).*

---

## 🎯 2. Matriu de Priorització en 4 Nivells (Ordre d'Execució)

Qualsevol tasca, millora o correcció s'ha de classificar i abordar seguint aquesta jerarquia estricta de **Dificultat i Importància**:

```
🟢 NIVELL 1 ──> 🟡 NIVELL 2 ──> 🟠 NIVELL 3 ──> 🔵 NIVELL 4
(Quick Wins)     (Poliment)      (Arquitectura)   (Llarg Termini)
```

1. 🟢 **Nivell 1: Canvis petits i senzills però importants** (*Quick Wins d'Alt Impacte*):
   - Correccions immediates d'errors visuals o de classificació (ex: etiquetes 100% vegà a restaurants, salts de BottomSheet, protecció Safe Space d'imatges).
   - Màxim retorn per hora de desenvolupament: arreglen bugs crítics o inconsistències ètiques amb canvis de poques línies.
2. 🟡 **Nivell 2: Canvis petits i no tant importants** (*Poliment i Deute Tècnic Menor*):
   - Neteja de tipus TypeScript redundants, unificació d'esdeveniments mòbils (PointerEvents), centralització de cadenes i estils CSS.
   - Deute tècnic menor que millora l'ergonomia del codi sense alterar la lògica troncal.
3. 🟠 **Nivell 3: Canvis mitjans-grans importants** (*Arquitectura, Seguretat i Funcionalitats Clau*):
   - Optimització de paquets (code-splitting), modularització de l'API (`apps/api/src/app.ts`), protecció SSRF/DNS rebinding, i funcionalitats nuclears pendents (plats adaptables, preferències d'al·lèrgies).
   - Requereixen disseny d'enginyeria i pla previ d'implementació.
4. 🔵 **Nivell 4: Canvis grans o molt grans però no prioritaris** (*Expansió Futura i Llarg Termini*):
   - Projectes de gran envergadura (unificació de base de dades SQL, mode fosc, mode cuina pas a pas, capa de santuaris, subdominis d'idioma).
   - Es posposen fins a la consolidació total dels nivells 1 a 3.

---

## 🏗️ 3. Arquitectura del Projecte (Monorepo)

- **`packages/domain`**: Tipus TypeScript, esquemes Zod i lògica pura de domini (classificació d'ingredients, esquemes de restaurants, etc.).
- **`apps/api`**: Servidor backend Fastify (Node.js/TypeScript) amb cerca de restaurants (Geoapify + Komoot Photon + Nominatim + Overpass), resolució de dominis oficials amb Gemini Search Grounding, OCR d'ingredients i memòria cau de cartes.
- **`apps/web`**: Aplicació web React + Vite + Leaflet + PWA, internacionalitzada (català/anglès) i optimitzada per a mòbil i escriptori.

---

## 📏 3. Regles de Treball i Bones Praxis

1. **Polítiques de Git**:
   - Desenvolupar a la branca de funcionalitat activa (`feature/interactive-map` o la corresponent) abans de fer merge a `main`.
   - Mantenir commits atòmics amb missatges clars i descriptius en català o anglès.

2. **Cicle de Verificació, Recursos i Piràmide de Tests**:
   - **Comandes selectives per no malgastar recursos (temps/CPU)**:
     - **Canvis de tipus / esquemes**: Executar `npm run typecheck` (valida en segons sense aixecar entorns de test).
     - **Canvis en un sol component o fitxer**: Executar només el seu test específic (ex: `npx vitest run apps/web/src/pages/MenuReaderPage.test.tsx`).
     - **Desenvolupament continu**: Utilitzar `npx vitest --changed` (només re-executa els tests dels fitxers modificats a Git).
   - **Tests Unitaris vs Tests d'Integració Real**:
     - `npm test`: Suite unitària ràpida amb repositoris en memòria per validar la lògica interna del codi sense consumir quota externa.
     - `npm run test:integration` / benchmark: Smoke tests reals de connectivitat amb Geoapify, Gemini i Nominatim per verificar que els proveïdors externs i les claus d'API funcionen abans de desplegar.
   - **Abans de finalitzar la sessió o concloure una fase sencera**, executar la suite completa:
     ```bash
     npm run check
     # Executa: pretypecheck -> typecheck -> test -> build -> check:secrets
     ```

3. **Interfície, UX i Mapa**:
   - Prioritzar solucions lleugeres i estàndard (ex: `geo:` a mòbil, Google Maps a desktop).
   - Els controls i marcadors del mapa han d'estar perfectament ancorats amb `iconAnchor: [width/2, height]`.
   - La memòria cau de cartes descobertes (`RestaurantMenuCache`) s'ha de comprovar sempre abans de llançar anàlisis repetides per garantir respostes instantànies.
   - La cerca de restaurants ha de passar sempre la latitud i longitud actuals per garantir un biaix de proximitat suau sense forçar l'usuari a escriure el nom de la ciutat.

4. **Privacitat i Zero-Tracking**:
   - Cap dada de geolocalització o cerca no s'emmagatzema de manera permanent en perfils d'usuari ni es comparteix amb tercers.
   - No s'utilitzen cookies de rastreig ni analítiques invasives, complint amb la normativa GDPR sense necessitat de banners molestos de cookies.

5. **Internacionalització (i18n)**:
   - Qualsevol cadena nova d'interfície ha d'estar traduïda a `i18n.ts` (`ca` i `en`).
   - Usar la terminologia normalitzada: `Carta` (no "Menú"), `No vegà` (no "Carnista"), `Indicacions` (no "Com arribar").
