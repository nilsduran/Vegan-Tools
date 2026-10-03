# Vegan Tools

**Vegan Tools** is an evidence-led, privacy-first web application designed to make plant-based living seamless, accessible, and reliable. Built as an open-source monorepo (React, Vite, Fastify, Supabase, Leaflet), it unites dining discovery, menu OCR, culinary tools, and ingredient verification in a single mobile-friendly PWA.

- 🗺️ **Interactive Restaurant Map**: Explore nearby dining spots with location-aware search, 100% vegan / vegetarian / vegan-friendly filters, and direct navigation.
- 🍽️ **Menu Reader & AI OCR**: Upload photos or PDFs of physical restaurant menus, or analyze online menus to extract and classify dishes with practical plant-based adaptations.
- 🍃 **Leaves Rating & Dining Diary**: Track visits, review dishes with a 0.5–5.0 leaf rating system, log meals ordered, and sync across devices.
- 📖 **Plant-Based Cookbook & Cook Mode**: Explore authentic recipes with culinary tags (e.g. `🌶️ Picant`), step-by-step interactive **Cook Mode** with timers, and an AI-powered Recipe Veganizer.
- 🔍 **Product Scanner ("Is this vegan?")**: Instant barcode lookup via Open Food Facts and camera-assisted OCR label checking with deterministic ingredient classification.
- 📚 **Evidence-Led Resources**: Educational guides covering ethics, evidence-based nutrition ([VeganHealth.org](https://veganhealth.org)), documentaries, and sanctuary directories.
- 🌐 **Bilingual (Catalan & English)**: Complete UI, classification, and recipe content localized in both Catalan and English.

Live website: [vegan-tools.onrender.com](https://vegan-tools.onrender.com)

---

## 🌟 Core Features

### 🗺️ 1. Restaurant Discovery & Interactive Map
- **Location-aware search**: Search venues with proximity bias via Geoapify Places API and OpenStreetMap Nominatim/Overpass.
- **Dietary filters**: Filter by 100% Vegan (`🌱 Vegà`), Vegetarian (`🧀 Vegetarià`), or venues with solid vegan options.
- **Smart details pane**: Opening hours, address with neighborhood extraction, phone shortcuts, official website links, and one-tap directions (`geo:` protocol on mobile, Google Maps on desktop).
- **Safe space & ethical presentation**: Zero animal exploitation imagery or non-vegan food closeups.

### 🍽️ 2. Menu Reader & AI Analysis
- **Multi-format menu ingestion**: Upload restaurant menu PDFs, multi-page photos (PNG/JPEG/WebP), or take live camera captures.
- **AI-powered classification**: Uses Gemini Flash-Lite to extract dish names, ingredients, and classify each item:
  - 🟢 **Vegan**: 100% plant-based as served.
  - 🟡 **Adaptable**: Non-vegan dishes that can be easily veganized with concrete modification notes (e.g. "ask for tofu instead of egg, omit fish sauce").
  - 🟠 **Vegetarian**: Contains dairy or eggs.
  - 🔴 **Non-vegan**: Meat or fish based.
- **Original source view**: Displays the original menu photos or PDF alongside parsed dishes for easy verification.
- **Community menu cache**: Parsed menus are cached in Supabase for instant reuse by other users.

### 🍃 3. Leaves Rating & Dining Diary
- **Leaves rating system**: 0.5 to 5.0 leaves rating representing vegan-friendliness and culinary quality.
- **Unified review & visit log**: Rate venues, add review notes, specify ordered dishes, and tag venue attributes (e.g. *Brunch*, *Terrassa*, *Cafeteria*).
- **Personal dining diary (`/diary`)**: Keep a personal timeline of restaurant visits, favourite dishes, and ratings, accessible locally offline and synced via Supabase.

### 📖 4. Cookbook & Recipe Veganizer
- **Curated recipe collection**: Tested, authentic global dishes (Pad Thai, Thai Red Curry, Chili Sin Carne, Red Lentil Dahl, Tortilla de Patates, Carbonara, etc.) with spicy indicators (`🌶️ Picant`).
- **Interactive Cook Mode**: Full-screen, step-by-step cooking view with screen wake-lock, ingredient checklists, and integrated kitchen countdown timers.
- **AI Recipe Veganizer**: Paste any traditional omnivore recipe to get proven culinary substitutions (flax eggs, aquafaba, soy cream, kala namak) with scaled quantities.

### 🔍 5. Product Scanner ("Is this vegan?")
- **Barcode & QR scanner**: Instant barcode scanning via device camera or manual EAN-13/GTIN entry.
- **Open Food Facts integration**: Fetches official product details, brand, packaging images, and ingredient lists.
- **Deterministic classification**: Evaluates ingredients against known animal derivatives, E-numbers, and allergens with clear explanations.
- **Label photo OCR**: Photograph ingredient lists directly for instant offline/unlisted product verification.

### 📚 6. Resources & Ethical Manifesto
- **Comprehensive knowledge base**: Structured guides on nutrition, ethical philosophy, recommended documentaries, literature, and animal sanctuaries.
- **Strict ethical charter**: Adheres to the core tenets in [`docs/values.md`](docs/values.md) — anti-speciesism, safe space policy (zero images of animal exploitation), and zero-tracking privacy.

---

## 🏗️ Monorepo Architecture

```
VeganTools/
├── packages/
│   └── domain/          # Shared TypeScript domain models, Zod schemas, cookbook recipes, ingredient logic
├── apps/
│   ├── api/             # Fastify REST API backend (Node.js/TypeScript)
│   │   ├── places       # Geoapify & Nominatim/Overpass integration
│   │   ├── gemini       # AI menu parsing & recipe veganization
│   │   ├── off          # Open Food Facts barcode client
│   │   └── db           # Supabase persistence & memory fallback
│   └── web/             # React 18 + Vite + TypeScript PWA
│       ├── components/  # Map, reviews, menus, recipe cards, modals
│       ├── pages/       # Home, MenuReader, Recipes, Scanner, Diary, Resources, About
│       └── utils/       # Supabase client, offline sync, i18n
└── docs/                # Architectural, ethical, and roadmap documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 22+ and npm

### 1. Clone & Install
```bash
git clone https://github.com/nilsduran/Vegan-Tools.git
cd VeganTools
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Without third-party API keys, barcode scanning, offline ingredient analysis, cookbook, and diary work locally. Gemini and Geoapify keys enable live AI menu parsing and map discovery).*

### 3. Run Development Servers
```bash
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Swagger Documentation**: `http://localhost:3001/docs`

---

## 🛠️ Everyday Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts frontend and backend concurrently in development mode |
| `npm run check` | Comprehensive pre-commit check: Typecheck + Tests + Build + Secret scan |
| `npm test` | Runs the Vitest test suite across all packages |
| `npm run typecheck` | Validates TypeScript compilation across all workspaces |
| `npm run build` | Compiles domain package and builds production bundles |

---

## 🔐 Authentication & Cloud Sync Setup

Vegan Tools supports optional social sign-in (Google) and passwordless/email accounts via Supabase Auth so users can sync their dining diary across devices without any invasive tracking:

1. **Supabase Setup**: Create a project on [supabase.com](https://supabase.com) and retrieve your Project URL and Public Anon Key.
2. **Google Sign-In (100% Free)**:
   - **Nom de l'aplicació a la pantalla de consentiment (perquè no digui supabase.co)**:
     - A [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **OAuth consent screen** (Pantalla de consentiment OAuth):
     - Configura el camp **App name** (Nom de l'aplicació) com a **Vegan Tools**.
     - Posa el teu correu a **User support email** i **Developer contact information**.
     - (Opcional) Afegeix el logotip de Vegan Tools i el domini autoritzat `vegantools.org`.
     - *D'aquesta manera, a la pantalla de Google es mostrarà "Inicia la sessió a Vegan Tools" en lloc del domini tècnic de Supabase*.
   - **Credencials OAuth**:
     - A **Credentials** -> Crea **OAuth 2.0 Client ID** (Web application).
     - A **Authorized redirect URIs**, afegeix `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`.
     - Copia el Client ID & Client Secret a **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Google**.
   - **Permetre proves a localhost (evitar redirecció forçada a la web de producció)**:
     - Al **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:
     - **Site URL**: Mantén `https://vegantools.org` (o la teva URL principal).
     - **Redirect URLs**: Afegeix `http://localhost:5173/**` i `http://localhost:3000/**`.
     - Quan fas login en local des de `http://localhost:5173`, el codi passa automàticament `window.location.href`. Si `http://localhost:5173/**` està afegit a la llista blanca de Redirect URLs a Supabase, en acabar el login a Google et tornarà a **localhost** en lloc d'enviar-te a la web oficial de producció.
3. **Email & Password / Magic Link**:
   - Activat per defecte a Supabase Auth (gratuït fins a 50.000 usuaris actius al mes). Usuaris des de mòbil o escriptori es poden registrar sense cap cost.

---

## 📚 Technical Documentation Pillars

For complete engineering and ethical standards, refer to our three core documentation pillars:
- 🗺️ [Project Roadmap & Backlog](docs/roadmap.md) — 4-level prioritization matrix and active development progress.
- 🏛️ [Architecture & Engineering Guide](docs/architecture.md) — Detailed workflows, Gemini prompting, SSRF security, caching, and API contracts.
- 💚 [Ethical Manifesto & Safe Space Policy](docs/values.md) — Ethical principles, safe space guidelines, and zero-tracking privacy policy.

---

## 📄 License

Vegan Tools is free, open-source software licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
- Product data provided by [Open Food Facts](https://world.openfoodfacts.org/) under the ODbL license.
- Map and location data provided by [OpenStreetMap](https://www.openstreetmap.org/) and [Geoapify](https://www.geoapify.com/).
