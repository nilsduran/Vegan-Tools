# AGENT.md — Developer AI Assistant Guidelines for Vegan Tools

This document defines persistent operational rules, constraints, and workflows for AI assistants collaborating on **Vegan Tools**.

---

## 1. Core Operating Constraints & Guardrails

### 🚨 Strict Git & Deployment Policy
- **Local environment only by default**: Always perform all development, testing, building, and validation locally (`http://localhost:5173`).
- **NEVER RUN `git push`**: Do not push commits to remote repositories (`origin main` or branches) or trigger production deployments under any circumstance without **explicit, affirmative confirmation** from the user in that specific turn.
- **Local Commits**: You may create clean local git commits once verification steps pass, but leave remote syncing to the user's discretion.
- **Branch Strategy**:
  - `main`: Production-ready, verified code.
  - `feature/*`: In-progress, experimental, or staged features (e.g. `feature/interactive-map`).
  - `fix/*`: Bug fixes or targeted patches under active iteration.

### 🛡️ Privacy & Data Protection Invariants
- **Zero Geo-Tracking**: User location coordinates (GPS) must **never** be stored in any database or transmitted for permanent logging.
- **On-Demand Location**: Geolocation must strictly be on-demand (user explicitly clicks GPS 🎯). The app must remain 100% functional without geolocation permissions.
- **Secret Hygiene**: Never log, expose, or hardcode environment secrets or API keys. Always run `npm run check` to verify secret bundle safety.

---

## 2. Workflows by Task Type

### A. Bug Fixes (Bugs & Regressions)
1. **Reproduce & Isolate**: Identify the root cause (UI artifact, state desync, edge case).
2. **Minimal & Surgical**: Apply the most targeted fix possible without unintended side effects on adjacent components.
3. **Verify Locally**: Run the affected unit test suite (`npm test`) to ensure zero regression.

### B. New Features
1. **Planning & Discussion**: Propose an implementation plan when architectural or UI decisions are needed.
2. **Modular Architecture**: Separate domain models (`packages/domain`), API handlers (`apps/api`), and UI components (`apps/web`).
3. **Branch Isolation**: Keep incomplete features on a dedicated feature branch until polished and approved for `main`.

### C. Refactoring & Code Quality
- Preserve existing public API contracts and type signatures.
- Ensure 100% of test suites pass before and after refactoring.

---

## 3. Internationalization (i18n) Rules

- Supported languages: **English (`en`)** and **Catalan (`ca`)**.
- **Type-Safe Dictionaries**: All new UI strings must be declared in `apps/web/src/i18n.ts` under `caPhrases` (`CatalanPhraseKey`).
- **Generated / AI Text Localization**: Dynamic texts (dish explanations, feedback notes) must use `localizeGeneratedText(text, language)` or direct localized fields (`reasonCa`).
- **Language Switcher**: Uses UK (🇬🇧) and Catalonia (Senyera) vector flags with strict 3:2 ratio, zero padding gap, and active border highlight.

---

## 4. Commands & Verification Protocol

- **Local iteration**: Work fast in local (`npm run dev`). No need to run the full test suite for every minor aesthetic tweak or CSS edit.
- **Pre-Push Verification Gate (Mandatory)**: Before executing any `git push` requested by the user, you MUST run `npm test` and `npm run check`.
  - **If any test or check fails**: Immediately abort the push, fix the issue, and re-verify until 100% green before pushing.

| Command | Purpose |
| :--- | :--- |
| `npm test` | Runs the full Vitest suite across domain, api, and web (required before push) |
| `npm run check` | Strict check: Typecheck (`tsc`), Vitest tests, Vite production build & secret scan |
| `npm run dev` | Starts local dev server (API + Web frontend) |

---

## 5. UI/UX Standards

- **Clean & Professional**: Avoid clutter; aim for clean, modern interfaces with intuitive touch targets.
- **Responsive**: Prioritize ergonomic mobile layout alongside clean desktop side-by-side grids.
- **Concise Copy**: Action buttons must be short and clear (e.g. `"Carta"` / `"Menu"`).
