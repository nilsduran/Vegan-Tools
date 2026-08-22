# Vegan Tools

**Vegan Tools** is an evidence-led web app designed to make everyday vegan living simple and reliable:

- 🍽️ **Menu Reader**: Find restaurants, discover their official menus, or upload PDF/photo menus to filter dishes by dietary options (*Vegan*, *Vegetarian*, *Adaptations*).
- 🔍 **Is this vegan?**: Scan barcodes (Open Food Facts) or photograph ingredient labels to run deterministic ingredient evaluations.
- 🍲 **Recipe Veganizer**: Convert pasted recipes with practical plant-based substitutions and adjusted quantities.
- 🌐 **Bilingual (Catalan & English)**: Full interface and menu translations available in both Catalan and English.

Live website: [vegan-tools.onrender.com](https://vegan-tools.onrender.com)

---

## Features & Capabilities

### 🍽️ 1. Menu Reader
- **Search & discovery**: Search food venues via Foursquare with OpenStreetMap fallback and automated official website/menu link discovery.
- **Upload any format**: Supports PDFs, multiple photo pages (PNG/JPEG/WebP), or live camera captures (up to 8 files).
- **Intelligent dish classification**: AI-powered extraction (Gemini 3) classifies dishes (*Vegan*, *Probably vegan*, *Vegetarian*, *Non-vegetarian*) and proposes realistic adaptations.
- **Original source view**: Retains original PDFs or photos alongside the dish list for verification.
- **Shared community cache**: Discovered menus are cached in Supabase for instant reuse by other users.

### 🔍 2. Is this vegan? (Product Scanner)
- **Barcode & QR scanner**: Scan packaged food products via camera or manual GTIN/EAN-13 code entry.
- **Open Food Facts data**: Fetches brand, product name, packaging photos, and ingredient lists.
- **Deterministic classifier**: Identifies non-vegan ingredients and allergen traces with clear explanations.
- **Label photo OCR**: Photograph ingredient labels to extract text with editable correction before checking.

### 🍲 3. Recipe Veganizer
- **Automated analysis**: Identifies animal-derived ingredients in recipes.
- **Smart substitutions**: Recommends proven culinary replacements (e.g. flax eggs, aquafaba, soy milk, vegan butter) with scaled quantities.
- **Interactive selection**: Choose between alternative suggestions and edit the final recipe draft.

---

## Quickstart (Run Locally)

### Prerequisites
- Node.js 22+ and npm

### 1. Clone & Install
```bash
git clone https://github.com/nilsduran/Vegan-Tools.git
cd VeganTools
npm install
```

### 2. Configure Environment (Optional for local testing)
```bash
cp .env.example .env
```
*(Without API keys, barcode lookup, ingredient text classification and recipe veganization work completely offline and locally. Gemini and Foursquare keys are only needed for live place search and photo/PDF menu extraction).*

### 3. Start Development Server
```bash
npm run dev
```
- **Web App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **API Docs (Swagger)**: `http://localhost:3001/docs`

---

## Everyday Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start both frontend (`localhost:5173`) and API (`localhost:3001`) simultaneously |
| `npm run check` | Run full verification: Typecheck + Tests + Production Build + Secret Scan |
| `npm test` | Run all 83 Vitest automated tests (Unit, DB persistence, and Form UI) |
| `npm run typecheck` | Verify TypeScript compilation across all packages |

---

## Technical Documentation & Architecture

For in-depth developer documentation, database schemas, and deployment instructions, see:
- 📖 [Developer & Architecture Guide](docs/developer-guide.md) — API endpoints, Supabase configuration, deployment steps, and environment variables.
- 🔬 [Reliability & Classification Methodology](docs/reliability-methodology.md) — Testing benchmarks and ingredient evaluation principles.

---

## Roadmap & Future Work

### 🍽️ Dining & Discovery
- Smart restaurant discovery and exploration: discover and recommend restaurants based on location, proximity, star ratings, and vegan leaf scores (🍃 1-5).
- Dual restaurant review system:
  - ⭐ 5-star rating for overall food quality and experience.
  - 🍃 5-leaf rating (1 to 5) for vegan friendliness (1 = poor / no options, 5 = 100% vegan-friendly).
- Menu linking: associate and link existing menus (whether default platform menus or uploaded PNG/PDF files) directly to restaurant profiles.

### 🎨 UI/UX & Design
- **Mobile-first UI/UX overhaul**: Clean, dense, responsive interface designed specifically for one-handed mobile use; efficient screen real estate usage, professional typography, intuitive micro-interactions, and avoiding generic "vibe-coded" layouts.

### 🧪 Testing & Quality
- Full-stack visual E2E test suite (Playwright) to simulate real user journeys with browser screenshots and recordings for visual verification.

### 🥘 Food & Household
- Personal recipe collection with favourites, tags, meal plans, shopping lists and imports.
- Cosmetics and household product checker with cruelty-free testing and vegan certification tracking.

---

## License

Vegan Tools is free and open-source software released under the [GNU GPL v3.0](LICENSE).
Product data is powered by [Open Food Facts](https://world.openfoodfacts.org/) under the ODbL license.
Restaurant map data is provided by [OpenStreetMap](https://www.openstreetmap.org/) and [Geoapify](https://www.geoapify.com/).
