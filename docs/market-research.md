# Vegan Tools — Market Research & Ecosystem Landscape

_Snapshot: August 2026. A product and architectural landscape review of plant-based discovery tools._

---

## 🧭 1. Direct Products & Competitive Gaps

| Product | Primary Purpose | Strengths | Gaps Addressed by Vegan Tools |
| :--- | :--- | :--- | :--- |
| **HappyCow** | Global vegan venue directory | Massive legacy venue catalog & community volume | Stale listings, no automated dish-level menu analysis, proprietary closed ecosystem, mandatory paid features. |
| **Pick&Eat** | Camera-first restaurant menu scanner | Fast mobile-first scanning UX | Ephemeral results without permanent auditable evidence or community verification workflows. |
| **Open Food Facts** | Open crowdsourced barcode database | Global scale, open ODbL database, strong community | Community data is not guaranteed 100% verified; lacks dedicated dish menus or recipe veganizers. |
| **CodeCheck** | Ingredient and cosmetics transparency | Detailed chemical toxicity and ingredient insights | Broad health & eco focus rather than conservative dietary vegan verification. |

---

## 🗺️ 2. Restaurant Discovery Providers Comparison

| Provider | Coverage & Menu Utility | Cost & Operational Constraints | Project Decision |
| :--- | :--- | :--- | :--- |
| **Geoapify Places API v2** | Broad commercial POI coverage, structured dietary tags (`diet.vegan`, `diet.vegetarian`), and direct official website URLs. | Generous free tier (3,000 daily credits), no credit card required, standard REST API. | **Primary Place Provider**: Fast, reliable, and cost-effective. |
| **OpenStreetMap + Nominatim + Photon** | Free open data, correctable by community, universal coverage. | Public Nominatim enforces strict 1 req/sec rate limits; independent small venues can have missing websites. | **Zero-Key Fallback**: Always available when offline or when external quotas expire. |
| **Overture Maps Foundation** | Massive open GeoParquet place dataset backed by Meta/Amazon/Microsoft/TomTom. | Requires batch ETL pipelines, spatial database indexing, and periodic deduplication maintenance. | **Mid-Term Strategic Candidate**: Promising for self-hosted local indexing once server scale requires it. |
| **Google Places API** | Comprehensive local business directory. | High field-sensitive pricing, strict caching restrictions, mandatory Google Maps UI SDK, and attribution requirements. | **Avoided**: Does not fit zero-budget open-source principles. |
| **Gemini with Google Search Grounding** | Real-time live web search and domain certification. | Consumes Gemini API quota; requires strict prompt constraints to filter out third-party aggregators. | **Official Website Resolver**: Invoked on-demand when place providers lack verified domains. |

---

## 🌟 3. Unique Value Proposition (UVP)

Vegan Tools does not aim to be a generic social network or another unverified AI aggregator. Its core defensible positioning rests on:

1. **Auditable Primary Sources**: Extracting dishes directly from the restaurant's live website, downloadable PDF, or photographed menu rather than 3-year-old user comments.
2. **Conservative Assurance**: Clear distinction between verified `VEGAN` and unprovenanced `PROBABLY_VEGAN` ingredients.
3. **100% Open & Privacy-First**: Zero tracking cookies, zero tracking banners, and complete access without forced account creation.
4. **All-in-One Plant-Based Toolkit**: Combining interactive map discovery, dish-level menu translation, packaged product barcode scanning, and intelligent recipe veganization.
