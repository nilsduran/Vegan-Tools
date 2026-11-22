# AGENTS.md — Vegan Tools Engineering & AI Guidelines

Aquest document estableix les directrius tècniques, els principis d'arquitectura, el flux de treball i les regles d'enginyeria per a qualsevol agent d'IA que col·labori en el repositori **Vegan Tools**.

---

## 🧭 1. Documents de Referència i Filosofia de Documentació

Per evitar la dispersió en múltiples fitxers obsolets o secundaris, el repositori concentra el coneixement clau en **4 pilars documentals actius**:

1. 🗺️ **Full de Ruta i Backlog Prioritzat**: [`docs/roadmap.md`](./docs/roadmap.md)
   - L'única font de veritat sobre l'estat del desenvolupament, deute tècnic i tasques pendents, organitzades en tres blocs (Ara / Després / Aparcat) i etiquetades amb els 4 nivells de priorització.
2. 🏛️ **Guia d'Arquitectura i Descoberta**: [`docs/architecture.md`](./docs/architecture.md)
   - Diagrames de flux, resolució de dominis amb IA, jerarquia d'evidències i principi de màxima precaució, seguretat SSRF i referència de l'API.
3. 💚 **Manifest Ètic i Carta de Valors**: [`docs/values.md`](./docs/values.md)
   - Principis morals antiespecistes, política estricta d'espai segur (tolerància zero amb imatges d'explotació animal) i privacitat zero-tracking.
4. 🧠 **Registre de Decisions**: [`docs/decisions.md`](./docs/decisions.md)
   - Memòria entre sessions: què es va decidir, per què i què es va descartar. **Llegeix-lo abans de proposar canvis d'abast o de reobrir un tema.**

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

## 📏 4. Regles de Treball i Bones Praxis

1. **Polítiques de Git**:
   - `main` està protegida a GitHub: no s'hi pot pujar directament (tampoc com a administrador). Tot entra per una PR, i només es pot fusionar quan passen els cinc jobs de la CI (Typecheck, Tests, Audits, Production build, E2E).
   - Flux: branca (`feature/*`, `fix/*`, `docs/*`) → commits atòmics → `git push -u origin <branca>` → `gh pr create` → esperar la CI → `gh pr merge --merge`. La branca remota s'esborra sola en fusionar.
   - Pujar una branca i obrir la PR és una acció visible: cal el vistiplau d'en Nils, igual que per fusionar-la.
   - Fusió automàtica: amb el vistiplau d'en Nils per fusionar, es pot fer `gh pr merge --auto --merge` just després de crear la PR; GitHub la fusiona sola quan passa la CI i no la fusiona si falla. Activar-la equival a fusionar, així que també necessita el seu vistiplau.
   - Mantenir commits atòmics amb missatges clars i descriptius en català o anglès.
   - Els commits i les PR no porten cap línia d'atribució (ni `Co-Authored-By`, ni «Generated with…» ni el nom d'un model d'IA). Els missatges només descriuen el canvi.

2. **Cicle de Verificació, Recursos i Piràmide de Tests**:
   - **Comandes selectives per no malgastar recursos (temps/CPU)**:
     - **Canvis de tipus / esquemes**: Executar `npm run typecheck` (valida en segons sense aixecar entorns de test).
     - **Canvis en un sol component o fitxer**: Executar només el seu test específic (ex: `npx vitest run apps/web/src/pages/MenuReaderPage.test.tsx`).
     - **Desenvolupament continu**: Utilitzar `npx vitest --changed` (només re-executa els tests dels fitxers modificats a Git).
   - **Tests Unitaris vs Tests d'Integració Real**:
     - `npm test`: Suite unitària ràpida amb repositoris en memòria per validar la lògica interna del codi sense consumir quota externa.
     - `npm run test:e2e`: proves de navegador (Playwright) en un perfil d'escriptori i un de mòbil, amb l'escàner a través d'una càmera simulada i els pressupostos de velocitat. Necessita el build (`npm run build`) i, la primera vegada, `npx playwright install chromium`.
     - `npm run smoke:api`: comprovació real de l'API desplegada i dels proveïdors abans de desplegar.
   - **Estàndard de qualitat i velocitat**: [`docs/architecture.md` §8](./docs/architecture.md). Qualsevol funcionalitat que faci servir la càmera, la geolocalització o fitxers necessita una prova E2E als dos perfils; simular el component dins d'una prova de pàgina no compta. Si un canvi fa passar una ruta del seu pressupost de JavaScript, s'apuja el pressupost al mateix canvi i se n'explica el motiu.
   - **Abans de finalitzar la sessió o concloure una fase sencera**, executar la suite completa:
     ```bash
     npm run check
     # Executa: typecheck -> test -> audit:pins -> build -> check:secrets -> test:e2e
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

6. **Conservar el context entre sessions**:
   - Abans de tancar una sessió on s'hagi pres una decisió no òbvia (què es fa, què es descarta, per què), afegir una entrada breu a `docs/decisions.md` indicant si ho ha dit l'usuari o si és una deducció.
   - Quan una tasca del roadmap es completa, esborrar-la de `docs/roadmap.md`; si deixa alguna cosa pendent o un motiu que calgui recordar, va al registre de decisions.
   - Si un document contradiu el codi, corregir el document a la mateixa sessió.

7. **Evitar Optimitzacions Prematures (Pushback Proactiu)**:
   - *Premature optimization is the root of all evil*: L'agent ha d'oferir pushback constructiu i dissuadir activament quan sorgeixi la temptació d'afegir complexitat innecessària abans d'hora (com filtres manuals d'ofensivitat de noms, sistemes de moderació massiva, esquemes hiper-complexos o micro-optimitzacions abans de tenir un problema o escala real). Prioritzar sempre la màxima senzillesa, el flux nuclear del producte i les necessitats reals i tangibles dels usuaris.
   - **Rendiment sense canviar el producte pel camí**: els objectius de velocitat (§8 d'`architecture.md`) serveixen per detectar regressions, no per justificar canvis. Cap canvi d'interfície, de servei o de proveïdor només perquè potencialment sigui més ràpid sense comentar-ho abans amb en Nils, amb la mesura que el justifica. Els arranjaments interns invisibles (repartir fragments del build, moure una funció a un altre mòdul) i els bugs sí que es poden fer.
