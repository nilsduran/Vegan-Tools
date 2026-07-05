# Vegan Tools

Vegan Tools is a small web app for answering three practical questions:

- **Is this vegan?** Scan an Open Food Facts barcode or photograph an ingredient label,
  correct the extracted text, and run the deterministic ingredient classifier.
- **Menu Reader.** Find a restaurant, discover its official menu page/PDF, or upload up to
  eight PDF/image pages. The analyzed menu can be filtered by vegan, vegetarian, meat, and
  practical adaptations.
- **Recipe Veganizer.** Convert pasted recipes with deterministic substitutions, quantity
  adjustments, and editable alternatives.

The interface is available in English and Catalan; the selected language is kept in the
browser. Extracted menu content currently uses English display translations while retaining
the original dish names.

This repository is the canonical application. The earlier standalone prototypes have been
removed.

## Current menu behavior

Restaurant search uses Foursquare Places when `FOURSQUARE_API_KEY` is configured and otherwise
uses OpenStreetMap/Nominatim. A typed city can be part of the same query (`Il Mulino Barcelona`);
the optional approximate-location button requests browser permission only when clicked.
Search is restricted to food venues. Foursquare suggestions are cached for two minutes and
full searches for 15 minutes.

After a restaurant is selected, the API resolves its current website and crawls likely
`menu`, `carta`, and PDF links. If the place provider has no valid website, Gemini Search
grounding can verify the location-matched official site. A pasted official URL and direct
PDF/image upload remain deliberate fallbacks because JavaScript-only and bot-protected sites
cannot always be read.

Menu extraction:

- keeps original dish names and translates display names/descriptions to English;
- records prices and source page numbers;
- classifies dishes as vegan, probably vegan, vegetarian, probably vegetarian,
  non-vegetarian, or unknown;
- proposes only small, practical adaptations and rejects changes that remove the defining
  ingredient or most of the dish;
- shows counts as `native (native + adaptable)`, for example `3 (4)`;
- keeps the uploaded PDF/images as a visible original source for comparison.

Finished restaurant menus are cached so subsequent visitors can reuse them. “Update menu” is
a secondary action. With Supabase configured, the analyzed menu JSON is common to all users;
without it, the cache lasts only until the API restarts. Original files are stored under
`MENU_SOURCE_DIR`, so a production host must mount that directory on persistent storage.
Binary PDFs/images belong in object/file storage rather than a PostgreSQL row.

## Restaurant diet metadata

HappyCow does not publish an open developer API. Its terms prohibit automated scraping and
database construction, so do not import its listings without a direct HappyCow licence or
partnership.

OpenStreetMap is the best open enrichment source. Food venues can carry
`diet:vegan=only|yes|limited|no` and `diet:vegetarian=only|yes|limited|no`; coverage is
community-dependent. Query those tags with Overpass and retain OSM attribution/ODbL
requirements. Foursquare is useful for place identity, category, address, search, and official
website discovery, but it should not be treated as an authoritative vegan-status field.

The sensible long-term combination is:

1. Foursquare for fast place search and identity.
2. OpenStreetMap `diet:*` tags as optional venue-level hints.
3. The saved source menu plus this app's dish-level analysis as the auditable ground truth.

## Architecture

```text
apps/web        React, Vite, PWA and Capacitor-ready UI
apps/api        Fastify API, place search, menu discovery and Gemini extraction
packages/domain Shared Zod contracts, ingredient classifier and recipe rules
supabase        PostgreSQL migrations for evidence and shared restaurant-menu cache
data/           Runtime menu originals (ignored by Git; persistent volume in production)
```

Credentials remain server-side. `VITE_API_URL` is public configuration; never expose Gemini,
Foursquare, Supabase secret, or other service keys through a `VITE_` variable.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
cp .env.example .env
npm install
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- OpenAPI: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

The default restaurant bias is Barcelona and can be changed with
`DEFAULT_RESTAURANT_NEAR`. Location permission is not needed for typed-city searches.

Without `GEMINI_API_KEY`, upload flow returns a clearly marked review placeholder. Gemini is
required for menu/PDF extraction, ingredient-photo transcription, and grounded website
recovery. Barcode lookup, text classification, and recipe veganization still work locally.

Useful checks:

```bash
npm run typecheck
npm test
npm run build
npm run check
```

## Environment

Copy `.env.example` and configure:

| Variable | Purpose |
| --- | --- |
| `WEB_ORIGIN` | Allowed web origin(s), comma-separated |
| `VITE_API_URL` | Public HTTPS API base used by the web bundle |
| `GEMINI_API_KEY` | Server-side menu/photo extraction and website verification |
| `GEMINI_MODEL` | Menu model; defaults to `gemini-3.1-flash-lite` |
| `GEMINI_WEBSITE_MODEL` | Grounded official-website lookup model |
| `FOURSQUARE_API_KEY` | Primary restaurant search and autocomplete |
| `DEFAULT_RESTAURANT_NEAR` | Bias for name-only searches |
| `*_USER_AGENT` | Honest identifiers with a real contact for external services |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Shared menu cache and server persistence |
| `MENU_SOURCE_DIR` | Persistent directory for original PDFs/images |

Apply every migration in `supabase/migrations` before enabling Supabase.

## API surface

- `GET /health`
- `GET /v1/restaurants/search`
- `POST /v1/restaurants/resolve`
- `POST /v1/menus/discover`
- `POST /v1/menus/analyses`
- `GET/PATCH /v1/menus/analyses/:id`
- `GET /v1/menu-sources/:menuId/:storedName`
- `GET /v1/menus/recent`
- `POST /v1/menus/:id/publish`
- `GET /v1/public/menus/:slug`
- `GET /v1/products/:gtin`
- `POST /v1/products/:gtin/evidence`
- `POST /v1/ingredients/classify`
- `POST /v1/ingredients/extract`
- `POST /v1/recipes/veganize`

## Deploy

Cloudflare Pages can host the static web app:

```text
Root directory: /
Build command: npm run build -w @vegan-tools/domain && npm run build -w @vegan-tools/web
Build output: apps/web/dist
Node version: 22
```

Deploy `apps/api` to a Node host separately, set `VITE_API_URL` to its public HTTPS URL, and
set `WEB_ORIGIN` to the Pages/custom-domain origin. Mount `MENU_SOURCE_DIR` on a persistent
volume and configure Supabase for the cross-user menu cache.

## Public v1 checklist

Before announcing the first public version:

1. **Infrastructure:** deploy web/API over HTTPS, apply Supabase migrations, mount and back up
   menu-source storage, set production origins, and verify secrets are absent from the bundle.
2. **Service identity:** replace every `contact@example.com` user agent, confirm Foursquare
   limits/billing, and add required OpenStreetMap, Foursquare, and Open Food Facts attribution.
3. **Content and privacy:** publish a short privacy notice covering optional coarse location,
   uploaded menu/label images, retention, Gemini processing, and public source visibility.
   Only upload menus you are allowed to republish.
4. **Accuracy:** manually review a representative 50-menu set, including multi-page PDFs,
   photos, Catalan/Spanish/English menus, incomplete descriptions, and difficult adaptations.
   Complete the separate 500-product benchmark described in
   `docs/reliability-methodology.md`.
5. **Device smoke test:** test camera capture, multi-photo upload, barcode scanning, PDF
   preview, restaurant search with/without location, cached-menu refresh, and all three tools
   on a real iPhone and Android device.
6. **Operations:** add error monitoring and uptime checks, database/file backups, upload and
   request rate limits, a private way to remove or refresh a bad cached menu, and a rollback
   procedure.
7. **Launch pass:** run `npm run check`, test the production URLs from a clean browser, verify
   the fallback/error copy, and seed only the handful of restaurants you personally expect to
   revisit.

No large moderation system is necessary for a personal first version, but deletion/refresh
controls and a contact route are still worth having before strangers can upload public source
files.

### Smallest path to a publicly accessible personal MVP

Because you will initially be the only active user, the first deployment can stay deliberately
small:

1. Create a Supabase project and apply every SQL file in `supabase/migrations`.
2. Deploy `apps/api` to a Node host with a persistent disk (Railway, Render, Fly.io or a small
   VPS). Mount `MENU_SOURCE_DIR` on that disk.
3. Configure the API environment variables from `.env.example`: Gemini, Foursquare, Supabase,
   honest service user agents, `WEB_ORIGIN`, and the production port.
4. Deploy `apps/web` to Cloudflare Pages using the settings in the Deploy section. Set
   `VITE_API_URL` to the public HTTPS API URL.
5. Set `WEB_ORIGIN` on the API to the exact Cloudflare Pages/custom-domain origin and confirm
   `/health` responds publicly.
6. Add a short privacy page explaining coarse location, uploaded files, Gemini processing,
   retention and the fact that saved source menus may be publicly viewable.
7. Add OpenStreetMap, Foursquare and Open Food Facts attribution where their data is shown.
8. Run `npm run check`, then smoke-test restaurant search, one PDF, several menu photos, the
   ingredient checker and recipe veganizer from a clean browser and a real phone.
9. Add a free uptime monitor and error logging. Set provider spending/quota alerts before
   sharing the URL.

A custom domain, app-store packaging, donations, analytics and public upload moderation can
wait. For this first personal MVP, HTTPS, persistent storage, backups, privacy disclosure and
working production smoke tests are the essentials.

## Roadmap

### Content and personal resources

- A personal page explaining why the creator went vegan.
- A practical vegan guide covering shopping, eating out, travel, nutrition signposting and
  common ingredient pitfalls.
- Accessible introductions to vegan ethics and philosophy, with clearly attributed further
  reading.
- A community-maintained wiki/directory of vegan activism organisations, networks, campaigns
  and local groups.
- Curated activism resources with region, language, campaign type and ways-to-help filters.

### Food and household tools

- Personal recipe collection with favourites, tags, meal plans, shopping lists and imports.
- Save veganized recipes and keep the original recipe alongside each adaptation.
- Pantry tracking, recipe suggestions and optional nutritional information.
- Cosmetics checker covering both vegan ingredients and cruelty-free company/testing status,
  with separate evidence and confidence for each claim.
- Household and clothing product checks using the same evidence-led approach.
- Better restaurant dietary metadata from OpenStreetMap and user-verified menus.

### Product and platform

- Catalan menu-output translation in addition to the Catalan/English interface.
- Accounts, optional cross-device sync, favourites and personal history.
- iOS and Android applications after the PWA and Capacitor flows are stable.
- A limited public beta, feedback collection and an invite-based rollout before open uploads.
- Accessibility audit, additional languages, offline support and faster low-bandwidth modes.
- Private administrative tools for correcting, refreshing and removing cached menus.

### Sustainability and launch

- Per-user cost analysis for Gemini, Foursquare, storage, bandwidth and support.
- Usage and cohort analysis that respects privacy and avoids unnecessary tracking.
- Revenue scenarios comparing donations, sponsorship, grants, subscriptions and a free public
  service.
- Donation setup with transparent goals and an explanation of hosting/API costs.
- A go/no-go review for a broader public launch based on accuracy, operating cost and actual
  demand.
- Marketing plan: positioning, landing page, search visibility, vegan-community outreach,
  partnerships, launch content and a measured public-beta campaign.
- Operational dashboards, budgets, quota alerts, backups, incident response and a public
  status page.

## Trust and licence

AI extracts and translates text; product ingredient classification is deterministic and
versioned. Probable/unknown verdicts preserve uncertainty, and allergen “may contain” traces
do not change vegan status. Restaurant-menu results are assistance, not a guarantee: users
should compare the visible original and ask staff about preparation and cross-contact.

Open Food Facts is ODbL-licensed (with separate image terms), and OpenStreetMap data requires
ODbL attribution. Vegan Tools is released under the [GNU GPL v3.0](LICENSE).
