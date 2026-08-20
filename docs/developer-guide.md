# Vegan Tools — Developer & Architecture Guide

This document contains in-depth technical documentation, architectural decisions, API reference, and deployment procedures for contributors and maintainers of Vegan Tools.

---

## 1. System Architecture

```text
apps/web        React 19, Vite, TailwindCSS, TanStack Query, PWA & Capacitor-ready UI
apps/api        Node.js, Fastify, Gemini 3 extraction, Foursquare Places & Supabase persistence
packages/domain Shared Zod contracts, deterministic ingredient classifier & recipe rules
supabase/       PostgreSQL database schema & storage migrations
data/           Local fallback directory for menu originals (local dev only)
```

---

## 2. Environment Variables Reference

Configure these in `.env` (copy from `.env.example`):

| Variable | Purpose | Default / Example |
| --- | --- | --- |
| `WEB_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173,https://vegan-tools.onrender.com` |
| `VITE_API_URL` | Public HTTPS API base URL used by the web bundle | `https://vegan-tools-api.onrender.com` |
| `GEMINI_API_KEY` | Google GenAI key for menu extraction & website grounding | `AIza...` |
| `GEMINI_MODEL` | Primary model for menu extraction & photo OCR | `gemini-3.1-flash-lite` |
| `GEMINI_WEBSITE_MODEL` | Model for official website search grounding | `gemini-3.1-flash-lite` |
| `FOURSQUARE_API_KEY` | Primary restaurant search and autocomplete | `fsq3...` |
| `DEFAULT_RESTAURANT_NEAR` | Location bias for name-only searches | `Barcelona` |
| `OFF_USER_AGENT` | User agent for Open Food Facts queries | `VeganTools/0.1 (+https://vegan-tools.pages.dev)` |
| `NOMINATIM_USER_AGENT` | User agent for OpenStreetMap queries | `VeganTools/0.1 (+https://vegan-tools.pages.dev)` |
| `MENU_CRAWLER_USER_AGENT` | User agent for menu crawler | `VeganTools/0.1 (+https://vegan-tools.pages.dev)` |
| `SUPABASE_URL` | Supabase project URL | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase server secret key (`sb_secret_...` or `service_role`) | `sb_secret_...` |
| `MENU_SOURCE_DIR` | Local storage directory when Supabase is not configured | `./data/menu-sources` |

---

## 3. Database & Supabase Migrations

When configuring Supabase, execute SQL migrations in filename order:
1. `supabase/migrations/202607010001_initial.sql`
2. `supabase/migrations/202607040001_restaurant_menu_cache.sql`
3. `supabase/migrations/202607060001_api_persistence.sql`

### Storage
Original menu PDFs and photographed images are stored in the private Supabase Storage bucket `menu-sources` and securely streamed through the `/v1/menu-sources/:menuId/:storedName` endpoint.

---

## 4. API Endpoints

- `GET /health` — Health check endpoint (`200 OK`, `Cache-Control: no-store`).
- `GET /v1/restaurants/search` — Search restaurants by name, query and location bias.
- `POST /v1/restaurants/resolve` — Resolve restaurant place identity, verified website and details.
- `POST /v1/menus/discover` — Crawl restaurant website to discover HTML menus or PDF links.
- `POST /v1/menus/analyses` — Start AI extraction of uploaded PDF/image menu files.
- `GET /v1/menus/analyses/:id` — Poll menu extraction progress and review draft.
- `PATCH /v1/menus/analyses/:id` — Save user corrections to dishes, names, prices and verdicts.
- `POST /v1/menus/:id/dishes/:dishId/feedback` — Submit dish corrections; uses Gemini 3 to fix typos and generate clean Catalan (`reasonCa`, `noteCa`) and English (`reason`, `note`) explanations.
- `POST /v1/menus/:id/notes` — Submit restaurant-level community notes with bilingual polishing (`communityNotes`, `communityNotesCa`).
- `POST /v1/menus/:id/publish` — Publish menu with a public slug.
- `GET /v1/public/menus/:slug` — Read published menu without requiring edit token.
- `GET /v1/menu-sources/:menuId/:storedName` — Stream original PDF/image source file.
- `GET /v1/menus/recent` — Fetch recently cached restaurant menus.
- `GET /v1/products/:gtin` — Retrieve product details and classification by barcode.
- `POST /v1/products/:gtin/evidence` — Submit user-verified product evidence.
- `POST /v1/ingredients/classify` — Deterministically classify raw ingredient text.
- `POST /v1/ingredients/extract` — OCR ingredient text from a photographed label.
- `POST /v1/recipes/veganize` — Analyze and substitute non-vegan ingredients in a recipe.

---

## 5. Deployment Guide

### Frontend (Render Static Site or Cloudflare Pages)
- **Root directory**: `/`
- **Build command**: `npm run build -w @vegan-tools/domain && npm run build -w @vegan-tools/web`
- **Publish directory**: `apps/web/dist`
- **Environment variables**: `VITE_API_URL=https://vegan-tools-api.onrender.com`
- **Single-page app rewrite**: `/*` → `/index.html`

### Backend API (Render Web Service)
- **Runtime**: Node.js (v22+)
- **Build command**: `npm ci && npm run build -w @vegan-tools/domain && npm run build -w @vegan-tools/api`
- **Start command**: `npm run start -w @vegan-tools/api`
- **Free tier keep-alive**: Use an external cron (e.g. `cron-job.org` or `Better Stack`) to ping `/health` every 10-14 minutes during active hours.

---

## 6. Restaurant Diet Metadata & Policies

- **HappyCow**: HappyCow does not offer a free public API and prohibits unauthorized automated scraping. We do not scrape HappyCow.
- **OpenStreetMap**: Food venues carry `diet:vegan` and `diet:vegetarian` tags under the ODbL license.
- **Foursquare**: Used for place search, category filtering, address resolution and official website discovery.
