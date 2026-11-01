# S01 verification report — backend security remediation

Status: **IMPLEMENTED, VERIFIED, MERGED AND PUSHED (branch `fix/backend-authorization`, commits `39ceddf` code/tests and `6fd6f47` documentation; `main` at `6fd6f47`); NOT deployed.** Results approved by the human on 2026-10-31. Successful certificate upload remains NOT RUN (no safe Cloudinary credentials, unchanged from M01).
Agent / model / session: Claude Code, Sonnet 5.5 (claude-sonnet-5-5), session of 2026-10-31
Date / branch / base: 2026-10-31 / `fix/backend-authorization` / created from `main` at `19f3053` (the M01 documentation commit)
Spec version / approved changes: `specs/s01-backend-security-remediation.md` design decisions 1–7 plus the five additional requirements given with the implementation approval (see "Requirements" below)
Hosted backend: **suspended by the owner and not contacted, restarted or redeployed.** The fixes below exist only in the local commits on this branch; nothing was pushed or deployed.

## Files changed (two local commits: backend code and tests, then documentation)
Backend production code (11 files)
- `controller/UserController.java`: removed `POST /users`, `GET /users`, `GET|PUT|DELETE /users/{id}`; `/users/me`, `/users/me/password` unchanged.
- `service/UserService.java`, `service/impl/UserServiceImpl.java`: removed the matching methods and the private `applyRequest`.
- `dto/request/UserRequestDto.java`: deleted (only the removed endpoints used it).
- `controller/CredentialController.java`, `service/CredentialService.java`: removed the `userId` query parameter from the list endpoint signature (supplied values, including malformed ones, are now simply ignored).
- `service/impl/CredentialServiceImpl.java`: list is always `findAllByUserId[AndType](authenticated user)`; `getCredentialById` and `getCredentialCERecords` now call the existing `ensureCredentialBelongsToAuthenticatedUser` (404).
- `service/impl/CERecordServiceImpl.java`: `getAllCERecords` uses `findAllByUserId(authenticated user)`; `getCERecordById` checks ownership (404); a foreign credential on create/update now returns the same 404 `Credential not found for id: …` as a non-existent credential (was 400).
- `security/JwtService.java`: signing key resolved before parsing (so key misconfiguration surfaces as a server error), and a missing/blank `uid` claim is rejected with `IllegalArgumentException` instead of a `NullPointerException`.
- `security/JwtAuthenticationFilter.java`: an unusable token no longer throws; the request stays unauthenticated and the chain continues. Only these exceptions count as "unusable token": `ExpiredJwtException`, `PrematureJwtException`, `MalformedJwtException`, `UnsupportedJwtException`, `io.jsonwebtoken.security.SignatureException`, `RequiredTypeException`, `IllegalArgumentException`. The try block contains only `jwtService.parseToken(...)`; authentication objects are built outside it, and the downstream chain is outside it. `IllegalArgumentException` is needed because jjwt throws it for empty/null token strings and `UUID.fromString` throws it for a malformed `uid`; its scope is the parse call only. `WeakKeyException` (signing-key configuration, which extends jjwt's `JwtException` through `SecurityException`) is deliberately not caught.
- `exception/GlobalExceptionHandler.java`: two narrow handlers, `NoResourceFoundException` → 404 `The requested resource was not found.` and `HttpRequestMethodNotSupportedException` → 405 `The request method is not supported for this resource.` (the framework's own messages name internals such as "No static resource"). Side effect, intended: any unknown `/api/...` path now returns 404 instead of 500.

Backend tests (4 files: 2 new, 2 changed)
- New `controller/CrossUserAuthorizationIntegrationTest.java` (47 test executions: 24 test methods plus two parameterized token matrices with 12 and 11 token kinds).
- New `security/JwtAuthenticationFilterTest.java` (4 unit tests proving the catch scope).
- Changed `controller/UserControllerIntegrationTest.java`: `shouldPerformFullUserCrudFlow` replaced by `shouldNoLongerExposeGeneralUserCrudEndpoints`; the other six tests untouched.
- Changed `controller/CERecordControllerIntegrationTest.java`: `shouldRejectCredentialOwnedByDifferentUser` now expects 404 with `Credential not found for id: …` (was 400).
- No other existing test needed a change (the credential list/filter tests use one user and pass their own `userId`).

Documentation/evidence (second commit; 8 paths: 7 Markdown files plus one image): this report, `verification/s01-runtime-results.md`, `verification/s01-evidence/x1-b-deeplink-a-credential-after-fix.png`, the S01 spec, `baseline/defects.md` (remediation status section), master plan, tracker, handoff.
Not changed: `frontend/` (empty diff), `backend/pom.xml` (no dependency change), database schema, API response shapes for authorized users.

## Commands (actual command, exit code, evidence)
| Command | Exit | Evidence |
|---|---|---|
| `./mvnw -B test -Dtest=CrossUserAuthorizationIntegrationTest` on the **unmodified** production code (tests first) | 1 | 47 run: 13 failures + 23 errors; 36 red / 11 green. The first attempt also had 5 red from a bug in my own helper (asserted a `credentialId` field that CE responses do not have); fixed in the test, reds then reflected real defects only. Reds: cross-user reads, list scoping, owner-field injection reads, removed-endpoint paths, 404/405 handling, and every invalid-token kind (filter threw). Greens: owner paths, already-owner-checked writes, dashboard, `/users/me*`. |
| `./mvnw -B test` after the fix (JDK 21) | 0 | **90 tests, 0 failures, 0 errors, 0 skipped**: App 1, JwtAuthenticationFilterTest 4, Dashboard 2, Credential 12, Upload 6, User 7, CrossUserAuthorization 47, CERecord 8, Auth 3 (M01 baseline was 39 tests = 90 − 47 − 4). |
| `./mvnw -B -q package -DskipTests` | 0 | `backend-0.0.1-SNAPSHOT.jar` built |
| `cd frontend && npm test -- --watch=false` | 0 | 13 files / 38 tests passed (same as M01) |
| `cd frontend && npm run build` | 0 | built; same 5 budget warnings as M01 |
| Runtime API suite (M01 runner + 14 S01 checks) against the new jar and isolated DB | 0 | 83 PASS / 6 FAIL / 3 INFO; 0 regressions vs M01; see `verification/s01-runtime-results.md` |
| Runtime browser suite (Playwright + Edge 156, same 10 stage scripts) | 0 | 126 PASS / 9 FAIL / 1 NOT RUN / 4 INFO; 0 regressions vs M01; X1.4 FAIL → PASS |

## Requirements given with the implementation approval
1. **Narrow exception handling in `JwtAuthenticationFilter`: DONE.** Specific token exceptions only (list above); a broad catch of `RuntimeException`/`JwtException` was rejected because `WeakKeyException` is a `JwtException`. `JwtAuthenticationFilterTest` proves a misconfigured key still surfaces (`WeakKeyException`) and an `IllegalArgumentException` thrown by the downstream chain is not swallowed.
2. **Ownership always comes from the authenticated user: VERIFIED.** Source: both `applyRequest` methods set the owner from `getAuthenticatedUser()`, and neither request DTO has an owner field; the only client-supplied reference is `credentialId`, which is ownership-checked. Tests: `credentialCreationIgnoresClientSuppliedOwnerFields`, `ceRecordCreationIgnoresClientSuppliedOwnerFields`, `updatesIgnoreClientSuppliedOwnerFields`, and runtime S01.1–S01.6 inject `id`, `userId` and nested `user` pointing at A and confirm B still owns the data.
3. **Two-user matrix covers reads, creates, updates, deletes and relationship manipulation: DONE.** Includes: moving own CE record onto another user's credential, retargeting another user's CE record to own credential, creating a CE record on a foreign credential, foreign-vs-nonexistent indistinguishability, delete of foreign credential/CE with proof the victim's data is intact, owner delete cascade still works, owner can still move a CE record between own credentials. `/users/me` and `/users/me/password` verified fully functional: profile update (and ignoring smuggled `id`/`password`), duplicate email 409, password change success/wrong current/same/too short, old password rejected and new accepted, other users unaffected (backend test `meEndpointsRemainFullyFunctionalAndIsolated`, existing six user tests, runtime R9, S01.12, browser S1/S2).
4. **404/405 for removed endpoints without internals: DONE.** Test `removedUserEndpointsReturnGeneric404WithoutInternalDetails` (all methods on `/users`, `/users/{id}`) and `wrongMethodsOnMeEndpointsReturnGeneric405`; assertions check the body for `org.springframework`, `Exception`, `static resource`, `stackTrace`, `NoResource`. Unauthenticated calls to removed paths still get the generic 401 first. Runtime S01.8–S01.10.
5. **Existing functionality and response shapes preserved: VERIFIED.** No DTO or response-shape change for authorized users (only `UserRequestDto` removed). All 55 M01 API PASS rows and 125 M01 browser PASS rows still pass, with 0 regressions.

## Acceptance criteria (S01 spec)
| # | Criterion | Result |
|---|---|---|
| 1 | Other user gets 404 for credential, its CE list, CE record; owner unchanged | PASS (tests; runtime R12.4–R12.6, S01.3, S01.6) |
| 2 | Credential list scoped to caller whatever `userId` is | PASS (test `credentialListIsAlwaysScopedToTheCaller` with 10 query variants; runtime R12.7, R12.8) |
| 3 | `GET /ce-records` scoped to caller | PASS (test; runtime R12.3, S01.5) |
| 4 / 4b | Removed `/users` endpoints; A unchanged; CE on foreign credential 404, nothing created | PASS (tests; runtime R12.1, R12.2, R12.13, R12.14, R12.15, R12.16, R12.16b, S01.10) |
| 5 | Invalid/tampered/expired token: login/register unaffected; protected endpoints one generic 401 | PASS in tests for 11 token kinds (tampered, expired, wrong key, unsigned, garbage, truncated, empty, missing uid, non-UUID uid, non-string uid, not-yet-valid) × all 17 protected endpoint variants; runtime PASS for tampered and garbage (R2.3, R2.4, S01.11). Expired is covered by automated tests only (runtime secret not recoverable). |
| 6 | No token: 401 as before | PASS |
| 7 | Authorized behavior unchanged | PASS (0 regressions, API and browser) |
| 8 | Angular unchanged and working | PASS (browser 126 PASS, 0 regressions; frontend tests/build same as M01) |
| 9 | Deep link as user B shows error state, no A data | PASS (browser X1.4; image in `verification/s01-evidence/`) |
| 10 | `./mvnw test` green; changed tests listed | PASS (90/90; two existing tests changed, listed above) |
| 11 | No frontend/schema/dependency/API-shape change; no secrets | PASS (`git diff` empty for `frontend/` and `backend/pom.xml`; no schema change; scan for secrets before commit still required) |

## PASS / FAIL / NOT RUN summary
- Backend automated: 90 PASS, 0 FAIL, 0 NOT RUN. Frontend automated: 38 PASS, build OK.
- API runtime: 83 PASS / 6 FAIL / 3 INFO. The 6 FAILs are unchanged out-of-scope M01 findings: R4.7 (B3), R13.1 and R13.2 (B1), R6.3 (B1, multipart without file part), R6.5 (S6, upload > 1 MB), R6.9 (URL-only certificate metadata accepted).
- Browser runtime: 126 PASS / 9 FAIL / 1 NOT RUN / 4 INFO. The 9 FAILs are the unchanged frontend findings F1, F7, F8, F11, F12 (S01 is backend-only). NOT RUN: E3.3 successful certificate upload/replace/remove.
- Security findings S1, S2, S3, S4, F13: **remediated and verified on this branch** (S1: endpoints removed and verified 404; S2/F13: ownership 404; S3: scoping; S4: invalid tokens no longer break public endpoints, one generic 401). R12.16 (cross-user `DELETE /users/{id}`, NOT RUN in M01) is now executed and PASS because the endpoint is gone.

## Remaining security limitations and vulnerabilities (not fixed by S01)
Verified at runtime in M01 or S01: 
- **Not deployed.** The fixes are not merged or deployed; the hosted backend is suspended. Until a fixed backend is deployed, anything running the previous code remains exposed.
- **B1:** framework errors other than unknown path/method still return 500 (bad UUID path, malformed JSON, multipart without file part).
- **S6:** no upload size limit in code (1 MB Spring default; larger uploads return 500); type check accepts a file if either content type or extension is allowed. **B3:** over-length credential strings return 500. **R6.9:** URL-only certificate metadata is accepted.
- **S5 / R9.10:** JWT in `localStorage`, no refresh or server-side revocation; a token issued before a password change stays valid until expiry; logout is client-only.
- **S7:** CORS permits only the configured origins (default Angular dev ports); a React dev server on another port needs configuration.
- **Account enumeration:** `POST /auth/register` returns 400 `Email is already in use.` for existing emails (M01 R1.3), and profile update returns 409; no CAPTCHA or throttling.
Read in source, not tested at runtime:
- No rate limiting or lockout on login/register was found in `SecurityConfig`; brute-force resistance was not assessed.
- A token for a user that was removed directly in the database would produce 404 `User not found` rather than 401 (users can no longer be deleted through the API).
- `certificateUrl` is stored as supplied (length-checked only); the user-folder check applies to `certificatePublicId`. Deleting a credential or user leaves Cloudinary assets orphaned (B4).
Not assessed at all: transport security and headers at deployment, dependency vulnerabilities (51 `npm audit` findings in the Angular toolchain from M01; backend dependency scan not run), logging/audit trail, data-at-rest.

## Known limitations of this verification
Tests run on H2 (MySQL mode); PostgreSQL was exercised only through the manual runtime runs. Expired tokens are covered by automated tests, not at runtime. Headless Edge only; accessibility was not part of this milestone. Screenshots of the browser run were kept locally except one image. The API runner and Playwright scripts live in the scratchpad (outside the repo) and are not committed.

## Environment state
Backend and Angular dev server stopped. Database `uptrack_migration_test` and role `uptrack_m01` retained (not dropped). Its tables currently hold synthetic data from the last browser run (accounts A and B and their records); no real data. `frontend/dist`, `backend/target` are git-ignored build outputs.

## Review and approvals
- Approval to implement: granted 2026-10-31 (plan approved, `backend/` edits authorized on this branch, local servers against the isolated DB authorized)
- Approval to commit: granted 2026-10-31 for exactly two commits (code and tests; documentation)
- Approval to push / merge: NOT granted
- Approval to deploy: NOT granted
- Approval to drop the test database/role: NOT granted
