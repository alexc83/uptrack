# M07 — Public landing page

**Status: READY — implementation plan approved and implementation authorized by the human (2026-11-02). Commit, push, merge, deployment, branch deletion, backend/Angular changes and M08 are NOT authorized.**
**Branch:** `feature/react-landing`, from `main` at `f1583b737c14e5bf908689d0bb4841939d41bee1` (verified equal to local and live `origin/main`; no tracked/staged changes).
**Prerequisite:** M06 merged and pushed (`dc12d35`, `13a9e00`; handoff `f1583b7`).

## Objective

Replace the temporary `/` foundation preview with a responsive, accessible React landing page matching the Angular landing page, reusing the M06 AuthDialog, session provider, GuestOnly guard and returnTo validation. Presentation milestone: no business functionality, no backend/Angular changes, no hosted-backend contact, no new dependencies.

## Audited Angular source (read-only reference)

- `frontend/src/app/features/landing-page/landing-page.component.{ts,html,scss}`: sticky header (brand, theme toggle, Log In, Sign Up), hero (`h1` + copy + Get Started), dashboard `<picture>` preview (desktop/mobile × light/dark swap at 768px), 4 feature cards, compliance copy + 4 benefits + drawer `<picture>` preview, CTA banner, footer.
- 8 preview assets in `frontend/public/landing/`: `dark/light-mode-dashboard.png`, `mobile-dark/light-mode-dashboard.png`, `dark/light-mode-drawer.png`, `mobile-dark/light-mode-drawer.png`. Other files in that dir are unreferenced; do not copy.
- Landing breakpoints: 1080px (grid 4→2 col, compliance stacks), 920px (header gaps), 768px (image swap, header height, preview 24rem centered), 640px (grid 1 col, nav/brand/card compaction).
- Landing primary `#3766ad`/`#4f80cb` is distinct from shell primary `#185FA5`/`#378ADD`; both are preserved, not unified.

## Approved decisions (human, 2026-11-02)

1. Preserve Angular layout, content, responsive behavior and the landing-specific palette.
2. Reuse the existing 8 Angular preview assets (same-repo copy into `frontend-react/public/landing/`).
3. Reuse M06 AuthDialog, session provider, GuestOnly guard and returnTo validation unchanged; keep M06 dialog wording ("Log in"/"Sign up").
4. Enlarge interactive targets to at least 44px (F7-class intentional improvement; Angular toggle 35px / login 39px are below the M02 minimum).
5. Footer technology reference corrected to React and Spring Boot (intentional deviation; a React page must not claim Angular).
6. Correct stale migration-progress documentation (`migration-status.md`, `master-plan.md`) during M07; historical milestone reports stay unchanged.
7. The 4 foundation-dependent tests may be updated, preserving behavioral intent and without weakening router/auth/zero-API verification. All 8 shell/modal visual baselines stay unchanged.
8. Candidate M07 screenshots are evidence for review, not auto-approved goldens; golden approval needs a separate decision.

## Preserved contracts (M06/M05/M04)

- `GuestOnly` on `/`: guests see landing; authenticated users redirect to `/dashboard`; nothing renders while `initializing`/`unavailable`.
- `?auth=login|register` controls the dialog; close deletes only `auth` (keeps pending safe `returnTo`); success navigates via `resolveReturnTo`.
- `returnTo` stays internal-only via `parseReturnTo` (fallback `/dashboard`); unsafe targets never restore.
- Focus containment/restoration via AppModal/Flowbite/`useOverlayLayer` (F11 fix preserved); theme via single `uptrack-theme` key (F1 fix preserved); title "UpTrack — Credential & CE Tracking" (F8 fix preserved).
- No mutations or cache writes in M07, so no `captureSession().isCurrent()` guard obligation arises. No changes to auth logic, session isolation, token handling, transport, guards, forms, or QueryClient.
- Guest landing render issues zero `/api` requests (default-deny e2e fixture enforces this).

## Out of scope

M08–M14 functionality; backend; Angular; isolated PostgreSQL DB; hosted backend; dependency/manifest changes; externally hosted assets; new login/registration forms, modal systems or auth providers; router replacement; shared theme infrastructure changes.

## Acceptance criteria (Given/When/Then, abbreviated)

- Guest visits `/` → full landing page (7 sections), zero `/api` requests, no console errors, no horizontal overflow at 375/768/769/1280 in both themes.
- Each auth trigger (Log In, Sign Up, hero Get Started, CTA Get Started for Free) → existing AuthDialog in the correct mode; mode switch, Esc/backdrop/X close, focus restored to the used trigger.
- `?auth=login&returnTo=/credentials` → dialog opens over landing; close keeps `returnTo`; successful login (mocked) navigates to `/credentials`; unsafe `returnTo` falls back to `/dashboard`.
- Authenticated visit to `/` → redirect `/dashboard` with no landing flash.
- Theme toggle flips `html.dark`, persists `uptrack-theme`, swaps preview images; survives reload; pre-paint avoids flash.
- All interactive targets ≥44px; headings/landmarks mirror Angular; reduced-motion disables animation; keyboard-only operation works.
- Full unit + browser suites pass; 8 existing visual baselines byte-identical; production audit 0; full audit shows only the 16 deferred dev findings.

## Verification commands

From `frontend-react/`: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`, `npm audit`, `npm audit --omit=dev`. Plus landing screenshot inspection vs Angular source, M01 crops (`u1-landing-*`), lower-page references (with documented staleness) and live local Angular rendering. Edge/macOS-only browser coverage and manual screen-reader checks are reported as limitations.

## Approved file inventory (planned)

New: `src/features/landing/*` (page, 7 section components, content data, component tests), `public/landing/` + 8 PNGs, `e2e/landing.spec.ts` + new snapshot dir, `verification/m07-evidence/` candidates.
Modified: `src/app/router.tsx` (landing on `/`, remove `FoundationSmokeView`; eager import — landing is the entry route, so lazy loading adds no value), `src/styles/globals.css` (landing tokens), `src/core/theme/flowbite-theme.ts` (`landing` button color), 4 foundation-dependent tests (`src/test/smoke.test.tsx`, `e2e/smoke.spec.ts`, `e2e/api-transport.spec.ts`, `src/core/auth/route-guards.test.tsx`) plus required trigger-label updates in `src/features/auth/auth-dialog.test.tsx` (temporary-host `Log in` trigger → landing `Log In`; dialog assertions unchanged).
Deleted: `src/features/auth/auth-host.tsx` (logic migrated into landing page; only after zero references remain).
Docs: this spec, `verification/m07-report.md`, `migration-status.md`, `master-plan.md`, `agent-handoff.md`, `current-feature.md`.
Untouched: backend, Angular, manifests/lockfiles, existing 8 goldens, M01 evidence, untracked `render-with-providers 2.tsx`, unrelated untracked `conversation-2026-11-02-064616.txt`.

## Completion report

`context/migration/verification/m07-report.md`
