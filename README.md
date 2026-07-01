# Vegan Tools

Vegan Tools is an evidence-led web app for navigating everyday situations in a non-vegan
world. The current MVP combines:

- **Product Checker:** scan or enter a GTIN/EAN, or paste an ingredient list, and receive
  an explainable result with its source and date. Its dictionary includes common English,
  Catalan and Spanish aliases and E-numbers.
- **Menu Reader:** upload restaurant menu images or PDFs, review the extracted dishes and
  publish a filterable link. This tool is explicitly beta.
- **Recipe Veganizer:** paste a recipe, identify known animal-derived or ambiguous
  ingredients and receive quantity-aware substitution guidance.

The interface is English-first. The text layer is prepared for Catalan. The web app is a PWA
and includes Capacitor configuration for future iOS and Android builds.

## How the tools work

- **Is this vegan?** scans a barcode and checks Open Food Facts, or reads a photographed
  ingredient label that the user can correct before classification. When OFF has an
  ingredient-label image but no text, the user can ask the server to transcribe that image.
- **Menu Reader (beta)** extracts dishes from uploaded menu images or PDFs, then requires
  review before creating a filterable menu.
- **Recipe Veganizer** creates an editable vegan draft, adjusts supported quantities and
  instruction steps, then lists alternatives and practical guidance underneath.

The Menu Reader currently has a 20-second hard timeout. The intended experience is under
5 seconds in normal use and no more than 10 seconds before returning a useful result or a
clear retry message.

## Trust model

Product verdicts are `vegan`, `probably_vegan`, `vegetarian`,
`probably_vegetarian`, `non_vegetarian` or `unknown`. Probable results make uncertainty
visible instead of discarding a useful indication. `unknown` remains available for absent,
unreadable or conflicting evidence.

AI extracts and translates text; it does not make the final product verdict.
Classification is deterministic, evidence is versioned, and “may contain” allergen traces
do not change vegan status. The shared dictionary also powers recipe substitutions.

“99% reliable” means at least 99% precision among **definitive** verdicts under the benchmark
described in [the methodology](docs/reliability-methodology.md). It does not mean that 99% of
barcodes receive a definitive answer.

## Architecture

```text
apps/web        React, Vite, PWA and Capacitor shell
apps/api        Fastify API and asynchronous menu analysis
packages/domain Shared contracts, ingredient dictionary, classifier and recipe rules
supabase        PostgreSQL schema, RLS and evidence/audit model
```

Open Food Facts API v3.6 is treated as an external, ODbL-licensed evidence source and cached
separately from first-party review evidence. API and AI credentials exist only on the server.
The MVP uses individual API calls rather than downloading the full OFF dataset; a bulk mirror
would add storage, synchronisation and licensing operations that are unnecessary for scans.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
cp .env.example .env
npm install
npm run dev
```

The web app runs at `http://localhost:5173`, the API at `http://localhost:3001`, and OpenAPI
documentation at `http://localhost:3001/docs`.

Without `GEMINI_API_KEY`, menu uploads produce a clearly marked review placeholder so the
complete editing and publishing workflow remains testable. `GEMINI_MODEL` can override the
default stable `gemini-3-flash` model.

Ingredient-photo transcription also requires `GEMINI_API_KEY`; barcode lookup, ingredient
classification and recipe veganization do not. A `Route POST:... not found` response means
the API process is older than the web bundle and must be restarted—it is not a missing-key
error.

Memory storage is the local development default. Uploaded menu files are processed for the
current request but are not saved by the demo; draft and published menu data also disappear
when the API restarts. The Supabase migration describes a possible later persistence model.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run check
npm run cap:sync -w @vegan-tools/web
```

## API

- `GET /v1/products/:gtin`
- `POST /v1/products/:gtin/evidence` — authenticated evidence
- `POST /v1/ingredients/classify`
- `POST /v1/ingredients/extract` — ingredient-label photo transcription
- `POST /v1/recipes/veganize`
- `POST /v1/menus/analyses`
- `GET/PATCH /v1/menus/analyses/:id`
- `POST /v1/menus/:id/publish`
- `GET /v1/public/menus/:slug`

## Deploy the web app to Cloudflare Pages

Connect this GitHub repository to Cloudflare Pages and use:

```text
Root directory:       /
Build command:        npm run build -w @vegan-tools/domain && npm run build -w @vegan-tools/web
Build output:         apps/web/dist
Node version:         22
```

Set `VITE_API_URL` to the public HTTPS URL of the Fastify API. This is a public
configuration value, not a secret. Set the API's `WEB_ORIGIN` to the final
`https://<project>.pages.dev` origin. The included `_redirects` file provides the SPA
fallback required when a visitor refreshes `/scanner`, `/recipes` or a public menu route.

Cloudflare Pages hosts the static PWA only. The current Fastify API still needs a
separate Node host; moving it to Cloudflare Workers would be a later architectural
change rather than a deployment toggle.

## Research and status

The current competitor and open-source review is in
[docs/market-research.md](docs/market-research.md). The two original AI Studio prototypes remain
temporarily under `vegan-menu/` and `vegan-scanner/` as migration references; the root workspace
is the canonical application.

Before production launch, the project still needs the 500-product benchmark, a 50-menu
evaluation set, real Supabase credentials/storage wiring, authenticated moderation, a data
licence review and physical-device testing.

## Roadmap

1. Catalan UI and translated public menus.
2. Manufacturer/certification integrations and recipe-change detection.
3. Automatic menu discovery with restaurant, service and date confirmation.
4. Cosmetics through a separately reviewed Open Beauty Facts integration.
5. Activism resources and carefully scoped community features.
6. An OpenStreetMap-based vegan venue directory.
7. Domain purchase and App Store / Google Play releases.

No code licence has been selected yet. This decision is required before accepting external
contributions or presenting the repository as open source.
