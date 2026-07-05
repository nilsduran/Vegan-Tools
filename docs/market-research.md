# Market research

_Snapshot: July 2026. This is a product-landscape review, not an endorsement._

## Direct products

| Product | Main job | Useful pattern | Gap Vegan Tools should address |
| --- | --- | --- | --- |
| [Pick&Eat](https://pick-n-eat.app/) | Scan and translate restaurant menus with diet filters | Fast camera-first menu workflow | AI matching is presented without an auditable evidence model |
| [Travel.Eat](https://apps.apple.com/us/app/travel-eat-menu-translator/id6504732837) | Menu translation, nearby venues and dietary filters | Saved menus and location context | Broad scope; dietary certainty is difficult to verify |
| Yumi | AI menu extraction and filtering | Structured dish cards and live results | No visible correction or provenance workflow |
| [V-Pal](https://v-pal.com/en/) | Barcode/ingredient scan plus vegan places | Combines several vegan daily-life tools | Coverage and verification methodology are not the primary interface |
| [CodeCheck](https://codecheck-app.com/) | Food and cosmetics ingredient transparency | Ingredient-level explanations and alternatives | Wider consumer-health focus rather than conservative vegan verification |
| [MyGredient](https://mygredient.com/) | Barcode plus ingredient-label checking | Does not rely on barcode data alone | Personalisation adds complexity before evidence quality is resolved |
| Feny Verify | Labels, barcodes, menus and confidence | Explicitly exposes uncertainty and sources | Confidence must still be tied to reproducible evidence |
| [Open Food Facts](https://world.openfoodfacts.org/) | Open product database and scanner | Scale, open data, contribution loop | Community data is explicitly not guaranteed accurate or complete |

## Open-source inspiration

- [Open Food Facts](https://github.com/openfoodfacts): Product Opener, its mobile app,
  taxonomies and data-quality flags are the strongest reference for collaborative product data.
- [Robotoff](https://github.com/openfoodfacts/robotoff): extraction should create reviewable
  predictions rather than silently overwrite source data.
- [MakeACopy](https://github.com/egdels/makeacopy): a strong interaction model for OCR
  correction, confidence highlighting and multi-page source review.
- [Organic Maps](https://github.com/organicmaps/organicmaps) and OpenStreetMap: useful future
  references for an open, community-maintained vegan venue directory.

## Restaurant discovery providers

| Provider | Coverage and menu usefulness | Cost/constraints | Decision |
| --- | --- | --- | --- |
| OpenStreetMap + Nominatim | Free and correctable, but independent venues may be missing or stale; website fields are inconsistent | Public Nominatim has a strict usage policy and is not a high-volume production search service | Keep as the no-key fallback |
| [Foursquare Places](https://docs.foursquare.com/fsq-developers-places/reference/place-search) | Broader commercial POI coverage and may return the official website | 500 free Pro calls under the June 2026 pricing, then metered usage | Recommended optional primary provider for this personal project |
| [Google Places](https://developers.google.com/maps/documentation/places/web-service/text-search) | Usually the strongest local-business coverage; can return website data | Billing account, field-sensitive pricing, caching restrictions, Google Maps attribution, public terms and privacy-policy requirements | Do not make it the default while the project has a near-zero budget |
| Gemini grounding with Google Maps/Search | Can locate current places and official/menu pages using the existing Gemini key | Variable grounded output; citations must be shown, and paid usage starts beyond the free grounding allowance | Promising later fallback, but URLs must be fetched and validated before analysis |

The current implementation uses Foursquare when `FOURSQUARE_API_KEY` is configured and
falls back to OpenStreetMap. It then crawls only the selected official website, follows a
small number of likely `menu`/`carta` links, prefers PDFs and validates every fetched URL
against server-side request-forgery rules. Manual website entry and file upload remain
necessary fallbacks.

## Product position

The market already has many “AI scanner” products. Vegan Tools should not compete on a
larger model or a more confident green badge. Its defensible position is:

1. one coherent menu and packaged-product toolkit;
2. conservative verdicts with `unknown` as a normal outcome;
3. visible source, date, recipe revision and reason;
4. corrections that preserve history;
5. a measurable precision target reported separately from coverage.
