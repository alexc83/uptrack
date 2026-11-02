# M08 verification report

**Status: IMPLEMENTED; automated verification COMPLETE on macOS/Edge (112/112 browser tests incl. all 8 visual comparisons; 421/421 unit; typecheck/lint/build pass). Live backend/demo-account acceptance PENDING. Not merged; merge authorization withheld until the live demo check.** (Original cloud-sandbox status below is retained as history and is superseded by the "macOS/Edge verification results" section.)

Agent / model / session: Claude Code (Claude Sonnet 5.5), cloud session, 2026-11-02.
Branch: `claude/m08-dashboard-planning-u4ieuq` — **approved one-time exception.** The master plan and original spec name `feature/react-dashboard`; the cloud session is pinned to the harness-managed branch and cannot create/push the approved name, so the human approved this branch for M08 only (branch name only; every other requirement stands). Do not rename it. Later milestones return to the master-plan naming.
Base: `main` = `origin/main` = live remote = `1f3d63f1fa8a882a91b82014c503f15659b77471`, ahead/behind 0/0, clean tree at start. `1f3d63f` is the separately committed local demo-tooling (`scripts/dev-demo/`, 3 files, no application code) layered on the M07 handoff `6620340`; it is accepted project history and was not touched or rewritten.
Spec: `specs/m08-dashboard.md` (promoted DRAFT → READY with the approved decisions).

## What was built

`frontend-react/src/features/dashboard/`: `use-dashboard.ts` (read-only `useQuery` on `queryKeys.dashboard()` calling `dashboardApi.get({ signal })`; no placeholder/initial data, manual cache writes or custom retry), `dashboard-view.ts` (pure mapper; never mutates DTO arrays), `dashboard-page.tsx` (state switch, title `Dashboard — UpTrack`, drawer state), `dashboard-header.tsx`, `stat-cards.tsx`, `expirations-panel.tsx`, `ce-needed-panel.tsx`, `recent-activity-panel.tsx`, `credential-list-drawer.tsx` (existing `DrawerShell`), `dashboard-skeleton.tsx`, `tone.ts`. Route `/dashboard` is now a lazy `DashboardPage`; other routes keep the placeholder.

Behavior: header (eyebrow, h1 "Live compliance overview", description, greeting with first name, long date); four stat cards (accessible `Label: value` groups; 4/2/1 columns at >1200 / 769–1200 / ≤768 px); Upcoming Expirations (3 rows, "See N more expirations", first-row accent, "{n}d left"/"Expired" pill, "{h} CE hrs still needed"); CEs Still Needed (3 rows, real attention total in the header, progress bars with `role=progressbar`, "See N more pending CE items"); Recent Activity (4 rows, relative labels, server `pi pi-*` icon mapped to Lucide with a safe fallback — the class string is never rendered); overflow list drawers (expirations "sorted by urgency", CE "lowest completion first"; Esc closes, focus returns to the opener); rows are `<a>` links to `/credentials?credentialId=<id>`; loading skeleton with one polite status; error + Retry; empty-account guidance; background-refetch failure keeps the loaded data with a non-blocking Retry alert.

**Intentional omissions (temporary parity deviations):** Add Credential / Add CE Record buttons (and therefore the second `GET /credentials` call Angular made for the Add-CE options); in-place credential detail/CE detail drawers (M09/M10 — rows deep-link instead).

## Backend DTO and Angular parity findings

Source read: `DashboardController`, `DashboardServiceImpl`, `Dashboard*Dto`, `CredentialResponseDto`. No backend change is needed. Confirmed: `expiringSoonCount == upcomingExpirations.length` (same 0..90-day rule); `ceAttention` includes expired credentials; `recentActivity` is unbounded (UI caps 4); subtitle always says "(PDF)" (B5, preserved); status uses the server date while "{n}d left" uses the browser date (unchanged from Angular; can differ by a day near midnight or across timezones).

| Angular behavior | React result |
|---|---|
| Layout/section order/copy/caps (3/3/4), tones, relative labels, greeting boundaries (12/18) | Preserved (unit-tested) |
| Add Credential / Add CE Record buttons | Omitted (approved, temporary) |
| Rows are `<button>` wrapping headings (F7) | `<a>` links (approved) |
| CE panel header "N items" used the sliced array (max 3) | Real count (approved) |
| Hours via raw JS subtraction (`8-3.3` → float noise) | ≤2 decimals (approved) |
| Hard-coded greys (`#7a889d`, ≈3.6:1) | `--ut-muted` token (approved) |
| Error hides stats/panels | Same for first-load failure; data kept for background failure (approved) |
| Dashboard sorted `ceAttention` in place (mutation) | Copies only |
| Dashboard "Expired" badge branch unreachable (F4) | Kept (harmless, unit-tested) |
| `needsCEAttentionCount` not shown (F5) | Used for the CE panel total |

## Query cache and session isolation

Cache holds the raw DTO under the shared key; the 30 s `staleTime` and 5xx-only (×2) retry are inherited (a test asserts the query's `retry` is the client default). The page is read-only: no mutation, no `setQueryData`, no `captureSession().isCurrent()` obligation (a test asserts no mutations and a single dashboard query in the cache). No M06 store/context/transport code was modified.

`src/features/dashboard/dashboard-session.test.tsx` (10 tests, all PASS):

| Scenario | Result |
|---|---|
| Logout during in-flight request: request signal aborted, late A response dropped, A text never in DOM (MutationObserver), cache empty | PASS |
| Logout after load clears cache, no repaint | PASS |
| Protected 401: login dialog for `/dashboard` with expired notice, no "Dashboard unavailable" flash, token/cache cleared | PASS |
| A → B via logout/login with A answering late | PASS (A never painted) |
| **A → B with the dashboard still mounted (`store.login` B)**: cache empty and loading shown while B pending, no A text at any point | **PASS — no stale-data leak; no stop condition triggered** |
| A's late response after B is shown while mounted is ignored | PASS |
| StrictMode: discarded first mount aborted, exactly one request completes | PASS (dev StrictMode makes 1 aborted + 1 live request; production makes one) |
| Observer released / query removed after reset | PASS |
| Read-only (no mutations, only the dashboard query cached) | PASS |

## Loading / empty / error / background-refetch behavior

Covered by `dashboard-page.test.tsx` (16 tests) and `e2e/dashboard.spec.ts`: loading (no metrics/greeting fabricated); success; empty account (zero metrics + guidance, no alert); network/5xx/403/404 with Retry recovery and no sign-out; background refetch failure keeps data and offers Retry; M05 retry observed in the browser (initial + 2 retries; +1 aborted request under dev StrictMode).

## Commands (exit codes and counts; environment: Linux cloud container, Node 22/npm 10.9, `npm ci` from the existing lockfile, no manifest/lockfile change)

| Command | Result |
|---|---|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | **FAIL 420/421** across 29 files — the single failure is `src/shared/ui/overlays.test.tsx` "restores pre-existing scroll styles and inert state after modal cleanup" (`expected '' to be 'scroll'`). **Pre-existing and unrelated:** it fails identically on the pristine baseline before any M08 change and with M08 tracked changes stashed (3 isolated runs). The M07 report recorded 361/361 on macOS, so this is a Linux/jsdom environment difference. Not modified. Baseline 361 → now 421 tests (+61 new dashboard tests; 1 obsolete `/dashboard` placeholder case removed from `router.test.tsx`). |
| `npm run build` | PASS (existing >500 kB chunk advisory only) |
| `npm run e2e` (configured Edge/macOS project) | **NOT RUN — BLOCKED**: no Microsoft Edge in the container; the 8 goldens are `*-msedge-darwin.png`. |
| Non-authoritative browser run (scratchpad config, Playwright Chromium 1243/Linux; `visual.spec.ts` deliberately excluded so no baselines could be written; project config unchanged) | **107/108 PASS** (final run, after the approved `app-shell.spec.ts` correction). 24 new dashboard tests, 30 landing, auth, shared-UI, theme and the other shell tests PASS. The single failure is `e2e/app-shell.spec.ts:5` at the **pre-existing, documented line-35 assertion** (`Settings` link `toBeFocused()` after ArrowDown in the account menu). Every assertion before it — including the corrected `/settings` + Dashboard-navigation steps — passes. The same assertion fails identically at line 35 on the pristine pre-M08 tree in this Linux environment (verified by stashing the M08 changes; 2 of 2 runs on pristine, 3 of 3 with M08), so it is the known keyboard-focus flake/failure, not an M08 regression. It was not weakened or modified. Not equivalent to Edge/macOS, where it passes on most runs. |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm audit` | exit 1 — 16 findings (14 moderate, 2 critical), all in the dev toolchain; 5 unique advisories with unchanged roots: `@vitest/mocker` GHSA-82fw-gwwq-j7x9 and GHSA-qxg6-89mg-rqv8 (via vitest), `minimatch` GHSA-g3hv-75wg-m249 (eslint/typescript-eslint tree: `@eslint/config-array`, `@eslint/eslintrc`, `@typescript-eslint/*`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`), `tinypool` GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr (critical; via vitest). Not remediated (separate approval). |

The pre-existing M04 ArrowDown flake did not occur in the run (it was not reached); it remains separate.

## Existing-test fallout (intent preserved, assertions not weakened)

- `src/app/router.test.tsx`: `/dashboard` removed from the placeholder `it.each` (now covered by `dashboard-page.test.tsx`).
- `src/core/auth/route-guards.test.tsx`: 7 tests that only needed some rendered protected page moved from `/dashboard` to `/settings`; guard tests that assert `returnTo=/dashboard` and the logout re-navigation to `/dashboard` were kept as they were. Dashboard routing, active nav, authenticated rendering, guest denial and legacy `/app/dashboard` are covered in `dashboard-page.test.tsx`; login redirect to `/dashboard` remains covered by `auth-dialog.test.tsx`/`auth.spec.ts`.
- `src/app/preview/shell-placeholder.tsx`: dev-only shared-UI preview now renders on `/settings`; `/dashboard` entry removed.
- `e2e/helpers.ts`: new `mockDashboard` (declares and mocks `GET /api/dashboard`; default-deny unchanged). `e2e/auth.spec.ts` (suite-wide empty-dashboard mock; four `heading 'Dashboard'` assertions → `Live compliance overview`), `landing.spec.ts` (mock for the authenticated-redirect test), `shared-ui.spec.ts`, `theme.spec.ts`, `visual.spec.ts` (→ `/settings`), `app-shell.spec.ts` (mobile test → `/settings`; redirect test gets `mockDashboard`; the ArrowDown focus assertion was not touched). **Human-approved narrow correction** to the protected test `app-shell.spec.ts:5`: `goto('/dashboard')` → `mockDashboard` + `goto('/settings')` (the dev-only shared-UI preview lives there), the initial `aria-current` check on Dashboard removed (Dashboard has no active item on `/settings`; the same assertion already runs for Dashboard inside the navigation loop), and the loop's h1 expectation for Dashboard is `Live compliance overview`. All navigation, scroll, persistence, account-menu and keyboard-focus coverage is preserved.

## Visual evidence and affected older baselines

New candidate screenshots (Chromium/Linux, review evidence only, **not goldens, not equivalent to Edge/macOS**): `verification/m08-evidence/chromium-linux-candidate-*.png` (15 files: populated 1280/769/768/375 light and dark, activity sections, empty, loading, error, drawers). The full 28-image set is regenerated by `e2e/dashboard.spec.ts` into `test-results/evidence/`.
Compared with the Angular evidence (`baseline/screenshots/d1-*, u3-*, p-dashboard-375, t1-*`): section order, copy, stat/panel proportions, 4/2/1 grid, accent row, pills, progress rows, drawer and dark theme match; known differences are the approved ones (no Add buttons, token tints/greys, link rows, heading scale from the shared `PageHeader`). Mobile panel layout has no Angular screenshot (the M01 mobile capture covers only the top of the page).

**Existing baselines affected: all 8** produced by `e2e/visual.spec.ts` (`shell-{light,dark}-desktop`, `shell-{light,dark}-collapsed`, `shell-{light,dark}-mobile-navigation`, `modal-{light,dark}-mobile`, all `*-msedge-darwin.png`). They were **not run, not regenerated and not modified**. Expected cause: the golden pages show the `/dashboard` placeholder (h1 "Dashboard", Dashboard nav active, "reserved for M08"). With the approved route move the same preview renders at `/settings` (h1 "Settings", no active nav item, "reserved for M12"). Chromium capture of that `/settings` page versus the golden (`shell-light-desktop`) shows exactly those differences plus platform font/wrap differences (e.g. the "Unavailable" button wraps on Linux) that cannot be attributed to M08. No unrelated layout, theme or navigation change was observed. **Stop for screenshot-update authorization** and for the macOS/Edge run.

## Local-backend verification

**BLOCKED.** No PostgreSQL (5432) or backend (8080/18080) is listening in the cloud container (only the e2e Vite server on 5173 and harness ports), so the isolated `uptrack_migration_test` target could not be confirmed and no request was made. No database, seed script, demo account or hosted backend was touched. Expected values for the three synthetic accounts and the reproducible procedure are below.

## Local verification handoff (macOS/Edge and live demo)

1. `cd frontend-react && npm ci && npm run typecheck && npm run lint && npm run test && npm run build`.
2. `npm run e2e` (Edge/macOS). Expect the 8 `visual.spec.ts` comparisons to fail against the old goldens for the reasons above; inspect each actual/expected pair, then (with separate approval) update with `npx playwright test e2e/visual.spec.ts --update-snapshots`. `app-shell.spec.ts:5` is corrected (approved); its ArrowDown assertion remains the known intermittent flake.
3. Live demo (read-only): start the local backend with `DB_URL=jdbc:postgresql://localhost:5432/uptrack_migration_test`, confirm with the README `pg_stat_activity` probe that only that DB is used, `VITE_PROXY_TARGET=http://localhost:<port> npm run dev`, log in as `demo-main@example.test` (expect, at seed time: total 4, active 2, expiring 1, expired 1, 2 needing CE; Upcoming: ACLS; CE needed: ACLS then RN 15.5/20 = 78%; 6 activity items, 4 shown), `demo-empty@example.test` (zeros + empty banner), `demo-second@example.test` (1 active credential needing CE, 2 activity items). Compare the UI with the same-run `GET /api/dashboard` payload (statuses drift as dates pass). Do not reseed. "See more" overflow cannot be exercised by these accounts (covered by mocked tests).

## Defects, differences, security notes

- No new security issue found. The page renders only text from the API (React-escaped); server icon class strings are mapped through a whitelist; links use `encodeURIComponent` on ids; no new storage, tokens or network targets.
- Known preserved server quirks: "(PDF)" subtitle for every certificate (B5); unbounded `recentActivity`; server-date vs browser-date day count.
- `overlays.test.tsx` Linux failure (above) is pre-existing and unrelated.
- Outstanding M09/M10 integration: credential detail drawer on `/credentials?credentialId=`; dashboard Add Credential / Add CE actions; mutations should rely on existing `['dashboard']` invalidation and guard cache writes with `captureSession().isCurrent()`.

## Complete changed-file inventory (uncommitted)

Modified (18): `context/current-feature.md`; `context/migration/{agent-handoff,feature-inventory,master-plan,migration-status}.md`; `context/migration/specs/m08-dashboard.md`; `context/migration/verification/m08-report.md`; `frontend-react/e2e/{app-shell,auth,landing,shared-ui,theme,visual}.spec.ts` and `frontend-react/e2e/helpers.ts`; `frontend-react/src/app/router.tsx`, `router.test.tsx`, `preview/shell-placeholder.tsx`; `frontend-react/src/core/auth/route-guards.test.tsx`.
New: `frontend-react/src/features/dashboard/` (11 source files, 4 test files, 1 test-utils file), `frontend-react/src/test/fixtures/dashboard-fixtures.ts`, `frontend-react/e2e/dashboard.spec.ts`, `context/migration/verification/m08-evidence/` (15 PNGs).
Untouched: `backend/`, `frontend/`, `package.json`, `package-lock.json`, M05/M06 code, `scripts/dev-demo/`, historical reports/baselines/evidence, all 8 visual goldens.

## Attempts and interventions

- Prompt iterations: 3 (plan, authorization, branch exception). Human corrections: 0 after authorization. Agent fix iterations: type/lint fixes in new tests, one StrictMode expectation and one dev-StrictMode request-count expectation corrected after observing real behavior (no weakening of product assertions).

## Review and approvals

- Two checkpoint commits and a push to `claude/m08-dashboard-planning-u4ieuq` only: approved (2026-11-02). Merge, push to `main`, branch deletion: not granted. Screenshot-baseline update: not granted. Narrow `app-shell.spec.ts:5` correction: approved. Playwright project config unchanged.

## macOS/Edge verification results (2026-11-02, branch `m08-review`)

Results: typecheck, lint, build pass; unit 421/421; Playwright Edge **112/112** (24 M08 dashboard tests, all 8 `visual.spec.ts` comparisons without update mode). Live backend/demo-account acceptance was **not** performed and remains pending (procedure above); no backend, database or demo data was contacted.

Initial macOS run: 107/112. Remaining failures and root causes (all test-only; no application defect):

1. **`theme.spec.ts:29` (pre-paint script without React, 3 paths).** The test aborted `**/src/main.tsx`, but Vite serves the entry as `/src/main.tsx?t=<timestamp>`; the glob does not match a query string, so the request was never aborted and React mounted. Fix: route regex `/\/src\/main\.tsx(\?.*)?$/` plus a counter asserting at least one request was intercepted. The `html.dark`, body background and empty-`#root` assertions are unchanged.
2. **`visual.spec.ts` (4 comparisons failed first).** Expected consequence of the approved `/dashboard` → `/settings` move. Seven baselines regenerated with `--update-snapshots=changed` after inspecting expected/actual/diff: `shell-{light,dark}-desktop`, `shell-{light,dark}-mobile-navigation`, `shell-{light,dark}-collapsed`, `modal-light-mobile` (all `*-msedge-darwin.png`). `modal-dark-mobile` did not change. Differences are limited to h1 "Dashboard" → "Settings", banner "reserved for M08" → "reserved for M12", and the active Dashboard nav highlight removed (changed-pixel bounding boxes all within y ≈ 50–242; changed pixels vs committed: 18,718 / 18,719 / 13,430 / 13,430 / 9,102 / 9,101 / 2,939). Layout, spacing, typography, theme, sidebar width and the `Test User / test.user@example.test` identity are unchanged. No UI regression.
3. **`app-shell.spec.ts:5` ArrowDown (the known intermittent M04 flake; failed deterministically in the full macOS runs, 3/5 on a clean server).** Opening the account menu from the keyboard makes floating-ui asynchronously autofocus the first item (Settings). The old assertion (ArrowDown → Settings focused) only passed when the keypress beat the autofocus. It was valid pre-M06 because Log out was disabled; with Log out enabled (M06), ArrowDown correctly moves focus to it. Diagnosed with a scratch spec (focus after open = Settings; after ArrowDown = Log out, with and without a 300 ms delay). Not an accessibility defect. Fix: await Settings focused after open, ArrowDown → Log out focused, ArrowUp → Settings focused, then Enter navigates to `/settings`. The ArrowDown requirement is strengthened, with no sleeps. 15/15 passes on a clean Playwright-managed server.

Test files changed: `e2e/theme.spec.ts`, `e2e/app-shell.spec.ts`, plus the seven PNGs. No application code, dependency, backend, Angular or demo-data change.
