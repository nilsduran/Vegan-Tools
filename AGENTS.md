# AGENTS.md — Vegan Tools Engineering & AI Guidelines

Aquest document estableix les directrius tècniques, els principis d'arquitectura, el flux de treball i les regles d'enginyeria per a qualsevol agent d'IA que col·labori en el repositori **Vegan Tools**.

---

## 🧭 1. Documents de Referència Principals

- 🏛️ **Guia d'Arquitectura i Descoberta de Cartes**: [`docs/architecture.md`](./docs/architecture.md)
  - Diagrama de flux de descoberta, resolució de webs oficials amb IA, seguretat SSRF i referència completa de l'API.
- 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./docs/values.md)
  - Principis morals, antiespecisme, política d'espai segur (tolerància zero amb imatges d'explotació animal) i governança ètica.
- 🗺️ **Full de Ruta (Roadmap)**: [`docs/roadmap.md`](./docs/roadmap.md)
  - Estat actual de cada fase de desenvolupament, funcionalitats pendents, llançament de la beta, disseny de la UI i plans d'arquitectura.
- 🐛 **Registre d'Incidències i Bug Tracking**: [`docs/bugs.md`](./docs/bugs.md)
  - Llista exhaustiva de bugs coneguts, incidències d'UX, causes arrels i mesures de resolució per evitar regressions.
- 🎯 **Metodologia de Fiabilitat**: [`docs/reliability.md`](./docs/reliability.md)
  - Jerarquia d'evidències i estàndard del 99% de precisió en veredictes dietètics.
- 🌐 **Anàlisi de Mercat i Proveïdors**: [`docs/market-research.md`](./docs/market-research.md)
  - Comparativa de proveïdors de dades de llocs (Geoapify, OpenStreetMap, Overture, Google Places).

---

## 🏗️ 2. Arquitectura del Projecte (Monorepo)

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
