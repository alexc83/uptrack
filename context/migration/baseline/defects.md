# M01 baseline — defects, risks and limitations

**No defect below was fixed in M01.** Evidence level: **SOURCE** = read in code; **TEST** = covered by a passing automated test; **RUNTIME** = reproduced against a running backend (API level, 2026-10-31; see `runtime-results-api.md`). Browser/UI behavior was NOT RUN. Security findings are flagged for **separate remediation** and must not be silently "fixed" by the React port.

## Security (flag for separate remediation)
| ID | Finding | Evidence | Impact on migration |
|---|---|---|---|
| S1 | `GET/PUT/DELETE /api/users/{id}`, `GET /api/users`, `POST /api/users` accept any valid JWT with no ownership/role check; `PUT /users/{id}` replaces the target's password | **RUNTIME CONFIRMED** R12.1, R12.2, R12.14, R12.15: B listed all users and read A; A overwrote B's name+password via `PUT /users/{id}` and B's original password then failed. `DELETE` not executed (NOT RUN) | Any authenticated user can read/alter/delete other accounts. React must not call these; backend fix needs separate approval |
| S2 | `GET /api/ce-records` returns all users' records; `GET /api/ce-records/{id}`, `GET /api/credentials/{id}`, `GET /api/credentials/{id}/ce-records` have no ownership check | **RUNTIME CONFIRMED** R12.3 (14 records returned, B owns 1), R12.4, R12.5, R12.6 returned A's data to B. Owner-checked writes PASS (R12.9–R12.12) | Cross-user data disclosure (health-credential data). Write/report endpoints are owner-checked (TEST) |
| S3 | `GET /api/credentials` honours a client-supplied `userId` and returns every user's credentials when omitted. The Angular app always sends its own `userId` and depends on this | **RUNTIME CONFIRMED** R12.7 (B got all 6 credentials with no `userId`), R12.8 (`userId=A` returned A's 5) | React must keep sending `userId` (or backend must derive it) — a parity/security coupling to decide in M02 |
| S4 | Invalid/expired JWT throws `UnauthorizedException` inside `JwtAuthenticationFilter`, before `@ControllerAdvice` applies; the filter also runs for public `/api/auth/**`, so a stale token may break login/register | **RUNTIME CONFIRMED** R2.3/R2.4: invalid Bearer token -> 401 even on public login/register; (R2.1/R2.2 protected endpoints return the structured 401). Angular UI reaction NOT RUN | Frontend 401 handling and login with a stale `uptrack_token` must be verified at runtime |
| S5 | JWT stored in `localStorage` (`uptrack_token`), no refresh token, logout is client-only (token stays valid until expiry) | SOURCE | Preserve contract; assess in M02/M06 |
| S6 | Upload type check passes if content-type OR extension is allowed; no explicit size limit (Spring default 1 MB/file, 10 MB/request) | SOURCE + **RUNTIME CONFIRMED** R6.5: a 1.2 MB upload returns 500 | Oversize behavior unknown (likely 500) |
| S7 | CORS allows credentials with configurable origin patterns; default only `localhost:4200`/`127.0.0.1:4200` | SOURCE + **RUNTIME CONFIRMED** E2: preflight from `http://localhost:5173` -> 403 | React dev server on another port (e.g. 5173) needs `ALLOWED_ORIGIN_PATTERNS` or a Vite proxy |
| S8 | `npm audit`: 51 findings (2 low, 24 moderate, 22 high, 3 critical) in the Angular toolchain | RAN | Not remediated (no upgrades allowed in M01); dev-time dependency risk |

## Backend behavior defects
| ID | Finding | Evidence |
|---|---|---|
| B1 | Framework errors (bad UUID path, malformed JSON, missing query param, unsupported media type, multipart size) fall to the generic handler -> 500 instead of 400/413/415 | **RUNTIME CONFIRMED** R13.1–R13.3 and R6.3: bad UUID path, bad `userId`, malformed JSON, and a request without a multipart `file` part all return 500 |
| B2 | Duplicate email: register -> 400, user CRUD/profile update -> 409 | SOURCE; profile 409 is TEST-covered |
| B3 | Credential string fields have no max length but columns are 180; over-length input likely -> 500 | **RUNTIME CONFIRMED** R4.7: 300-character credential name -> 500 |
| B4 | Credential delete / user delete cascade DB rows but leave Cloudinary assets orphaned; update failure to delete old asset returns 502 after DB work | SOURCE |
| B5 | `DashboardActivity` subtitle hard-codes "(PDF)" for any certificate (including images); `recentActivity` unbounded | SOURCE |
| B6 | Credential list filters `status`/`search` in memory with N+1 CE-record queries | SOURCE |
| B7 | `ddl-auto: update`; no migration tool; H2(MySQL mode) tests do not validate PostgreSQL behavior | SOURCE |
| B8 | `@MockBean` deprecated since Boot 3.4 (test warning) | SOURCE |

## Frontend behavior defects / quirks (each is a parity decision for React)
| ID | Finding | Evidence |
|---|---|---|
| F1 | Two theme storage keys (`uptrack-theme`, `uptrack-landing-theme`); CE-report direct load runs no theme init | SOURCE + **BROWSER CONFIRMED** (T1.report: stored dark, direct report load renders light; T3.1: landing dark then login -> app light, keys landing=dark vs shell=light) |
| F2 | Abandoned uploaded certificate (form cancelled) is never deleted | SOURCE |
| F3 | No "session expired" message on 401; silent redirect to `/` | SOURCE |
| F4 | Dashboard "Expired" branch for upcoming expirations is unreachable (backend excludes expired) | SOURCE |
| F5 | `needsCEAttentionCount` returned but not displayed; `credential.service.getCeRecords` unused | SOURCE |
| F6 | CE hours input `min=0.1` vs validator `>0`; name/email max lengths not mirrored | SOURCE; BROWSER: hours 0, -3 and 0.05 all keep Save disabled (E2.2b) — the HTML `min` appears to feed Angular's validator, so effective minimum is 0.1; the error text for 0.05 reads "Hours must be greater than 0." which is misleading (screenshot `e3-upload-failure.png`) |
| F7 | Accessibility gaps: no `aria-live`; filter chips lack `aria-pressed`; clickable `<tr>` not focusable; `<button>` containing block elements; sidebar toggle has no `aria-expanded` | SOURCE; BROWSER DOM spot-check (K2): 0 `aria-live`/status/alert regions on dashboard/credentials/CE pages; credentials page has 1 and CE records page 2 inputs/selects with no label or aria-label (search box and credential select rely on placeholder/nearby text). Row `<tr>` has no tabindex but an "Open CE record details" button is keyboard reachable (E1.5/E1.6). Not a full audit |
| F8 | Document title is "Frontend" on every page (K2.title, BROWSER). Leftovers: unused `app.html`/`app.scss` CLI placeholder; `index.html` title "Frontend"; duplicate `*.model.ts` re-export files; `frontend/README.md` is CLI boilerplate | SOURCE |
| F9 | Build warnings: initial bundle 661.86 kB > 500 kB budget; 4 component styles exceed 8 kB | RAN |
| F10 | No lint script, no e2e; tests do not cover AuthStore, guards, shell, landing/auth modal, dashboard, credentials/CE pages, drawers, upload validation | SOURCE + RAN |

## Environmental limitations
- Default JDK is 27; JDK 21 must be selected explicitly. No Docker. Runtime baseline needs a disposable PostgreSQL DB and env vars (see `runtime-verification-plan.md`).
- No working seed data for PostgreSQL (see `doc-discrepancies.md` D2); runtime tests need synthetic users registered through the API.
- Cloudinary success path cannot be exercised without non-production credentials.


## Additional runtime observations (2026-10-31)
- R6.9: a CE record with `certificateUrl` only (no publicId/resourceType) is accepted (201); incomplete-metadata check only triggers when publicId or resourceType is present.
- R9.10: JWT issued before a password change remains valid.
- R12.13: creating a CE record on another user's credential -> 400 (not 403/404).
- Dashboard `needsCEAttentionCount` counted 3 for a synthetic user with 5 credentials (R7.1).
- Runtime checks that need a browser (UI behavior, themes, responsive, a11y) are NOT RUN.

## Additional browser-observed findings (2026-10-31, Edge headless; see `runtime-results-ui.md`)
| ID | Finding | Evidence |
|---|---|---|
| F11 | After the login/sign-up modal closes (Esc or X button) focus lands on `<body>`, not on the trigger button — contradicts the spec/source intent of restoring focus | BROWSER FAIL U1.3b, U1.3c |
| F12 | Escape does not close the Add Credential dialog (focus in an input) nor the "Log out?" confirm dialog (focus is on `<body>` when it opens); backdrop click does not close the Add Credential dialog; Cancel works. Drawers and the password dialog do close on Esc | BROWSER FAIL C2.4b, K1.3b; PASS C5.2, S2.1, E1.5 |
| F13 | **S2 reaches the UI:** user B opening `/credentials?credentialId=<A's credential id>` sees A's full credential in the drawer (backend `GET /credentials/{id}` has no ownership check). B's lists and A's report URL are correctly empty/404 | BROWSER FAIL X1.4; PASS X1.2, X1.3 |
| F14 | Stale success banner: after a password change the Profile card still shows "Profile updated" next to "Password updated" | BROWSER observation S2.4 |
| F15 | The dashboard recent-activity list is capped at 4 while the API returned 12 (matches source; documented spec says 5) | BROWSER PASS D1.2 |
