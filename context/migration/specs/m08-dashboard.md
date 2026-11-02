# M08 — Dashboard

**Status: READY — plan approved and implementation authorized by the human (2026-11-02). Commit, push, merge, deployment, branch deletion, reseeding, backend/Angular changes, M09 and screenshot-baseline updates are NOT authorized.**
**Branch (approved exception, M08 only):** `claude/m08-dashboard-planning-u4ieuq`. The master plan names `feature/react-dashboard`; the harness-managed cloud session cannot create or push that branch, so the human approved this single exception (branch name only). All other requirements stand. Do not rename the branch. Future milestones return to the master-plan naming.
**Baseline:** `main` = `origin/main` = `1f3d63f1fa8a882a91b82014c503f15659b77471` (verified equal to the live remote; clean tree). `1f3d63f` is the separately committed local demo-tooling (`scripts/dev-demo/`, no application code) layered on the M07 handoff `6620340`; it is accepted as project history and is not rewritten.
**Prerequisite:** M07 merged and pushed.

## Objective
Replace the `/dashboard` placeholder with the live React dashboard, matching the Angular dashboard's layout, copy, section order, responsive proportions and status semantics, using the existing M05 `dashboardApi`, `queryKeys.dashboard()`, QueryClient and the M06 session context. Read-only: no mutations.

## Audited sources (read-only)
Angular `features/dashboard/**` (page, header, stats, expirations, CE progress, recent activity, mappers, helpers), `features/drawers/**` list drawer, `services/dashboard.service.ts`; backend `DashboardController`, `DashboardServiceImpl`, `Dashboard*Dto`, `CredentialResponseDto`; React `core/api`, `core/query`, `core/auth`, `shared/ui`, `shared/layout`, e2e helpers.

## Backend contract (unchanged)
`GET /api/dashboard` → `{ stats{totalCredentials, activeCount, expiringSoonCount, expiredCount, needsCEAttentionCount}, upcomingExpirations[] (days 0..90 inclusive, expiration asc; equals the EXPIRING_SOON set), ceAttention[] (required>0 && earned<required; expiration asc then ceProgress asc; includes expired), recentActivity[]{id, credentialId, title, subtitle, icon(PrimeIcons class), activityDate} (unbounded; date desc) }`. Status uses the server date; "Nd left" uses the browser's local date. 401 only via the entry point/exception handler. No backend change is needed.

## Approved decisions (human, 2026-11-02)
1. Scope: header (eyebrow, h1, description, greeting, long date), four stat cards, Upcoming Expirations (3 rows + "See N more expirations"), CEs Still Needed (3 rows + "See N more pending CE items"), Recent Activity (cap 4), loading skeleton, error + Retry, empty-account state, `DrawerShell` list drawers for panel overflow, rows linking to `/credentials?credentialId=<id>` (the contract's route; the detail drawer is M09).
2. **Temporary intentional parity deviation:** the Add Credential and Add CE Record buttons are omitted until M09/M10 provide their dialogs; no extra credentials API call is made.
3. Approved improvements: real CE-attention count in the CE panel header (Angular showed the sliced count); CE hours formatted to at most two decimals; existing `--ut-muted`/status tokens (instead of Angular's hard-coded greys); status-specific stat-card styling from existing tokens; semantic `<a>` rows instead of buttons wrapping headings; Lucide icon mapping with safe fallback (the server's `pi pi-*` class string is never rendered); document title `Dashboard — UpTrack`; accessible labels for statistics and progress; 44px touch targets.
4. Preserve caps (panels 3, activity 4); do not mutate DTO arrays; no unsupported metrics.
5. Data: `dashboardApi.get({ signal })` under `queryKeys.dashboard()`; no placeholderData/keepPreviousData/initialData/manual cache writes/persisted data/custom retry (M05 policy: HTTP 5xx twice). Background refetch failure keeps the loaded data (same session) with a non-blocking Retry alert; cache reset on logout/401/account change leaves no data (renders loading).
6. Session isolation gate: tests for logout in flight, late response, 401, A→B (unmounted and mounted), cancellation/cache cleanup, StrictMode. No M06 store/context changes; a stale-data failure stops the milestone for review (no pre-authorized epoch addition).
7. Existing-test fallout may be updated only to preserve each test's purpose: shell/shared-UI/visual tests move to `/settings` (where the dev-only shared-UI preview now renders); tests that render `/dashboard` add a mocked `GET /api/dashboard` through the default-deny fixture. The known M04 ArrowDown test (`e2e/app-shell.spec.ts:5`) is NOT modified. Historical visual baselines are not regenerated; failures stop for approval.
8. Evidence: new M08 candidate screenshots are review evidence only. Authoritative visual verification is Edge/macOS; Chromium/Linux captures are not equivalent.

## Acceptance criteria (Given/When/Then)
1. Given an authenticated user with data, When `/dashboard` loads, Then the four stats, expirations, CE needed and recent activity equal the API response (3/3/4 caps) with Dashboard active in the shell and title `Dashboard — UpTrack`.
2. Given the request is pending, Then an accessible loading state shows and no metrics/greeting are fabricated.
3. Given `totalCredentials === 0`, Then zero metrics and "No credentials yet" guidance show and no alert.
4. Given a network/5xx/403/404 failure with no data, Then an alert with Retry shows, Retry refetches, and the session is not ended; 5xx is retried twice first.
5. Given a background refetch fails while data exists, Then the data remains with a non-blocking Retry alert.
6. Given a protected 401, Then the M06 session ends and routes to the login dialog for `/dashboard` with no dashboard error flash.
7. Given logout, A→B switching (mounted or not), or a late A response, Then no A data is rendered or cached for B.
8. Given more than three expirations/CE items, Then "See N more …" opens a `DrawerShell` list; Esc closes it and focus returns to the opener; rows deep-link to `/credentials?credentialId=`.
9. No horizontal overflow at 375/768/769/1280 px in light and dark; stat grid 4/2/1 columns (>1200/769–1200/≤768); targets ≥44px; keyboard reachable rows with visible focus.
10. M04–M07 behavior is unchanged apart from the approved test fallout; typecheck, lint, unit, build, audit results are recorded honestly (browser/visual limits recorded as NOT RUN/BLOCKED).

## Commands to verify
`npm ci` (locked, no manifest change), `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`, `npm audit`, `npm audit --omit=dev`.

## Out of scope
M09 credential CRUD/detail drawer, M10 CE CRUD/uploads, M11 reports, M12 settings, M13/M14; backend/Angular/auth/token/routing-contract/dependency changes; demo-tooling changes; reseeding; hosted backend contact.

## Completion report
`context/migration/verification/m08-report.md`
