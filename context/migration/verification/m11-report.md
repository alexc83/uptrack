# M11 CE Report — implementation and targeted verification

**Status: IMPLEMENTED on `feature/react-ce-report` — pending owner acceptance. Not merged, not pushed.**
Date: 2026-11-03. Baseline main/origin/main: `ca038696b61c4554a003ebd1a50585054062222f` (verified equal via fetch, ahead/behind 0/0; only new remote state is three untouched Dependabot branches).
The M11 spec was a DRAFT outline; the owner's 2026-11-03 brief explicitly authorized implementation ("Begin M11 implementation now"), which is recorded here as the approval of record for this milestone, following the M10 precedent.

## Scope implemented (Angular parity, no backend changes)

- Report page at `/credentials/:credentialId/ce-report` (router now lazy-loads the real page outside the shell; `?returnTo=` preserved untouched; placeholder deleted).
- Data: `GET /api/credentials/{id}/ce-report` via existing `credentialsApi.getCEReport`, TanStack key `['credential', id, 'ce-report']` (existing M05 key); no query params sent (post-S01 caller-scoped; 404 for foreign credentials surfaces as the error state).
- Sheet mirrors Angular: kicker, credential name, org + status chip, `Name:` (session user, `?? 'UpTrack User'`) / `Generated:` long date; CE Progress copy + meter; 8-field Credential Summary; records table (Title/Provider/Completed Date/Hours/Certificate, fixed 32/22/18/8/20 widths, `data-label` cells); totals (Total CE Hours / Total Records); footer (`Generated from UpTrack` + `MMM D, YYYY, H:MM AM/PM` timestamp).
- Formatting matches Angular exactly: integer-or-one-decimal hours (reused `formatCredentialHours`), short dates (reused `formatShortDate`), generic underscore-to-title-case status labels, `Not required` / `0 hours` when required is 0, `100%` when required is 0 or progress \u2265 1, `On file` / `Not attached` certificates, singular/plural record count.
- Back follows `?returnTo=` when it starts with `/`, else `/credentials`; Print removes `html.dark`, prints on the next animation frame, restores theme + printing pass on `afterprint`.
- Print CSS (`globals.css`, the documented "print styles" Flowbite gap): `@page 0.7in 0.6in`, white sheet/cards, ink text, `#d1d5db` borders, header/progress/summary/cards keep-together, records card starts a new page, rows keep-together, `thead` repeats, table layout kept even from narrow windows; screen-only header/error actions hidden via `print:hidden`.
- Mobile \u2264720px: summary/totals stack to one column, records table becomes stacked cards with `data-label` captions, header/footer stack; 44px-minimum buttons.
- Loading / error+Back+Retry (`role=alert`, server message) / empty-records states; `refetchError` shows the M09/M10 "may be out of date" banner (React-wide pattern).
- Session isolation: `CEReportSessionBoundary` remounts on session replacement (M09/M10 pattern); route stays behind `RequireAuth`; guest deep links still redirect to `/?auth=login&returnTo=\u2026`.
- Cache freshness after credential/CE mutations needs no new code: existing `invalidateCredentialData` invalidates the `['credential', id]` prefix, which also reaches `['credential', id, 'ce-report']` (parity contract \u00a74/M05 note).

## Intentional deviations from Angular (all documented)

1. Credential name renders as `h1` (Angular: `h2`, no `h1` on the page) and cards as `h2` (Angular: `h3`); every other React page has an `h1`, and AT users get a page heading. Copy and visual hierarchy unchanged.
2. `returnTo` values starting with `//` fall back to `/credentials`. Angular accepts any leading-`/` path and stays in-app; React Router would throw on protocol-relative input, so the fallback keeps the guarantee same-origin.
3. Progress meter reuses the shared `ProgressBar` (accessible `progressbar` + clamping) instead of Angular's bespoke gradient track; copy (`X / Y hours`, `N% Complete`) is unchanged.
4. Background-refetch failure shows the small "may be out of date" banner per the established M09/M10 React pattern; Angular has no equivalent state.

## Files changed

- New `frontend-react/src/features/ce-report/`: `ce-report-page.tsx`, `ce-report-view.ts`, `use-ce-report.ts`, `ce-report-session-boundary.tsx`, `ce-report-page.test.tsx` (18 tests).
- `src/app/router.tsx` (report route \u2192 real page), `src/app/router.test.tsx` (placeholder test \u2192 real-page test), deleted `src/app/preview/report-placeholder.tsx`.
- `src/styles/globals.css` (report print + \u2264720px table CSS), `src/test/fixtures/api-fixtures.ts` (shared `ceReport` fixture).
- New `frontend-react/e2e/ce-report.spec.ts` (3 tests); `e2e/helpers.ts` (`mockCredentialReads` gains a ce-report mock), `e2e/credential-fixtures.ts` (stateful ce-report mock), `e2e/app-shell.spec.ts` + `e2e/auth.spec.ts` + `e2e/credentials.spec.ts` (placeholder-heading assertions \u2192 real heading).
- No backend, Angular, or API-contract changes. No dependency changes.

## Focused verification run 2026-11-03 (this environment)

- Unit: `npx vitest run` \u2014 **37 files, 523/523 PASS** (505 prior + 18 new).
- Lint: `npm run lint` \u2014 PASS (0 problems). Typecheck: `npm run typecheck` \u2014 PASS. Build: `npm run build` \u2014 PASS (`ce-report-page-*.js` chunk emitted).
- Playwright (bundled Chromium/Firefox/WebKit via `E2E_CHROMIUM_FALLBACK=1`; local Vite server): new `e2e/ce-report.spec.ts` **3/3 \u00d7 3 engines PASS**; full functional suite **393/393 PASS** (131 \u00d7 3 engines) after fixing one stale placeholder assertion found by that run (`auth.spec.ts` expected h1 `CE Report`; now `Fixture credential`). Default-deny API guard and no-uncaught-errors guard held on every spec.
- NOT RUN (owner scope): Edge/Chrome branded builds, `visual-edge` goldens (no baseline touched), live-backend/PostgreSQL acceptance (hosted backend untouched; nothing on port 8080; no DB writes), manual screen-reader review.

## Known limitations / follow-ups (not M11 blockers)

- E2E in this sandbox required an escalated (unsandboxed) shell invocation because the sandbox blocks listening sockets; the Vite dev server and browsers ran locally and were stopped afterwards. No repo or system change resulted.
- `window.print` itself is stub-asserted (jsdom) and print CSS is asserted via print-media emulation; a real paper/PDF multi-page check remains owner acceptance.
- Pre-existing untracked `\u2026 2` copy artifacts and the two unrelated root untracked files were left untouched; the M11 commit names only its own files.
