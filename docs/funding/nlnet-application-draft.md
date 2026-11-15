# NLnet application — briefing and draft answers (NOT FOR SUBMISSION AS WRITTEN)

*Prepared 2026-11-15 for owner review. Nothing has been submitted and nothing is decided.*

---

## ⚠️ 0. Read this first: three issues that decide whether to apply at all

### 0.1 This text cannot be pasted into the form

NLnet published **version 2.0 of its Generative AI policy on 2026-10-20**. It applies to every call with a later deadline, including the next one (3 January 2027):

- *"It is **not** allowed to use generative AI during the writing of proposals."* The ban covers idea generation, restructuring, shortening **and translation**. The only exception is accessibility needs, and that use must be disclosed.
- **This document was produced with generative AI (Claude).** Treat it as an internal fact sheet and checklist. If you apply, write the answers yourself, in your own words. The form asks *"Did you use generative AI to write the proposal?"*, and the honest answer depends on how you used this file. If you reuse its wording, you must answer "Yes" and paste the prompts and outputs (up to 8,000 characters), which could get the proposal rejected.
- Sources: [policy v2.0](https://nlnet.nl/foundation/policies/generativeAI/2.0/), [announcement](https://nlnet.nl/news/2026/20261020-AI-policy.html).

### 0.2 The funded work itself must be written without generative AI

- During a grant, *"It is not allowed to use generative AI for producing artefacts of any kind, including code, design, and documentation."* Read-only use is still allowed, such as having a tool point out bugs that you then fix by hand.
- NLnet's earlier call notes already said that mostly LLM-generated work ("vibecoding") is ineligible.
- The form also asks: *"Does the existing codebase include, or expect to gain, significant AI-generated code?"* This repo has an `AGENTS.md` written for AI agents and is developed with AI coding sessions, so the honest answer is probably **"Yes"**. You would then add a high-level description (max. 1,000 characters) and a public statement in the README.
- **Practical consequence:** every milestone below would need to be hand-written for the length of the grant. Only you can judge whether that is realistic.

### 0.3 Restack excludes generative-AI projects, and the app's core feature uses Gemini

- **NGI Zero Commons Fund is closed.** Its 13th and final call closed on 2026-06-01 ([commonsfund](https://nlnet.nl/commonsfund/)).
- The NLnet calls open now are **Restack** (EU "Open Internet Stack", Horizon Europe grant no. 101299072), **CodeSupply** (software supply-chain metadata, not a fit) and a generic **"Other / open call"** option on the form ([funding page](https://nlnet.nl/funding.html), [call notice](https://nlnet.nl/news/2026/20261103-call.html)).
- Restack: *"AI-related projects are not within scope"*. The only exception is for projects already used by more than 1 million active human users. The rule *"exclusively concerns GenAI"*, and non-GenAI automation and machine learning may be in scope ([restack](https://nlnet.nl/restack/)).
- Vegan Tools reads menus, runs OCR and resolves restaurant websites with **Gemini** (`apps/api/src/menu-analyzer.ts`, `restaurant-website-finder.ts`). That part is out of scope.
- **The proposal can only cover the non-GenAI, reusable parts**:
  - the deterministic ingredient classifier and taxonomy (`packages/domain`);
  - an open dataset and API built on them;
  - contributing verified `diet:vegan` data to OpenStreetMap.
- Even then, fit with Restack's "internet stack" framing is **moderate at best**. The strongest link is its line on *"alternatives to closed online technologies that serve a large user base"*: Vegan Tools would be an open-data alternative to closed vegan directories such as HappyCow. I recommend choosing **"Other / open call"** on the form and letting NLnet route the proposal.

### 0.4 Key facts

| Item | Value |
|---|---|
| Next deadline | **3 January 2027, 12:00 CET (noon)** |
| Grant size | €5,000–50,000 for a first grant |
| Eligibility | Individuals allowed. Needs a "strong European dimension": team members in a Horizon Europe-eligible country receiving ≥60% of funds. A Catalonia-based developer qualifies. |
| Licence | Results under a recognised free/open-source licence. AGPL-3.0 code is fine. Datasets need an open licence. |
| Submission | Web form at [nlnet.nl/propose](https://nlnet.nl/propose/), plus a security token requested by email (token-request@nlnet.nl) |
| Help | Restack office hour on 25 November 2026 ([restack](https://nlnet.nl/restack/)) |

---

## 1. Fact check: what the repo really does (use this when writing answers)

The roadmap marks several things ✅ that are partial. **Do not claim them as finished.**

| Claim (roadmap/README) | Reality in the repo (2026-11-15) |
|---|---|
| "✅ Edge Classifier ONNX & multilingual dataset" (roadmap N3 #18) | `apps/api/src/edge-classifier.ts` exists and is wired into `routes/products.ts`. However, `*.onnx`, `/data/` and `notebooks/` are all **gitignored**, so no model, dataset or notebook is published. The code only runs if a local model file exists. `docs/benchmark-results.md` gives the ML model **12.35% macro-F1**. Call it a prototype at most. |
| Deterministic classifier is reliable | On the 1,798-sample hold-out set in `docs/benchmark-results.md`, the regex baseline (`packages/domain/src/classifier.ts`) has **14.18% recall on meat/slaughter ingredients and an 84.84% false-vegan rate**. In German and FR/IT it detects no meat at all (0% recall). This is a real weakness, and fixing it is a fundable task, not something to hide. |
| Ingredient taxonomy | `packages/domain/src/data/taxonomy.json` has **1,459 entities** (1,154 vegan, 203 ambiguous, 70 non-vegetarian, 32 vegetarian) plus aliases. It was compiled from the Open Food Facts taxonomy (`scripts/build-taxonomy-index.py`), so **licence and provenance need checking** (see open questions). |
| "AI Recipe Veganizer" (README) | `/v1/recipes/veganize` calls `veganizeRecipe` from `@vegan-tools/domain`. It is **deterministic, not GenAI**. That helps for Restack. |
| OSM contribution | **Not implemented.** The app *reads* `diet:vegan` and `diet:vegetarian` through Overpass (`routes/restaurants.ts`). Writing back to OSM is roadmap N4 #12 and is explicitly postponed. |
| Community edits / added venues | Added restaurants are stored in browser `localStorage`. Edits go to `POST /v1/restaurants/:id/edit`. Neither feeds OSM. |
| Curated venues | **114 venues in 21 city files** (`packages/domain/src/data/featured/`), all `isVegan: true`, checked by `npm run audit:pins`. |
| Images "audited before visible" (values.md §3) | The automatic Safe Space image guard is still roadmap N4 #13. Only the blur on non-vegetarian Open Food Facts product images is implemented. |
| Sanctuaries map layer | Not done (roadmap N3 #16). |
| Evidence hierarchy (certification > manufacturer > …) | Documented in `architecture.md`. I did not verify how fully the code enforces it. Do not claim it without checking. |
| Project age / team | First commit 2026-07-02, 115 commits, one author. Version `0.1.0`. |
| Live site | vegan-tools.onrender.com (docs also mention vegantools.org) |

---

## 2. Proposed scope (non-GenAI, reusable, public-interest)

**Working title:** *Open Vegan Data: an openly licensed ingredient taxonomy, a deterministic classifier and verified `diet:vegan` contributions to OpenStreetMap*

**Principle:** fund the pieces anyone can reuse without Vegan Tools, an LLM or a cloud account. Every artefact is written by hand (see §0.2). Labels in the datasets are set by **people**, not by Gemini: LLM-generated labels would themselves be GenAI artefacts.

### Milestones and budget

The rate is a **placeholder of €40/h**. NLnet asks for the rate you actually use, so set your own.

| # | Milestone | Deliverables | Hours | € |
|---|---|---|---|---|
| M1 | **Open ingredient taxonomy dataset** | Clean up provenance and licence of the 1,459-entity taxonomy. Add a documented schema (status, category, aliases, evidence level, sources, version). Publish as a versioned dataset under a licence compatible with its sources. Send fixes upstream to the Open Food Facts ingredients taxonomy where we disagree. | 120 | 4,800 |
| M2 | **Standalone deterministic classifier library** | Extract the classifier and normaliser from `packages/domain` into a published package that has no web or API code. Build hand-written multilingual coverage (ca, es, en, de, fr, it) and OCR-noise-tolerant normalisation (edit distance, transliteration). Use no GenAI. **Target: raise meat recall on the existing hold-out set from 14% to ≥95% while keeping false-vegan output under 1%.** Publish the evaluation script. | 220 | 8,800 |
| M3 | **Human-verified dish-level benchmark** | Write an annotation guide (vegan / vegetarian / not vegan / adaptable only when stated on the menu). Hand-label ~2,000 dishes from real menus in ca, es and en, with source and date. Publish the dataset openly and fill in the "Gold Standard" column of `benchmark-results.md`. | 140 | 5,600 |
| M4 | **Open, self-hostable classification API** | Document read-only endpoints (`/v1/ingredients/classify` plus a new dish-text endpoint) with an OpenAPI spec. Include rate limits, no logging of personal data, a Docker/self-host guide and versioned verdicts that state the rule version. | 90 | 3,600 |
| M5 | **Verified `diet:vegan` contributions to OpenStreetMap** | Write a gap-report tool that compares verified venues with OSM tags. Follow the OSM [Organised Editing Guidelines](https://wiki.openstreetmap.org/wiki/Organised_Editing_Guidelines): wiki page, community discussion, no bulk import. Publish MapRoulette tasks or OSM notes for human review, and add an optional OSM OAuth2 flow so a user can tag `diet:vegan` themselves. Start with Catalonia together with the local OSM community. | 140 | 5,600 |
| M6 | **Documentation, release, and audit support** | Write user and developer docs in ca and en, a GenAI-use statement in the README, and release notes. Respond to the NLnet security, accessibility or licence reviews if offered. | 40 | 1,600 |
| | **Total** | | **750 h** | **€30,000** |

**Expenses:** none requested. Hosting stays on existing free tiers, and NLnet does not reimburse AI/API costs.

If €30k feels too large for a first grant from a four-month-old project, M1 + M2 + M5 alone is 480 h = €19,200 and is the most coherent core.

---

## 3. Draft answers, field by field

> Facts and angles for each field. Write the submission text yourself (see §0.1). Character limits are the form's.

### 3.1 Fund
"Other / open call", or Restack if you prefer. See §0.3.

### 3.2 Proposal title
Something like *"Open Vegan Data: open ingredient taxonomy, deterministic classifier and OSM `diet:vegan` contributions"*.

### 3.3 Website / repositories
https://github.com/nilsduran/Vegan-Tools · https://vegan-tools.onrender.com

### 3.4 Abstract (max. 1,000 characters)
Points to cover:
- **Problem:** People who avoid animal products cannot easily tell which dishes and products are vegan. The data is either locked in proprietary apps and directories or produced by opaque AI.
- **What exists:** Vegan Tools is an AGPL-3.0, zero-tracking web app (Catalan and English) with a map built on OpenStreetMap, an Open Food Facts barcode scanner and an ingredient classifier.
- **What the grant produces:** an openly licensed multilingual ingredient taxonomy, a standalone deterministic classifier library, a human-verified dish benchmark, a documented self-hostable API, and verified `diet:vegan` tags contributed to OSM through community-reviewed workflows.
- **Expected result:** anyone (other apps, OSM mappers, Open Food Facts) can reuse the pieces without depending on Vegan Tools or an LLM.

### 3.5 Requested amount
€30,000, or €19,200 for the reduced scope.

### 3.6 Budget breakdown (max. 4,000 characters)
Use the milestone table in §2, with tasks, hours and rate. State "no expenses". Say which rate you use and why.

### 3.7 Comparison with existing efforts (max. 4,000 characters)
Be honest. Reviewers know this field.
- **Open Food Facts** already computes a vegan / non-vegan / maybe status from its ingredients taxonomy. Our taxonomy **derives from it**. Say where ours adds something (Catalan coverage, a precautionary treatment of dual-origin additives, restaurant dishes, which OFF does not cover) and commit to sending fixes upstream rather than forking. NLnet explicitly asks whether you considered contributing to others.
- **OpenStreetMap** already has `diet:vegan` and `diet:vegetarian` tags, and open maps such as veggiekarte.de use them. The gap is coverage and verification, not a new map. M5 improves OSM itself.
- **HappyCow, abillion, Yuka** and similar are closed data with ads, accounts or tracking. Our output is open data, with no lock-in.
- **LLM-based menu readers**, including Vegan Tools' own Gemini pipeline, are opaque, cost money per request and are non-deterministic. M2–M4 provide an auditable deterministic alternative with published error rates.

### 3.8 Technical challenges (max. 4,000 characters)
- Multilingual morphology and synonyms without an LLM. Today German and FR/IT get 0% meat recall.
- OCR noise ("gelatna", "carm1n") handled with edit distance and normalisation, without raising false positives.
- An asymmetric safety requirement: a false "vegan" is far worse than a false alarm. Thresholds and conservative defaults for dual-origin additives (E471, glycerin, D3).
- Composite dishes ("brou d'aviram", "a la carbonara") where the animal ingredient is implied by the name of the dish.
- **Licensing:** compatibility between Open Food Facts taxonomy terms, our AGPL code and the dataset licence. For OSM, data must be the contributor's own observation (no copying from Google or HappyCow).
- **OSM community process:** organised editing has to be discussed and approved locally before it starts. Plan time for that.

### 3.9 Ecosystem and engagement (max. 2,000 characters)
- **Upstream projects:** Open Food Facts (taxonomy, product data), OpenStreetMap (Overpass, Nominatim, diet tags), Leaflet, Fastify.
- **Who uses the results:** people who avoid animal products, Catalan speakers (there are few vegan tools in Catalan), developers of other food apps and OSM mappers.
- **Engagement:**
  - OSM Catalan community and the talk mailing list or forum before any organised edits;
  - issues and pull requests on the OFF taxonomy;
  - local vegan associations and restaurants to verify venues;
  - publishing the datasets with documentation.

  *(Owner: name concrete contacts or communities you actually know. Do not invent endorsements.)*

### 3.10 Your suitability and experience (max. 2,000 characters)
**Owner only.** Background, previous open-source work, why you. Mention the existing repo, test suite and CI gates (`npm run check`) as evidence that you can deliver.

### 3.11 Other funding sources (max. 1,000 characters)
Currently none. Amazon affiliate links on `/recursos` bring in negligible income. List any other application you send in parallel (see `other-options.md`).

### 3.12 Generative AI disclosure
- Proposal written with GenAI? Depends on how you wrote it (§0.1).
- Codebase contains significant AI-generated code? Probably **Yes** (§0.2). Describe it at a high level, and commit to hand-written work during the grant.

### 3.13 Contact, applicant type, country
Owner only: name or pseudonym, email, phone. Applicant type is probably "Individual". Country: Spain.

---

## 4. Open questions only the owner can answer

1. **GenAI policy:** Can you write the proposal and do the funded work by hand, without generative AI producing code or docs? If not, NLnet is not a fit right now, and the EA Animal Welfare Fund (see `other-options.md`) has no such rule.
2. **AI-generated share of the codebase:** How much of the code was AI-generated? You need this to answer the disclosure question honestly.
3. **Scope:** Are you comfortable proposing *only* non-GenAI work (taxonomy, classifier, dataset, OSM), with the Gemini menu reader left out?
4. **Taxonomy licence:** What licence applies to the Open Food Facts taxonomy terms used in `taxonomy.json`, and can the derived dataset be published as open data? Ask OFF if unclear.
5. **Edge classifier data:** Do you want to publish the gitignored 12,000-sample dataset and model? Were any of its labels generated by an LLM? If so, they cannot become a funded deliverable.
6. **Rate and hours:** What hourly rate and how many hours per month can you commit over 9–12 months?
7. **OSM:** Do you have, or are you willing to create, an OSM account and engage the Catalan OSM community before any organised editing?
8. **Applicant type and tax:** Will you apply as an individual (autònom or not)? NLnet pays per completed milestone, so check the tax consequences.
9. **Suitability text, contacts and endorsements:** These have to come from you.
