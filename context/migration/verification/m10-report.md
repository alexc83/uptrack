# M10 CE Records — implementation and targeted verification

**Status: IMPLEMENTED on `feature/react-ce-records` — pending owner acceptance. Not merged, not pushed.**
Date: 2026-11-03. Baseline main/origin/main: `c8e581eac25d159b263c73ed0e4982b9511fde1d` (verified equal, ahead/behind 0/0, clean tracked tree; three unrelated untracked files left untouched).
The M10 spec was a DRAFT outline; the owner's 2026-11-03 brief explicitly authorized implementation ("Begin M10 implementation now"), which is recorded here as the approval of record for this milestone.

## Scope implemented (Angular parity, no backend changes)
- CE list page at `/ce-records` (router now lazy-loads the real page; `/app/ce-records` redirect unchanged): summary cards (Total CE Hours / Records / Missing Certificates), debounced (250 ms) title/provider search, credential select, certificate chips (All / On file / Missing), Clear, pagination (page size 10, "Showing X–Y of Z records"), desktop table + mobile card list.
- Data source matches Angular exactly: `GET /api/credentials` flattened `ceRecords`, newest `dateCompleted` first; credential options derived from the same payload.
- Create via "Add CE Record" dialog (disabled with hint when the account has no credentials), credential selector, Zod schema mirroring `CERecordRequestDto` (title/provider trimmed, required, max 180; hours > 0; valid ISO date; certificate metadata size caps; empty certificate fields sent as `null`).
- Detail drawer: independent `GET /api/ce-records/{id}`, metadata grid, associated-credential link navigating to `/credentials?credentialId=…` (M09 consumes it), certificate view link, inline edit, delete with confirmation dialog, certificate removal via update with null metadata.
- Certificate upload: client-side type guard (PDF/JPG/JPEG/PNG/WEBP/GIF by MIME or extension, matching `CertificateUploadServiceImpl`), `POST /api/uploads/certificates` multipart, success/failure status, remove-before-save.
- Deep link: `/ce-records?recordId=…` opens the drawer, consumes only `recordId`, preserves other params/hash (REPLACE), same pattern as M09 `credentialId`.
- Session isolation: `CERecordSessionBoundary` remounts on session replacement; mutations capture a `SessionGuard` and abort/refuse on account switch (M09 pattern).
- Cache: create/edit invalidate credentials root + dashboard + credential + `ceRecord(id)` via existing `invalidateCERecordData`; delete cancels then evicts `ceRecord(id)`/`ceRecordsRoot` before invalidating.
- Loading / error+Retry / background-refetch-error / empty / no-match states on page and drawer.

## Files changed
- New `frontend-react/src/features/ce-records/`: `ce-records-page.tsx`, `ce-record-view.ts`, `ce-record-form-schema.ts`, `ce-record-form.tsx`, `ce-record-form-dialog.tsx`, `ce-record-detail-drawer.tsx`, `delete-ce-record-dialog.tsx`, `use-ce-records.ts`, `use-ce-record-mutation.ts`, `use-certificate-upload.ts`, `ce-record-session-boundary.tsx`, `ce-records-page.test.tsx` (15 tests).
- `src/app/router.tsx` (`/ce-records` → real page), `src/app/router.test.tsx` (placeholder test narrowed to `/settings` + new real-page test), `src/app/preview/shell-placeholder.tsx` (removed stale `/ce-records` entry).
- New `frontend-react/e2e/ce-records.spec.ts` (3 tests) + `e2e/ce-record-fixtures.ts` (stateful synthetic API fixture).
- No backend, Angular, or API-contract changes. No dependency changes.

## Focused verification run 2026-11-03 (this environment)
- Unit: `npx vitest run` — **36 files, 505/505 PASS** (includes 15 new CE tests + updated router tests).
- Lint: `npm run lint` — PASS (0 problems).
- Typecheck: `npx tsc -p tsconfig.app.json --noEmit --types node` — PASS. Note: plain `npm run typecheck`/`npm run build` currently fail in this sandbox only with TS2688 "Cannot find type definition file for '… 2'/'… 3'" because `node_modules/@types` contains pre-existing duplicate folders (`aria-query 2`, `react 3`, …, untracked copy artifacts also visible as `src/test/render-with-providers 2.tsx`); zero errors reference `src/` or `e2e/`. `--types node` scopes implicit type inclusion and passes cleanly.
- Production bundle: `npx vite build` — PASS (`ce-records-page-*.js` code-split chunk emitted). `npm run build`'s `tsc -b` step is blocked only by the TS2688 artifact above.
- Playwright (Chromium fallback only, `E2E_CHROMIUM_FALLBACK=1 --project=chromium`): `e2e/ce-records.spec.ts` **3/3 PASS**; full single-engine suite **128/128 PASS** (no regressions from the router change). Cross-browser (msedge/chrome/firefox/webkit) and Edge/macOS visual suites NOT RUN — owner scope (M13).
- Live backend/PostgreSQL acceptance NOT RUN (not authorized here; hosted backend stays suspended; nothing on port 8080 touched; no DB writes).

## Known limitations / follow-ups (not M10 blockers)
- In real browsers, RHF `mode: 'onTouched'` shows the first submit error per render pass in the CE dialog (jsdom shows all four); the e2e asserts the first alert + zero writes, matching the established M09 assertion style. Unit tests assert the full error set.
- `npm run typecheck` / `npm run build` need a clean `npm ci` (or removal of the duplicated `node_modules/@types/*` copy artifacts) in this sandbox; unrelated to M10 code.
- Live React → Spring → PostgreSQL CE write acceptance remains deferred per M09-W01 pattern; M10 adds no live-write evidence.
