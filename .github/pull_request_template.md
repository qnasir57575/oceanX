## What & why

<!-- One or two sentences. Link the issue. -->

## Area

- [ ] Public frontend (pages / components / styling)
- [ ] Backend (routes / services / database / auth / storage / AI)
- [ ] **Shared API contract** (`src/contracts`, `src/types/api.ts`, `src/lib/api*`, `src/mocks`, API docs) — needs review from both developers

## API contract checklist (required if any endpoint, parameter, response, auth or permission changed)

- [ ] Registry entry + schemas updated in `src/contracts/` (incl. correct **status**)
- [ ] Types exported from `src/types/api.ts`
- [ ] Client function updated in `src/lib/api/`
- [ ] Mock handler/fixtures updated in `src/mocks/`
- [ ] Contract tests added/updated (implemented endpoints)
- [ ] `npm run api:generate` run; changelog row added in `docs/API_DOCUMENTATION.md` §5
- [ ] Breaking change? If yes, explained below with migration notes

## Verification

<!-- Paste the commands you ran and their results. Don't tick what you didn't run. -->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run test:contract`
- [ ] `npm run api:check`
- [ ] Manually checked in the browser (frontend changes): loading, empty, error and success states

## Screenshots (frontend)
