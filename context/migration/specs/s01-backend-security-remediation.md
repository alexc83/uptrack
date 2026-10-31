# S01 — Backend security remediation

**Status:** DRAFT — roadmap placement (Option A) and design decisions 1–7 **approved by the human on 2026-10-31**. **Implementation is NOT yet authorized**: it needs a separate go-ahead because it changes `backend/` and API behavior (AGENTS.md). No code written.
**Proposed branch:** `fix/backend-security-remediation` (created only after approval)
**Dependency:** M01 merged (evidence in `baseline/`). **Revision:** 1 (2026-10-31)
**Owner/agent:** to be assigned. **Roadmap placement:** Option A approved — S01 sits between M01 and M02; M01–M14 IDs and filenames unchanged (master plan, tracker and handoff updated).

## Goal and non-goals
Goal: remove the authorization and token-handling defects confirmed in M01 so that an authenticated user can only read or change their own data, and an invalid token cannot break public endpoints, with an automated regression suite that proves it.

Non-goals (separate decisions, listed so they are not silently bundled): roles/admin features, refresh tokens or moving the JWT out of `localStorage` (S5), password-change token invalidation (M01 R9.10), upload size/type hardening (S6), mapping framework errors to 4xx (B1), credential field max lengths (B3), Cloudinary orphan cleanup (B4), CORS changes (S7), database/schema changes, frontend changes, deployment, and any production-environment action.

## Findings addressed (all runtime-confirmed in M01)
| ID | Finding | M01 evidence | Code location (current) |
|---|---|---|---|
| S1 | Any authenticated user can create, list, read, modify (including password reset) and delete other users | API R12.1, R12.2, R12.14, R12.15 (R12.16 delete NOT RUN; established by source) | `controller/UserController.java`; `service/impl/UserServiceImpl.java` (`getAllUsers`, `getUserById`, `updateUser`, `deleteUser` have no ownership check) |
| S2 | Credentials, CE records and credential CE-record lists readable across users | API R12.3–R12.6; UI X1.4 (F13) | `CredentialServiceImpl.getCredentialById`, `getCredentialCERecords` (no `ensureCredentialBelongsToAuthenticatedUser`); `CERecordServiceImpl.getAllCERecords` (`findAll()`), `getCERecordById` |
| S3 | `GET /api/credentials` honors a client-supplied `userId` and returns every user's credentials when omitted | API R12.7, R12.8 | `CredentialServiceImpl.getCredentialsForQuery` (`findAll()` branch) |
| S4 | An invalid/expired Bearer token makes public `/api/auth/**` return 401 (filter throws before the dispatcher) | API R2.3, R2.4 (protected endpoints already return structured 401: R2.1, R2.2) | `security/JwtAuthenticationFilter.java` (throws `UnauthorizedException`), `config/SecurityConfig.java` |
| F13 | UI consequence of S2: `?credentialId=<other user's id>` shows another user's credential | UI X1.4 (`screenshots/x1-b-deeplink-a-credential.png`) | resolved by the S2 fix; verify in UI |

Already correct and must not regress (M01 PASS): update/delete of another user's credential/CE record -> 404 (R12.9–R12.12); CE report of another user's credential -> 404 (R8.2); creating a CE record on another user's credential -> 400 (R12.13; decision 5 now changes this to 404); dashboard scoped to caller (R7.2).

Frontend dependency check (read in M01): Angular calls only `GET/PUT /users/me`, `PUT /users/me/password`, `GET/POST/PUT/DELETE` on `/credentials` and `/ce-records` (by id, own records), `GET /credentials?userId=<own id>`, and `GET /credentials/{id}`. It never calls `POST /users`, `GET /users`, `GET|PUT|DELETE /users/{id}`, or `GET /ce-records` (list). The frontend's own-`userId` filter and by-id reads of own data must keep working unchanged.

## Approved design decisions (human, 2026-10-31)
These are approved designs, not authorization to implement.
1. **`/users` endpoints:** remove the general `/users` collection endpoints (`POST /users`, `GET /users`) and the `/users/{id}` endpoints (`GET`, `PUT`, `DELETE`) because the application does not use them (verified in M01: Angular calls only `/users/me` and `/users/me/password`; nothing else in the repo calls the removed paths). Preserve authenticated `GET/PUT /users/me` and `PUT /users/me/password` unchanged.
2. **Other users' credentials and CE records:** respond 404 for any read/update/delete of another user's credential or CE record (and for `GET /credentials/{id}/ce-records` and `GET /credentials/{id}/ce-report` of another user's credential).
3. **Credential listings:** always scoped to the authenticated user, regardless of any supplied `userId` (the parameter is accepted for backward compatibility but never widens the result; it does not select another user).
4. **`GET /ce-records`:** scoped to the authenticated user.
5. **CE record that references another user's credential** (create or update): 404 (changes the current 400).
6. **Invalid or expired tokens:** consistent 401 JSON responses with a generic, non-sensitive message (no detail about why the token failed). Public endpoints (`/api/auth/**`, `/api/health`) are never blocked by a stale, invalid or expired token.
7. **Tests:** update existing integration tests that expect the insecure behavior (tests listed in the risk section below), and add comprehensive two-user authorization regression tests (plan below).

## Open item
- **D-G hosted backend — flagged as a potentially URGENT exposure.** `environment.production.ts` points at an externally hosted backend. If that instance runs the current `backend/` code, S1–S3 (any registered user can read other users' data, list all credentials and CE records, and take over other accounts) would be exploitable there. **M01 did not contact or test it, and nothing in S01 authorizes contacting it.** Any probing, deployment, redeploy, credential rotation or takedown of the hosted service needs separate explicit authorization from the human. Decision needed (not an S01 code task): how soon to prioritize S01 and whether to take interim protective steps on the hosted service.

## Target API contract (assuming recommended options)
| Endpoint | Today (M01 observed) | After S01 |
|---|---|---|
| `GET /api/users`, `POST /api/users` | any JWT: all users / create | removed |
| `GET /api/users/{id}` | any user's profile | removed (use `/users/me`) |
| `PUT /api/users/{id}` | any user; can reset password | removed (use `/users/me` and `/users/me/password`) |
| `DELETE /api/users/{id}` | any user | removed |
| `GET /api/credentials` | `userId` honored; omitted -> all users | caller's credentials only, `userId` ignored for scoping |
| `GET /api/credentials/{id}`, `/{id}/ce-records` | any credential | owner only; other -> 404 |
| `GET /api/ce-records` | all users' records | caller's records only |
| `GET /api/ce-records/{id}` | any record | owner only; other -> 404 |
| Any endpoint + invalid/expired token | public endpoints 401; protected 401 | protected endpoints: 401 (JSON `ErrorResponse`, generic message, same for invalid and expired); public `/api/auth/**` and `/api/health`: processed normally (token ignored) |
| CE create/update on another user's credential | 400 | 404 |
| Unchanged | credential/CE writes (own data), report, dashboard, uploads, `/users/me*`, `/auth/*` for valid tokens | identical status codes, bodies and validation |

## Implementation notes (guidance only; not approved code)
- Reuse the existing ownership helpers: `CredentialServiceImpl.ensureCredentialBelongsToAuthenticatedUser` and `CERecordServiceImpl.ensureCredentialBelongsToUser` / `ensureCERecordBelongsToUser`, and `getAuthenticatedUser()` in each service; apply them to the read paths listed above.
- S3: replace the `findAll()` branch of `getCredentialsForQuery` with `findAllByUserId(authenticatedUserId)` (+ type filter) and validate any supplied `userId` against the caller.
- S4: in `JwtAuthenticationFilter`, on a token parse failure clear the context and continue the chain (do not throw); protected endpoints then reach `RestAuthenticationEntryPoint` (structured 401), public endpoints proceed. Never log token values.
- Do not introduce roles, new dependencies or schema changes.

## Acceptance criteria (Given / When / Then)
1. Given users A and B each with credentials and CE records, when B requests `GET /credentials/{A credential}`, `GET /credentials/{A}/ce-records`, `GET /ce-records/{A record}` then each returns 404 and no A data; when A requests the same for A's own ids each returns 200 with unchanged bodies.
2. Given the same data, when B calls `GET /credentials` (no `userId`), with `userId=A`, or with `userId=B`, then in every case only B's credentials are returned and no A data appears.
3. Given the same data, when B calls `GET /ce-records` then only B's records are returned.
4. Given A and B, when B calls the removed `/users` collection and `/users/{id}` endpoints (any method) then the response is 404/405 and A is unchanged (verified by A logging in with the original password afterwards); `GET/PUT /users/me` and `PUT /users/me/password` behave exactly as in the M01 baseline.
4b. Given B and A's credential, when B creates or updates a CE record with `credentialId` = A's credential then 404 and nothing is created or changed.
5. Given a request with a tampered, garbage or expired Bearer token, when it targets `POST /auth/login` or `POST /auth/register` with valid credentials then it succeeds as if no token was sent; when it targets any protected endpoint then 401 with the standard JSON error body and one generic message that does not reveal whether the token was malformed, tampered or expired.
6. Given no token, when calling any protected endpoint then 401 (unchanged); public endpoints unchanged.
7. Given valid tokens, when calling the unchanged endpoints in the table above then status codes, bodies and validation messages equal M01 baseline (`baseline/runtime-results-api.md` rows marked PASS) — no regression.
8. Given the Angular app (unchanged), when user A runs login, dashboard, credentials list/filter/create/edit/delete, CE records list/create/edit/delete, report, and settings then behavior equals the M01 browser baseline (`baseline/runtime-results-ui.md` PASS rows).
9. Given user B in the browser, when opening `/credentials?credentialId=<A id>` then the drawer shows an error/not-found state and no A data (closes F13); opening A's report URL still shows the error state.
10. Given the full backend suite, when `./mvnw test` runs on JDK 21 then all existing tests pass (any existing test that encoded the old unscoped behavior is listed and changed only with approval) and the new tests below pass.
11. No frontend source, database schema, dependency or API field/shape changes; no secrets in logs or repo.

## Authorization regression test plan (backend, MockMvc, H2 like existing tests)
New class `CrossUserAuthorizationIntegrationTest` extending `AbstractControllerIntegrationTest` (existing helpers `registerUser`, `bearerToken`). Build a table-driven matrix: for every protected endpoint (credentials, CE records, users, report, dashboard, uploads) x subject {owner, other authenticated user, no token, tampered token, expired token (mint with the same signing key and a past expiry via test config/`JwtService`)} assert the expected status and that the response never contains the other user's identifiers/emails. Additional tests: list endpoints return only the caller's rows with two users' data present; `userId` mismatch; `/users/{id}` cannot change another user's name/email/password (verify victim can still log in with the original password); invalid token on `/auth/login` and `/auth/register` succeeds; invalid token on a protected endpoint returns the JSON error body; owner behavior unchanged (200/201/204 and bodies). Keep the matrix generic so new endpoints must be added to it (document in `AGENTS.md`/testing notes only if approved).
Re-run M01 evidence: the API runner script and Playwright scenarios (U/X series) against `uptrack_migration_test`; save new results beside the M01 baseline for comparison. The disposable database and role retained after M01 may be reused with approval.

## Verification commands
`cd backend && JAVA_HOME=<jdk21> ./mvnw -B test` (all green, record counts); `./mvnw -B -q package -DskipTests`; runtime: isolated DB + Edge/Playwright re-run of R2, R12, X1 and the full M01 browser suite; frontend `npm run build && npm test -- --watch=false` unchanged and green.

## Scope limits / risk / rollback
- Risk: an unknown consumer (outside this repo) of the removed/changed endpoints or of cross-user `GET /ce-records`; mitigation: repo search done in M01 (none in Angular); confirm no other client exists before implementing.
- Risk: existing tests assert old behavior. Read in M01: `UserControllerIntegrationTest` (about lines 27–57) exercises `GET/PUT/DELETE /api/users` and `/api/users/{id}` as a full CRUD, so the approved removal requires rewriting that test; `CERecordControllerIntegrationTest` (line ~66) calls the unscoped `GET /api/ce-records` list; `CredentialControllerIntegrationTest` (lines ~60, ~299–314) calls `GET /api/credentials` without `userId` for list/filter tests, which keep passing only if the data belongs to the authenticated caller (to be confirmed when implementing). Mitigation: list each affected test, change only with approval, and keep owner-path assertions equivalent.
- Risk: the React migration's API contract (M02+) changes; mitigation: S01 lands before M02/M05 contract freeze (see placement) and updates `api-matrix.md`.
- Rollback: single branch revert; no schema change, so no data migration.

## Roadmap placement (APPROVED: Option A; master plan, tracker and handoff updated)
**Option A (approved, ID-preserving):** add one new milestone **S01** outside the M-series. M01–M14 keep their IDs, files, branch names and report paths, so cross-agent references stay valid. Order: M01 -> **S01** -> M02 ... M14. Rules: S01 must be merged before M02 is marked READY (so the parity contract describes the fixed API) and before Gate B; Gate A additionally requires S01 verified; the cutover gate (M14) may not pass with S01 open; `migration-status.md` gets one S01 row; `master-plan.md` gets one milestone line and one gate sentence. Files to touch on approval: `master-plan.md`, `migration-status.md`, `agent-handoff.md`, and (if contract facts change) `baseline/api-matrix.md` via the S01 report — nothing is renumbered.
**Option B (renumbered):** insert as M02 and shift the current M02–M14 to M03–M15: rename 13 spec files and 13 report skeletons, rewrite their internal IDs, branch names, the master-plan milestone list, status table, gates and every cross-reference in `AGENTS.md`/handoff. Higher churn and risk of stale references; not recommended.
**Option C (defer):** run S01 later (e.g., after M06). Not recommended because React auth and every data milestone would be built and tested against the vulnerable contract.

## Completion report
`context/migration/verification/s01-report.md`
