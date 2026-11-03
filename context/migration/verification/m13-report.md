# M13 verification report — Comprehensive regression and acceptance

Status: **COMPLETE — conclusion: CONDITIONALLY READY** (see §10)
Agent / model / session: Claude Code (Sonnet 5.5), autonomous M13 session
Date / branch: 2026-11-03 / `feature/react-acceptance` (created from synchronized `main` = `origin/main` = `01c70a5`, ahead/behind 0/0)
Spec: `specs/m13-cross-feature-parity-and-security-regression.md` was a DRAFT outline; this run followed the owner's M13 brief of 2026-11-03 (verification milestone, fix P0/P1 and narrow P2 only).
Preconditions: M12 (`763d36d`, `01c70a5`) is an ancestor of `main` and `origin/main`. Note: the tracker still labelled M10–M12 "unmerged / In progress"; git history shows all three merged (tracker corrected in this milestone).

## 1. Scope and safety record
- Hosted backend never contacted. Port 8080 never used (an unrelated Java app owns it; it was not touched). The pre-existing demo backend on 18080 and the shared `uptrack_migration_test` database were **not** used for writes: before/after row counts are identical (users 5, credentials 13, ce_records 20).
- Disposable target created for this milestone (local only): PostgreSQL database `uptrack_m13_acceptance`, owner role `uptrack_m13` (non-superuser, no createdb/createrole, `CONNECT` revoked from PUBLIC), backend `spring-boot:run` on **18081** with JDK 21 and a throwaway JWT secret held outside the repo, frontend Vite on **5180** proxied to 18081 only.
- Wiring proof before authenticated traffic: `pg_stat_activity` showed the backend's 10 pooled sessions as `uptrack_m13_acceptance`/`uptrack_m13`, and `lsof` showed the PID listening on 18081. Hibernate created `users`, `credentials`, `ce_records` in that database.
- Limitation: local PostgreSQL uses trust authentication, so the role cannot be *prevented* from connecting to `uptrack_migration_test` (default PUBLIC grant); isolation relies on the backend's JDBC URL, which was verified.
- **Disclosure (unintended outbound calls):** the backend runs with placeholder Cloudinary credentials. Two of my live API probes reached the Cloudinary code path and therefore made outbound API calls to Cloudinary with the placeholder cloud name/keys and synthetic data (a 2-byte `MZ` payload on upload; one `destroy` for a fake public id on CE delete). No real credentials or user data were sent, nothing could have been stored, and the probes were removed/restructured so the committed tests never reach Cloudinary. The disposable DB, role and backend were removed after acceptance (see §12).
- Synthetic accounts only (`*@example.test`, random per-run suffix, throwaway passwords not recorded here). No demo account was modified.

## 2. Commands and results (exact)

| # | Command (from `frontend-react/`) | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 (baseline and final) |
| 2 | `npm run lint` | exit 0 (baseline and final) |
| 3 | `npx vitest run` (baseline, before changes) | **543/543** passed, 39 files |
| 4 | `npm run build` (baseline and after changes) | exit 0; only the existing >500 kB chunk warning; `/preview` content absent from `dist` (grep for "Shared UI preview" = 0 files) |
| 5 | `npx playwright test` (all projects; baseline, before any change) | **537 passed, 3 failed**, 540 total, 5.8 min. Functional: 536/536 across msedge/chrome/firefox/webkit (134 each). `visual-edge`: 1/4 tests passed, 3 failed — see §6 (stale goldens; since reviewed and regenerated, row 9) |
| 6 | `npx vitest run` (final, after changes) | **556/556** passed, 40 files (543 + 13 new) |
| 7 | `npx playwright test --project=msedge --project=chrome --project=firefox --project=webkit` (final full functional regression; justified because the dashboard header, which every `/dashboard` spec with default-deny API mocking touches, changed) | **532 passed, 4 failed** of 536 (5.8 min). The 4 failures were regressions caused by D-02 and are fixed (D-06). After the fixes only the affected specs were re-run: `landing.spec.ts:114` and `auth.spec.ts:123` on all four browsers 8/8, plus `auth.spec.ts:123` WebKit ×30 repeats 30/30. **A second clean full run was not performed**, so 536/536 is not claimed for the final tree |
| 8 | `npx playwright test --project=visual-edge` (after harness wait fix) | 1 passed / 3 failed (goldens stale at that point) |
| 9 | `npx playwright test --project=visual-edge --update-snapshots`, then `npx playwright test --project=visual-edge` (clean, no update) | Six stale goldens reviewed and regenerated (commit `83cfeba`); the clean re-run passed **4/4** without updating snapshots |
| 9 | `node --test e2e-live/api-live.test.mjs` (real Spring Boot → PostgreSQL) | **10 passed, 0 failed, 1 todo** (documented known P3 defect) |
| 10 | `npx playwright test -c playwright.live.config.ts` (Edge, real React → Spring → PostgreSQL) | **13/13 passed** |
| 11 | `npm audit --omit=dev` / `npm audit` | production: **0 vulnerabilities**; full tree: 16 (14 moderate, 2 critical), all dev/test tooling (see §7) |
| 12 | Backend `./mvnw test` | **NOT RUN** (no backend change in M13; last recorded 90/90 in S02) |

Not run: installed Safari/VoiceOver, Linux/Windows, mobile-emulated projects, Cloudinary upload success, hosted environment.

## 3. Angular → React parity assessment

Routes were compared against `frontend/src/app/app.routes.ts`: `/`, `/app*` redirects (preserving query), `/dashboard`, `/credentials`, `/ce-records`, `/settings`, `/credentials/:id/ce-report` (standalone, outside shell), `**`→`/` all map 1:1, with guest/authenticated redirects and `returnTo` handling covered by tests and live runs.

| Area | Result | Evidence |
|---|---|---|
| Landing, login, register, logout, session restore | **Parity** | live: register→hashed BCrypt row, duplicate-email banner, login/logout, reload restore, tampered token → login dialog with token removed; mocked: deep link `returnTo`, outage retry, 401 mid-session |
| Dashboard | **Parity after fix** | Angular header offers *Add CE Record* (disabled with no credentials); React omitted it (M08 deviation carried to M10 but never delivered). Fixed in M13 (D-02). Stats, panels, drawers verified live and mocked |
| Credentials list/filter/create/edit/delete | **Parity** | live UI→PostgreSQL create/edit/search/status filter/delete with DB assertions; API filters verified |
| CE records list/filter/create/edit/delete, drawer | **Parity** | live create (two), edit, delete, dashboard-initiated create; DB sums verified |
| Certificate upload/download | **Parity by tests; live upload NOT RUN** | multipart + error paths covered by mocked specs on four browsers; upload success needs real Cloudinary (not authorized). Link rendering hardened (D-01) |
| CE report + print | **Parity** | live report totals match server calculation (earned 6.5, remaining 1.5); `window.print` invoked; print CSS covered by e2e |
| Settings: profile, password | **Parity** | live: trimmed name persisted, duplicate email (409) surfaced, wrong current password rejected, success, old password rejected, new accepted |
| Navigation, protected routes, deep links | **Parity** | `?credentialId=` / `?recordId=` consumption, foreign id → "Credential not found" with no data |
| Responsive, dark mode, accessibility | **Parity by automated checks** (4 browsers; breakpoints 375/768/769/1280; keyboard/focus/overlay specs; jsx-a11y lint) | manual assistive-technology review remains outstanding (pre-existing limitation) |
| Error / loading / empty states | **Parity** | skeletons, retry, 5xx retry policy, empty states all covered by passing specs |

Residual intentional deviations (unchanged from earlier approved milestones): Lucide icons, token colours, semantic links, hours ≤2 decimals.

## 4. Real-backend integration results (closes M09-W01)

**M09-W01 (live PostgreSQL credential create/edit/delete) is now exercised and PASSED** against the disposable database, using a procedure matching the follow-up: separate database and role, separate backend port (18081 rather than the proposed 18081 — identical), separate frontend proxy, wiring verified via `pg_stat_activity`, synthetic data, persisted values asserted directly with SQL, cache freshness checked after navigation/reload. Also covered: CE CRUD (M10) and report rendering (M11), profile/password (M12).

API level (`e2e-live/api-live.test.mjs`): health; register/duplicate/validation; login failures; `/me`; missing, garbage, tampered-signature and `alg:none` tokens all 401 on every protected endpoint; credential CRUD with ACTIVE/EXPIRING_SOON/EXPIRED derivation, status/type/search filters, 400 validation matrix; CE CRUD, validation matrix, certificate metadata ownership (`uptrack/users/<id>/certificates/` prefix enforced; foreign or incomplete metadata → 400); report math including remaining-hours clamp at 0; dashboard aggregates; **cross-account isolation** (B receives 404/403 for every read/update/delete/create-under-foreign-credential/re-parent attempt on A's data, error bodies leak nothing, A's data intact); profile normalisation; password change semantics; upload auth + pre-Cloudinary validation; credential delete cascades CE rows.

Browser level (`e2e-live/*.live.spec.ts`, Edge): all of §3's live rows plus: SPA account switch without reload shows no stale TanStack data; B opening A's report/credential by URL sees nothing; console errors none beyond expected 4xx resource lines.

## 5. Security and account-isolation assessment
- **Isolation:** no cross-account leakage found at API or UI level; session replacement clears cached data (live A→B→A switches).
- **Authn/authz:** forged/tampered/`alg:none`/missing tokens rejected; expired/invalid stored token → login dialog and token removed; protected routes redirect guests with sanitized `returnTo`.
- **Sensitive data:** only `localStorage['uptrack_token']` plus theme/sidebar preferences persisted; no `console.*` logging in app code; backend log contained no passwords, bearer tokens or JWTs for the whole run; `password` never appears in auth/profile responses; passwords stored as BCrypt.
- **Dev-only routes:** `/preview` is `import.meta.env.DEV`-gated; production `dist` contains no preview content.
- **Uploaded certificates:** React validates type client-side; backend validates by content type **or** extension (see F-02) and enforces per-user asset folder. Link rendering hardened (D-01).
- **Password change:** correct current password required, differs-from-current enforced, hash changes, old password stops working. Known/documented risk unchanged: tokens issued before a password change stay valid (no revocation) — the pre-change token still returned 200.
- **Known documented risks (unchanged):** XSS-readable token in `localStorage`; no server-side logout/revocation.

## 6. Defects found and fixes made

| ID | Pri | Finding | Root cause | Change | Verification |
|---|---|---|---|---|---|
| D-01 | P2 | `data:` (and other non-http) `certificateUrl` values were rendered as `<a href>`; Angular's sanitizer neutralised these. (React already blocks `javascript:`.) Self-only data, modern browsers block top-level `data:` navigation, so low exploitability | React does not sanitize hrefs; backend accepts any ≤500-char string for the owner's record | `src/lib/safe-url.ts` (`safeHttpUrl`, http/https only) applied in CE detail drawer and CE form; unsafe values show "Certificate link unavailable" | 13 new unit tests; live spec `certificate-url.live.spec.ts` failed before (href `data:text/html,…`) and passes after for `javascript:` and `data:`; `ce-records`/`ce-report` e2e pass on 4 browsers |
| D-02 | P2 | Dashboard lacks *Add CE Record* (Angular parity gap; M08 carry-forward missed by M10) | M08 deviation never closed | Header renders `AddCERecordAction` fed by `useCredentials({})` inside `CERecordSessionBoundary`; disabled until a credential exists; placed before *Add Credential* as in Angular | New unit test (disabled → enabled → opens dialog); updated three assertions that encoded the omission (`dashboard-page`, `dashboard-session`, `credentials-page` unit; `dashboard.spec`, `credentials.spec` e2e) — expectation changed because behaviour intentionally changed, not weakened; live: dashboard-initiated CE persisted and dashboard refreshed |
| D-03 | P3 (test harness) | `visual.spec.ts` captured the "Loading presentation preview" Suspense fallback | commit `01c70a5` moved the preview to a lazily loaded `/preview`; the spec only waited for the heading | added `toHaveCount(0)` wait for the fallback in both visual tests | Capture now shows the loaded preview; remaining diffs are D-04 |
| D-04 | P3 (**resolved**) | 3 of 4 `visual-edge` tests failed | Goldens were captured when the page title was "Settings" and the copy said "reserved for M12"; `/preview` now shows "Shared UI preview". Pure heading/copy drift on a dev-only page, not a rendering defect (side-by-side inspected) | Each golden was inspected against its actual/diff image (layout, sidebar, collapsed rail, mobile drawer, modal, light/dark theming); only heading/banner copy differed. Six goldens (`shell-{light,dark}-{desktop,collapsed}`, `shell-light-mobile-navigation`, `modal-light-mobile`) regenerated in `83cfeba`; the other two were already in sync | Clean `visual-edge` run 4/4 with no snapshot update; no genuine visual regression found. Cosmetic P3 left: the dev-only preview banner still says "Authentication will be added in M06" / "feature not implemented" |
| D-06 | P3 (test harness; found by final run) | `landing.spec.ts:114` (3 browsers) and `auth.spec.ts:123` (WebKit, ~25–40% of runs) failed after D-02 | Default-deny API fixture rejected the new `/api/credentials` read on `/dashboard` (landing spec lacked the mock); in the auth spec, navigating away while dashboard reads were in flight made WebKit log aborted-fetch "access control checks" errors, which the harness treats as browser errors (15/15 pass before D-02, ~4/15 after) | `landing.spec.ts`: `mockCredentialReads`; `auth.spec.ts`: wait for `networkidle` before the next navigation | 8/8 across four browsers; WebKit ×30 repeats 30/30 |
| D-05 | P3 (tooling) | `vitest` and `eslint` picked up the new `e2e-live` files | config scope | `vitest.config.ts` excludes `e2e-live/**`; `eslint.config.js` gives `e2e-live/**/*.mjs` Node globals | typecheck, lint, 556/556 unit pass |

No P0 or P1 defects were found.

## 7. Dependency vulnerabilities (separate from the code review)
- `npm audit --omit=dev`: **0** (React production build unaffected).
- `npm audit` (full): 16 — 14 moderate, 2 critical (tinypool prototype pollution via vitest 3.x). All are Vitest/Vite/Playwright-era dev tooling that never ships in the production bundle and is not run on untrusted input; the fix is a breaking vitest 5 upgrade (not attempted, per scope). Unchanged since S03/M09.
- Backend/Angular dependency posture: see `dependency-security-assessment.md` and `s02`/`s03` reports; no dependency changed in M13. Open Dependabot branches were left untouched.

## 8. Outstanding follow-up disposition

| Follow-up | Disposition |
|---|---|
| M09-W01 live PostgreSQL credential writes | **Closed — passed** (§4) |
| M10 CE workflows / M11 report rendering live checks | **Passed live** except certificate **upload success / Cloudinary cleanup** (requires real Cloudinary credentials: NOT RUN) |
| M08 dashboard Add CE Record carry-forward | **Closed** (D-02) |
| Edge/macOS visual goldens | **Closed** (D-04; `83cfeba`, clean 4/4) |
| Real Safari/VoiceOver, mouse-open overlay focus return in WebKit | Open (pre-existing, NOT RUN) |
| JWT risks (localStorage token, no revocation, token valid after password change) | Open, documented, accepted until after cutover |
| Vitest critical dev advisories | Open, dev-only (§7) |
| Hosted backend (S01/S02/S03 fixes undeployed) | Out of M13 scope — M14 decision |

## 9. Known limitations and deferred findings (post-cutover backlog)
- **F-01 (P3, backend):** unparseable enum/date JSON values (`type:"NOPE"`, `expirationDate:"not-a-date"`) return HTTP 500 instead of 400 (`HttpMessageNotReadableException` is unhandled). Unreachable from the React UI (select/date inputs). Recorded as a `todo` in `api-live.test.mjs`. Backend changes are out of M13 scope.
- **F-02 (P3, backend, security-adjacent):** upload validation accepts a file when *either* content type *or* extension is allowed; both are client-controlled, so a non-document can be stored under an allowed content type (stored in a per-user Cloudinary folder; not served from the app origin). Pre-existing contract; consider requiring both. Found by code review; the live probe was deliberately not repeated after it reached Cloudinary (§1).
- **F-03 (P3):** deleting or replacing a CE certificate calls Cloudinary *before* the DB change; if Cloudinary fails the user gets 502 and cannot delete the record. Pre-existing Angular-era behaviour.
- **F-04 (P3):** duplicate registration returns 400, not 409 (contract preserved; UI handles it).
- **F-05 (P3):** foreign/unknown credential id deep link shows a drawer with a "Retry" button for a permanent 404.
- **F-06 (P3 cosmetic):** router `hydrateFallbackElement` still reads "Loading migration preview"; the unreachable `AccountMenu` fallback and `/preview` copy ("Authentication will be added in M06") are leftovers.
- **F-07 (tracker):** `migration-status.md` and `feature-inventory.md` carried stale M10–M12 states; corrected for M10–M13 in this milestone.
- Cloudinary upload success and asset deletion: NOT RUN against a real account.
- Cross-browser breadth: Edge/Chrome/Firefox/WebKit engines on macOS only; live browser suite ran in Edge only.

## 10. Final M14 cutover readiness recommendation

**CONDITIONALLY READY.** No unresolved security, data-integrity or essential-workflow defects remain; the real React → Spring Boot → PostgreSQL path passed for authentication, credential CRUD, CE CRUD, report calculations, profile/password and cross-account isolation. M14 may proceed after owner approval **provided the owner accepts or completes these explicit, non-blocking conditions (visual acceptance is complete and the disposable environment has been cleaned up; neither remains a condition):**
1. Perform one real-Cloudinary certificate upload/download/delete check in a non-production environment (or explicitly accept that this is unverified).
2. Accept the documented JWT and backend P3 items (F-01–F-06) as post-cutover follow-ups. Deployment of the S01–S03 backend fixes remains a separate M14 decision.

## 11. Files changed (application/test) and commits
See the handoff; summary: `src/lib/safe-url.ts(+test)`, `ce-record-detail-drawer.tsx`, `ce-record-form.tsx`, `dashboard-header.tsx`, dashboard/credentials unit tests, `e2e/{dashboard,credentials,visual}.spec.ts`, `vitest.config.ts`, `eslint.config.js`, new `e2e-live/` (API + browser live specs), `playwright.live.config.ts`, tracker/handoff/report documents. No backend, Angular, schema or dependency change.

## 12. Disposable resources — removed
Cleaned up on 2026-11-03 under explicit owner authorization, after positively identifying each resource:
- Backend on port **18081** (PID verified as the project's `BackendApplication` run from `backend/target/classes`, with all 10 pooled sessions on `uptrack_m13_acceptance`/`uptrack_m13`) stopped with SIGTERM; the port is free.
- Database `uptrack_m13_acceptance` dropped.
- Role `uptrack_m13` dropped (it owned only that database; no dependencies or memberships elsewhere).
- Verified untouched: the normal backend on port **18080**, the shared database `uptrack_migration_test` (owner `uptrack_m01`, still 5 users, its connections intact), all other databases, and port 8080. No Vite was running on 5180.
- Not removed: throwaway env/password files in the session scratchpad (outside the repository).
- To recreate for a rerun (infrastructure no longer exists): start the backend with `SERVER_PORT=18081`, the disposable `DB_URL/DB_USERNAME`, a random `AUTH_JWT_SECRET`, placeholder Cloudinary values and `ALLOWED_ORIGIN_PATTERNS=http://localhost:*`; then `LIVE_API_BASE=http://localhost:18081/api node --test e2e-live/api-live.test.mjs` and `npx playwright test -c playwright.live.config.ts` (the live spec reads SQL from `LIVE_DB`, default `uptrack_m13_acceptance`, and refuses the shared demo DB, port 8080 and non-loopback targets).

## 13. Attempts and interventions
- Prompt iterations: 1 (owner brief). Human corrections: 0.
- Agent failed attempts: live test-harness assumptions corrected (duplicate registration is 400; DB column naming `requiredcehours`; dual "Add CE Record" buttons; option label format; foreign-id drawer must be closed before logout); `vitest`/`eslint` scope after adding `e2e-live`.

## 14. Review and approvals
- Approval to commit: granted by the M13 brief for local commits on `feature/react-acceptance` only.
- Approval to push / merge / delete branch / deploy / start M14: **not granted** — owner decision.
