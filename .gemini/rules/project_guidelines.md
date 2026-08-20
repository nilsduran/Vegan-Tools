# Project Guidelines & Preferences (Vegan Tools)

## Core Guardrails
1. **Local Only & Zero Push**: Never run `git push` or deploy to production without explicit confirmation.
2. **Privacy**: Never store user coordinates in any DB. App must work without GPS.
3. **i18n**: Type-safe dictionary `caPhrases` in `apps/web/src/i18n.ts`. Dynamic text localized via `localizeGeneratedText`.
4. **Verification**: Always run `npm test` and `npm run check` before concluding.
5. **Tasks**: Handle features, bug fixes, and refactoring with surgical isolation and branch hygiene (`feature/*`, `fix/*`).
