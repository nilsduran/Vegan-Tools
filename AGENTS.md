# AGENTS.md — Vegan Tools Engineering & Agent Guidelines

Aquest document estableix les directrius tècniques, el flux de treball i les regles d'enginyeria per a qualsevol agent d'IA que col·labori en el repositori **Vegan Tools**.

---

## 🧭 1. Documents de Referència Principals

- 🗺️ **Full de Ruta (Roadmap)**: [`docs/roadmap.md`](./docs/roadmap.md)
  - Conté l'estat actual de cada fase de desenvolupament, funcionalitats pendents i plans d'arquitectura.
- 🐛 **Registre d'Incidències i Bug Tracking**: [`docs/bugs.md`](./docs/bugs.md)
  - Llista exhaustiva de bugs coneguts, causes arrels i mesures de resolució per evitar regressions.

---

## 🏗️ 2. Arquitectura del Projecte (Monorepo)

- **`packages/domain`**: Tipus TypeScript, esquemes Zod i lògica pura de domini (classificació d'ingredients, esquemes de restaurants, etc.).
- **`apps/api`**: Servidor backend Fastify (Node.js/TypeScript) amb cerca de restaurants (Komoot Photon + Nominatim + Foursquare), resolució de dominis oficials, OCR d'ingredients i memòria cau de cartes.
- **`apps/web`**: Aplicació web React + Vite + Leaflet + PWA, internacionalitzada (català/anglès) i optimitzada per a mòbil i escriptori.

---

## 📏 3. Regles de Treball i Bones Praxis

1. **Polítiques de Git**:
   - Desenvolupar a la branca de funcionalitat activa (`feature/interactive-map` o la corresponent) abans de fer merge a `main`.
   - Mantenir commits atòmics amb missatges clars i descriptius en català o anglès.

2. **Cicle de Verificació i Tests**:
   - **No executar la suite sencera a cada petit canvi intermedi** si l'usuari demana iterar ràpidament. Executar `npm run typecheck` per validar tipus.
   - **Abans de finalitzar la sessió o concloure una fase sencera**, executar la suite completa:
     ```bash
     npm run check
     # Executa: pretypecheck -> typecheck -> test -> build -> check:secrets
     ```

3. **Interfície i UX**:
   - Prioritzar solucions lleugeres i estàndard (ex: `geo:` a mòbil, Google Maps a desktop).
   - Els controls i marcadors del mapa han d'estar perfectament ancorats amb `iconAnchor: [width/2, height]`.
   - La memòria cau de cartes descobertes (`RestaurantMenuCache`) s'ha de comprovar sempre abans de llançar anàlisis repetides per garantir respostes instantànies.
   - La cerca de restaurants ha de passar sempre la latitud i longitud actuals per garantir un biaix de proximitat suau sense forçar l'usuari a escriure el nom de la ciutat.

4. **Internacionalització (i18n)**:
   - Qualsevol cadena nova d'interfície ha d'estar traduïda a `i18n.ts` (`ca` i `en`).
   - Usar la terminologia normalitzada: `Carta` (no "Menú"), `No vegà` (no "Carnista"), `Indicacions` (no "Com arribar").
