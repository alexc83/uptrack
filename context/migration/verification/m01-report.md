# M01 verification report

Status: **COMPLETE EXCEPT successful certificate upload (NOT RUN) — documentation, build/test, API-level and browser runtime baselines executed; findings recorded, nothing fixed. Awaiting your review before any commit approval.**
Agent / model / session: Claude Code, Sonnet 5.5 (claude-sonnet-5-5), session of 2026-10-31
Date / branch / commit: 2026-10-31 / `chore/react-migration-planning` / base `9769237` (uncommitted)
Spec version / approved changes: M01 rev 2 (READY); human approval with conditions 1–9 recorded in the spec

## Files changed (all under `context/migration/`; no application, backend, DB or dependency-manifest change)
New: `baseline/{environment,routes,api-matrix,defects,doc-discrepancies,runtime-verification-plan,runtime-results-api,runtime-results-ui}.md`, 25 images in `baseline/screenshots/`, proposed `specs/s01-backend-security-remediation.md` (DRAFT) and `verification/s01-report.md` (placeholder). Updated: `specs/m01-existing-app-audit-and-baseline.md`, `feature-inventory.md`, `verification/m01-report.md`, `migration-status.md`, `agent-handoff.md`. Ignored build artifacts created: `frontend/node_modules`, `frontend/dist`, `backend/target`. Local-only, not committed: `baseline/screenshots-local/` (52 files, excluded through `.git/info/exclude`).

## Commands (actual command, exit code, evidence)
| Command | Exit | Evidence |
|---|---|---|
| `cd frontend && npm ci` | 0 | installed; 51 audit findings (2 low/24 mod/22 high/3 critical) not remediated |
| `cd frontend && npm run build` | 0 | built; 5 budget warnings (initial 661.86 kB > 500 kB; 4 component styles > 8 kB) |
| `cd frontend && npm test -- --watch=false` | 0 | Vitest 4.1.0: 13 files / 38 tests passed |
| `cd backend && JAVA_HOME=<jdk21> ./mvnw -B test` | 0 | 39 tests, 0 failures/errors/skipped (H2 in-memory; Cloudinary mocked) |
| `cd backend && JAVA_HOME=<jdk21> ./mvnw -B -q package -DskipTests` | 0 | `backend-0.0.1-SNAPSHOT.jar` built |
| lint / e2e | n/a | NOT RUN — no such script/target exists |
| `psql` role/database creation (approved): `CREATE ROLE uptrack_m01 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE; CREATE DATABASE uptrack_migration_test OWNER uptrack_m01;` | 0 | owner `uptrack_m01`, 0 tables before first run, role non-superuser |
| `./mvnw -B spring-boot:run` (env: isolated DB, role `uptrack_m01`, placeholder Cloudinary, random JWT secret) | running | started in 1.4 s; Hibernate created `users`, `credentials`, `ce_records` only in the test DB |
| `npm start` (frontend) | running | `http://localhost:4200` returns 200 |
| API runtime script (R1, R2, R4–R9, R12, R13 via raw HTTP) | 0 | 55 PASS / 18 FAIL / 4 INFO; details `baseline/runtime-results-api.md` |
| `npm i playwright-core` in scratchpad dir outside the repo; Playwright scripts (stages 1–5) with `channel: msedge` (Edge 156, headless) | 0 | 125 PASS / 10 FAIL / 1 NOT RUN / 4 INFO effective; details `baseline/runtime-results-ui.md`; 77 files captured; 25 curated images (3.0 MB) committed in `baseline/screenshots/`, remainder local-only |
| Reset of the 3 tables in `uptrack_migration_test` (DELETE FROM ce_records/credentials/users) before the UI run | 0 | isolated DB only, so both synthetic accounts had known passwords; earlier API data discarded |

## Acceptance criteria
See M01 spec table: AC1–7 and AC9–12 DONE; AC5, AC6 DONE (with recorded FAILs/limits); AC8 PARTIAL (failure paths run, success path NOT RUN).

## Results at a glance
| Layer | PASS | FAIL | NOT RUN | INFO | Source |
|---|---|---|---|---|---|
| Frontend build / unit tests | build exit 0; 38 of 38 tests | 0 | lint, e2e (do not exist) | 5 build budget warnings | commands above |
| Backend tests / package | 39 of 39 tests; package exit 0 | 0 | none | | commands above |
| API runtime scenarios | 55 | 18 | `DELETE /users/{id}` cross-user (R12.16); successful upload (R6.7) | 4 | `baseline/runtime-results-api.md` |
| Browser runtime scenarios | 125 | 10 | successful upload, replace, remove-after-upload (E3.3) | 4 | `baseline/runtime-results-ui.md` |

How to read the FAILs (18 API + 10 browser = 28): **11 are security findings or direct security evidence** (API R2.3, R2.4 = S4; R12.1–R12.6, R12.8, R12.14 = S1–S3; browser X1.4 = F13). The other 17 are robustness, validation, UX or accessibility differences: API R4.7, R6.3, R6.5, R6.9, R13.1–R13.3 (500 responses / upload validation) and R12.13 (status-code inconsistency); browser U1.3b, U1.3c, C2.4b, K1.3b (focus and Escape behavior), T1.report, T3.1 (theme keys), K2.credentials, K2.ce-records (unlabeled inputs), K2.title (document title). A FAIL is a recorded observation, not an instruction to fix it in M01. Browser totals exclude superseded script attempts (listed in `runtime-results-ui.md`).

## Known limitations
- No successful certificate upload, replace or remove-after-upload was exercised (no safe Cloudinary credentials; placeholders only). The backend ran against **placeholder** Cloudinary values; nothing was sent to a real account by design.
- Backend automated tests run on in-memory H2 (MySQL mode), not PostgreSQL; PostgreSQL behavior was exercised only through the manual API/browser runs on the isolated database.
- Browser coverage is headless Microsoft Edge 156 via Playwright: no Safari/Firefox, no real touch device, no real print dialog (only `window.print` stub + print-media emulation + PDF), no screen reader, no automated contrast check. Accessibility results are DOM-level spot checks, not an audit.
- Screenshots show that states rendered; no visual fidelity comparison with designs or with legacy `context/screenshots/` was made.
- Cross-user `DELETE /users/{id}` was not executed (kept accounts for UI testing); the lack of an ownership check there is established by source and by the PUT result (R12.14).
- The deployed/production backend referenced by `environment.production.ts` was **not** contacted or assessed; whether S1–S3 affect a deployed instance is unknown and is a question for the remediation milestone.
- Accounts: only A and B were used; UI registration was tested for A only. The isolated database tables were emptied once before the browser run.
- High-impact source findings were re-read by the lead agent; remaining inventory detail came from sub-agent reads and was cross-checked by the feature-spec review and runtime runs, not line-by-line re-derived.

## Evidence levels
- **Test-verified:** the 38 frontend and 39 backend tests listed above pass. They do **not** cover PostgreSQL, real Cloudinary, JWT-expiry behavior, cross-user reads, or most Angular pages/components.
- **Source-verified:** routes, endpoint/DTO matrix, status rules, authorization gaps S1–S3, JWT filter exception placement (S4), multipart defaults, feature behaviors. Everything security-relevant here was later also confirmed at runtime (see the next two bullets) except items listed under NOT RUN. High-impact items were re-read by the lead agent (routes, `findAll` calls, JWT filter, security chain, multipart config, print CSS, activity cap); sub-agent inventories supplied the rest.
- **Runtime-verified (API level, live backend on isolated PostgreSQL):** auth, credential/CE CRUD and filters, status boundary (today+90 = EXPIRING_SOON), validation, upload validation/failure path, dashboard and report data, settings, CORS, and the cross-user authorization tests. Confirmed security/robustness defects: S1, S2, S3, S4, S6, S7, B1, B3.
- **Runtime-verified (browser/UI, Edge headless via Playwright):** registration/login/logout/session restore, protected routes and all redirects, dashboard (stats vs API, 3-item preview + See more drawer, drawers), credentials (create/edit/filter/sort/search/delete), CE records (create/edit/delete, 10-per-page pagination, filters, drawers, client upload validation, upload-failure message), report (content, Back/returnTo, print media, window.print behavior, error/empty states), settings (profile and password flows), light/dark theme, 375/768/1280 px layouts (no horizontal overflow; CE table becomes stacked cards at <=768 px; sidebar off-canvas at <=768 px), keyboard/dialog/focus spot checks, DOM-level a11y spot checks, and cross-user UI checks.

## Runtime scenario summary (PASS / FAIL / NOT RUN)
| Scenario | API level | Browser/UI |
|---|---|---|
| R1 Auth | PASS (R1.1–R1.9) | PASS: register (validation, success), login (error, success), logout confirm/cancel/confirm, session restore on reload/new tab, back after logout; FAIL: focus not restored after modal close (F11) |
| R2 Invalid token | FAIL: invalid Bearer breaks public login/register (S4); protected endpoints PASS | PASS: invalid stored token -> redirected to `/` and cleared (U6.1); login still works afterwards (U6.2), because the app does not attach the token to login/register |
| R3 Routes/redirects | n/a; dev server serves SPA fallback (E3 PASS) | PASS: `/app`, `/app/dashboard`, `/app/credentials`, `/app/ce-records` redirect; `/app/settings` and unknown paths land on `/dashboard`; all protected routes (incl. report deep link) redirect logged-out users to `/` |
| R4 Credentials | PASS except R4.7 FAIL (300-char name -> 500) | PASS: create (submit disabled until valid), edit, status/type/search filters, sort by expiry, delete with confirm, drawer open/Esc/overlay; FAIL (observation): Esc/backdrop do not close Add Credential dialog (F12) |
| R5 CE records | PASS | PASS: 10/page pagination (12 records), search, credential/certificate filters, no-match state, create/edit/delete, drawer, hours validation, stacked cards <=768 px |
| R6 Certificates | validation/failure PASS (R6.1, 6.2, 6.4, 6.6, 6.8); FAIL R6.3 (500), R6.5 (1.2 MB -> 500), R6.9 (URL-only metadata accepted); success path NOT RUN | PASS: .txt rejected client-side with message and no request; valid PDF shows "Certificate upload failed."; success/replace/remove NOT RUN |
| R7 Dashboard | PASS | PASS: stats equal API, panels, 4-item activity cap, See more drawer (5 items), row click opens drawer, focus returns to opener after drawer Esc |
| R8 CE report | PASS (R8.1, R8.2) | PASS: content, Back/returnTo and fallback, error and empty states, `window.print` called once with html.dark removed, `.screen-only` hidden in print media, PDF generated; actual OS print dialog not automatable |
| R9 Settings | PASS | PASS: profile save, 409 banner, invalid email, password dialog dismissal, validation, wrong current, success (old rejected / new accepted); observation F14 stale banner |
| R10 Theme/responsive | n/a | PASS: shell toggle/persist, OS-dark default, 375/768/1280 no overflow on landing, dashboard, credentials, CE, settings, report; FAIL: F1 two theme keys (T1.report, T3.1) |
| R11 Accessibility | n/a | PASS: tab order, focus indicator, account menu keyboard, DOM counts on dashboard/settings; FAIL: Esc on logout confirm (F12), unlabeled inputs on credentials/CE pages, title "Frontend" (F7, F8) |
| R12 Cross-user authorization | FAIL (security findings): R12.1–R12.6, R12.8, R12.14 returned or changed another user's data; owner-checked writes R12.9–R12.12 PASS; R12.16 NOT RUN | FAIL X1.4: B sees A's credential via `?credentialId=` deep link (S2 in the UI); PASS X1.2/X1.3 (B's lists empty, A's report 404) |
| R13 Error handling | FAIL: R13.1–R13.3 -> 500; health PASS | PASS: report unknown id and server-error banners render (no crash); console shows only expected 4xx/5xx resource errors |

## Browser and parity evidence
Executed with Playwright (`playwright-core`, scratchpad, outside the repo) driving the installed Microsoft Edge 156 headless. 77 screenshot/PDF files were captured; a curated set of 25 images is committed in `baseline/screenshots/` and indexed in `baseline/runtime-results-ui.md` (the other 52 files, including the print PDF, are kept locally in git-excluded `baseline/screenshots-local/`); results table and console log in `baseline/runtime-results-ui.md`. Console errors: 9 `Failed to load resource` entries (401x3, 502x2, 404x2, 409, 400) all from deliberate negative tests; no `pageerror` exceptions captured.
Limits: screenshots were captured but **not compared to any design or to the legacy `context/screenshots/`**; visual fidelity is NOT assessed. Headless Edge only (no Safari/Firefox, no touch emulation beyond viewport size, no real print dialog, no screen reader). Registration through the UI was tested only for user A (a third account was not allowed); B was created through the API. A few early script attempts were wrong (false PASS on focus, ambiguous selectors, data too small); they were rerun and are listed as superseded in `runtime-results-ui.md`.

## Evidence hygiene (what is and is not in the committed files)
- Committed text files contain no passwords, JWTs, `Bearer` tokens, API keys, `.env` values or database passwords (scan of `context/migration/` for the two throwaway test passwords, `eyJ`-style tokens and `Bearer <token>` patterns: no hits; remaining matches are code identifiers such as the `com.ccruce.backend` package path from the repo itself). Throwaway passwords exist only in a mode-600 file in the scratchpad outside the repo.
- Screenshots (25 committed) were each viewed individually before commit. They show the application viewport only, using the synthetic accounts `m01-user-a@example.test` / `m01-user-b@example.test` and seed data ("Seed CE 01", "BLS Seed" ...), generated from the isolated test database. Password fields are masked; no tokens, API keys, real people or health records appear. The two landing-page images were cropped to the nav/hero because the full capture included the repository's own static marketing preview (demo first name, March 2026 date); the uncropped originals are local-only (`baseline/screenshots-local/`, not committed).
- Real production host name, user name and absolute home-directory paths were removed or generalized in the baseline documents.

## Defects, differences, security notes
See `baseline/defects.md` (S1–S8 security, B1–B8 backend, F1–F15 frontend/browser) and `baseline/doc-discrepancies.md` (D1–D23). **Security findings S1–S4 and F13 require separate remediation; none were fixed in M01.** A remediation milestone is proposed in `specs/s01-backend-security-remediation.md` (DRAFT, not approved; roadmap unchanged pending your decision).

## Remaining items for your decision
1. Successful certificate upload remains NOT RUN unless non-production Cloudinary credentials are provided.
2. Decide handling of security findings S1–S4 and F13 (separate remediation; not part of M01).
3. Commit approval (nothing committed). Screenshots: 25 curated images (3.0 MB) are proposed for commit; the other 52 stay local.
4. Roadmap placement of the proposed security milestone (S01) and M02 start.

## Environment state at end of M01 runtime work
Backend (8080) and Angular dev server (4200) were stopped at the end of the run. Database `uptrack_migration_test` and role `uptrack_m01` are **retained** for React comparison testing. Synthetic users A and B exist (A: renamed and password changed during tests; B: name/password overwritten by the S1 test; the throwaway passwords live only in a git-ignored scratchpad file outside the repo, not in any repo file). The Playwright install is in the scratchpad directory outside the repo.

## Attempts and interventions (for AI experiment)
- Prompt iterations: 1 kickoff + 7 human approval/condition messages
- Agent failed attempts: several test-script errors (macOS has no `timeout`; false-PASS focus check; ambiguous/disabled-button selectors; too-small dataset for See more; print-media locator) — each rerun and recorded as superseded
- Human corrections: 0 beyond the approval conditions
- Total changed files: 14 documentation files + 25 committed screenshots (52 more kept local, not committed); all under `context/migration/`

## Review and approvals
- Approval to commit: not granted
- Approval to merge: not granted
- Approval to delete branch: not granted
- Approval for runtime DB/backend: granted (role `uptrack_m01`, DB `uptrack_migration_test`); teardown: NOT granted (database retained)
