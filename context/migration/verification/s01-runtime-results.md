# S01 runtime results (RAN 2026-10-31, branch `fix/backend-authorization`, committed locally)

Environment: backend built from the S01 working tree (`./mvnw package`, JDK 21) and started as a jar against the disposable PostgreSQL DB `uptrack_migration_test` using only the limited role `uptrack_m01`; placeholder Cloudinary values; random per-run JWT secret; Angular dev server `http://localhost:4200` (unchanged frontend). Two synthetic accounts (A, B) only; the three tables of that isolated DB were emptied before the API run and again before the browser run. The hosted backend was not contacted. Scripts live in the scratchpad outside the repo; the API runner is the M01 runner with only the expectations for deliberately changed behavior updated (listed below). Verdict key as in `baseline/runtime-results-api.md`.

## API level
M01 baseline: 55 PASS / 18 FAIL / 4 INFO. **S01: 83 PASS / 6 FAIL / 3 INFO** (includes 14 new S01 checks). Comparison by scenario ID: **0 regressions** (all 55 M01 PASS rows still PASS); 12 former FAIL rows now PASS; 6 FAIL rows are unchanged and out of S01 scope.

### Rows whose verdict changed (M01 -> S01)
| ID | Scenario | M01 | S01 |
|---|---|---|---|
| R2.3 | login WITH tampered Bearer token (S4: stale token blocks public endpoint?) | FAIL | PASS |
| R2.4 | register (duplicate email, so no account created) WITH garbage Bearer token: expect 400 like R1 | FAIL | PASS |
| R13.3 | bad userId query (B1) | FAIL | PASS |
| R12.1 | S1: B lists all users (secure=403/404) | FAIL | PASS |
| R12.2 | S1: B reads user A by id | FAIL | PASS |
| R12.3 | S2: B lists /ce-records | FAIL | PASS |
| R12.4 | S2: B reads A's CE record by id | FAIL | PASS |
| R12.5 | S2: B reads A's credential by id | FAIL | PASS |
| R12.6 | S2: B reads A's credential CE records | FAIL | PASS |
| R12.8 | S3: B lists /credentials?userId=A | FAIL | PASS |
| R12.13 | B creates CE record on A's credential | FAIL | PASS |
| R12.14 | S1: A overwrites B's name+password via PUT /users/{id} | FAIL | PASS |
| R12.15 | B logs in with ORIGINAL password after A's attack (401 => password was replaced) | INFO | PASS |

Expectations changed on purpose for S01 (everything else kept as in M01): R12.1, R12.2, R12.14 now expect 404/405 (endpoints removed); R12.3, R12.7, R12.8 expect HTTP 200 with only the caller's own rows; R12.13 expects 404 (was 400); R12.15 became a PASS/FAIL check (B still logs in with the original password); R13.3 expects 200 (the `userId` parameter is ignored; M01 got 500 for a malformed one). R12.7 passed in M01 only because it checked the status code; it now also checks that exactly the caller's one credential is returned.

### Unchanged FAIL rows (out of S01 scope)
| ID | Scenario | Result | Finding |
|---|---|---|---|
| R4.7 | credential name 300 chars (B3: expect 400/ok, suspect 500) | 500 | B3 credential name > 180 chars |
| R13.1 | bad UUID path (B1: expect 400, suspect 500) | 500 | B1 bad UUID path |
| R13.2 | malformed JSON (B1) | 500 | B1 malformed JSON |
| R6.3 | upload with wrong content-type/no file part | 500 | B1 multipart request without file part |
| R6.5 | upload 1.2 MB (S6: size behaviour) | 500 | S6 upload larger than 1 MB |
| R6.9 | CE with incomplete certificate metadata | 201 | URL-only certificate metadata accepted |

### All API rows (S01 run)
| ID | Verdict | Scenario | Actual | Expected | Evidence / note |
|---|---|---|---|---|---|
| R1.1 | PASS | register A | 201 | 201 |  |
| R1.2 | PASS | register B | 201 | 201 |  |
| R1.3 | PASS | register duplicate email | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Email is already in use.", "timestamp": "2026-10-31T10:52: |
| R1.4 | PASS | register short password | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "password: size must be between 8 and 255", "timestamp": "2 |
| R1.5 | PASS | login A | 200 | 200 |  |
| R1.6 | PASS | login wrong password | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Invalid email or password.", "timestamp": "2026-10-31T10: |
| R1.7 | PASS | me with token | 200 | 200 |  |
| R1.8 | PASS | me without token | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10 |
| R1.9 | PASS | protected endpoint without token | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10 |
| R2.1 | PASS | tampered token on protected endpoint (expect structured 401) | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10 |
| R2.2 | PASS | garbage token on protected endpoint | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10 |
| R2.3 | PASS | login WITH tampered Bearer token (S4: stale token blocks public endpoint?) | 200 | 200 | {"token": "<jwt redacted> |
| R2.4 | PASS | register (duplicate email, so no account created) WITH garbage Bearer token: expect 400 like R1.3; 401 => S4 b | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Email is already in use.", "timestamp": "2026-10-31T10:52: |
| R4.1 | PASS | A creates credential (active) | 201 | 201 |  |
| R4.2 | PASS | A creates expiring-soon credential | 201 | 201 | status=EXPIRING_SOON |
| R4.3 | PASS | A creates expired credential | 201 | 201 | status=EXPIRED |
| R4.4 | PASS | exactly today+90 days status | 201 | 201 | status=EXPIRING_SOON (source says EXPIRING_SOON) |
| R4.5 | INFO | today+91 days status | 201 | - | status=ACTIVE |
| R4.6 | PASS | invalid credential body | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "expirationDate: must not be null; type: must not be null;  |
| R4.7 | FAIL | credential name 300 chars (B3: expect 400/ok, suspect 500) | 500 | [201, 400] | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "20 |
| R4.8 | PASS | renewalCycleMonths=0 | 400 | 400 |  |
| R4.9 | PASS | requiredCEHours=-1 | 400 | 400 |  |
| R4.10 | PASS | list own credentials | 200 | 200 | count=5 |
| R4.11 | PASS | filter status=EXPIRED | 200 | 200 | count=1 |
| R4.12 | PASS | filter type=CERTIFICATION | 200 | 200 | count=2 |
| R4.13 | PASS | search 'bls' (case-insensitive) | 200 | 200 | count=1 |
| R4.14 | PASS | A edits own credential | 200 | 200 |  |
| R13.1 | FAIL | bad UUID path (B1: expect 400, suspect 500) | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "20 |
| R13.2 | FAIL | malformed JSON (B1) | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "20 |
| R13.3 | PASS | bad userId query: S01 ignores userId entirely (M01 baseline was 500) | 200 | 200 | [{"id": "d667c820-007b-4951-990a-c59ba27a3101", "name": "BLS", "type": "CERTIFIC |
| R4.15 | PASS | unknown credential id | 404 | 404 |  |
| R5.1 | PASS | A creates CE record | 201 | 201 |  |
| R5.2 | PASS | CE hours=0 | 400 | 400 |  |
| R5.3 | PASS | CE for unknown credential | 404 | [400, 404] | {"status": 404, "error": "Not Found", "message": "Credential not found for id: 333f889f-19cd-4bf1-b325-56237f8 |
| R5.4 | PASS | edit own CE record | 200 | 200 |  |
| R5.5 | PASS | credential detail aggregates CE | 200 | 200 | earned=15.5 progress=0.775 records=12 |
| R6.1 | PASS | upload unsupported type | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Unsupported certificate file type. Allowed types: PDF, JPG |
| R6.2 | PASS | upload empty file | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Certificate file must not be empty.", "timestamp": "2026-1 |
| R6.3 | FAIL | upload with wrong content-type/no file part | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "20 |
| R6.4 | PASS | upload valid PDF with placeholder Cloudinary creds (expect 502 failure path) | 502 | 502 | {"status": 502, "error": "Bad Gateway", "message": "Certificate upload failed.", "timestamp": "2026-10-31T10:5 |
| R6.5 | FAIL | upload 1.2 MB (S6: size behaviour) | 500 | [400, 413, 502] | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "20 |
| R6.6 | PASS | upload without token | 401 | 401 |  |
| R6.7 | INFO | successful certificate upload | NOT RUN | - | no safe Cloudinary credentials |
| R6.8 | PASS | CE with certificate publicId in another user's folder | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Certificate asset does not belong to the authenticated use |
| R6.9 | FAIL | CE with incomplete certificate metadata | 201 | 400 | {"id": "38c6988d-fedb-408c-b5da-4096b9aabd32", "title": "Synthetic CE", "provider": "Test Provider", "hours":  |
| R7.1 | PASS | dashboard A | 200 | 200 | stats={"totalCredentials": 5, "activeCount": 2, "expiringSoonCount": 2, "expiredCount": 1, "needsCEAttentionCo |
| R7.2 | PASS | dashboard B empty | 200 | 200 | stats={"totalCredentials": 0, "activeCount": 0, "expiringSoonCount": 0, "expiredCount": 0, "needsCEAttentionCo |
| R8.1 | PASS | report own credential | 200 | 200 | summary={"totalHoursEarned": 20.0, "remainingHours": 0.0, "recordCount": 13, "progress": 1.0} |
| R8.2 | PASS | report of A's credential as B | 404 | 404 |  |
| R9.1 | PASS | get profile | 200 | 200 |  |
| R9.2 | PASS | update profile name | 200 | 200 |  |
| R9.3 | PASS | update profile to B's email | 409 | 409 | {"status": 409, "error": "Conflict", "message": "Email is already in use.", "timestamp": "2026-10-31T10:52:07. |
| R9.4 | PASS | change password wrong current | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Current password is incorrect.", "timestamp": "2026-10-31T |
| R9.5 | PASS | change password same as old | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "New password must be different from the current password." |
| R9.6 | PASS | change password too short | 400 | 400 |  |
| R9.7 | PASS | change password success | 204 | 204 |  |
| R9.8 | PASS | old password rejected | 401 | 401 |  |
| R9.9 | PASS | new password accepted | 200 | 200 |  |
| R9.10 | PASS | pre-change token still valid after password change | 200 | 200 | (token not invalidated) |
| R12.1 | PASS | S1: B lists all users (removed endpoint) | 404 | [404, 405] | returned {'status': 404, 'error': 'Not Found', 'message': 'The requested resource was not found.', 'timestamp' |
| R12.2 | PASS | S1: B reads user A by id (removed endpoint) | 404 | [404, 405] | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.", "timestamp |
| R12.3 | PASS | S2: B lists /ce-records (secure = only B's own 1 record) | 200 | 200 | returned 1 records (B owns 1) |
| R12.4 | PASS | S2: B reads A's CE record by id | 404 | [403, 404] | {"status": 404, "error": "Not Found", "message": "CE record not found for id: 8a020a8d-e2f3-402d-989 |
| R12.5 | PASS | S2: B reads A's credential by id | 404 | [403, 404] | {"status": 404, "error": "Not Found", "message": "Credential not found for id: 8e3da557-3a12-43f3-ac |
| R12.6 | PASS | S2: B reads A's credential CE records | 404 | [403, 404] | {'status': 404, 'error': 'Not Found', 'message': 'Credential not found for id: 8e3da557-3a12-43f3-ac38-70245d3 |
| R12.7 | PASS | S3: B lists /credentials without userId (secure = only B's own 1) | 200 | 200 | returned 1 |
| R12.8 | PASS | S3: B lists /credentials?userId=A (secure = ignored, only B's own) | 200 | 200 | returned 1 |
| R12.9 | PASS | B edits A's credential | 404 | [403, 404] |  |
| R12.10 | PASS | B deletes A's credential | 404 | [403, 404] |  |
| R12.11 | PASS | B edits A's CE record | 404 | [403, 404] |  |
| R12.12 | PASS | B deletes A's CE record | 404 | [403, 404] |  |
| R12.13 | PASS | B creates CE record on A's credential (S01: 404) | 404 | 404 | {"status": 404, "error": "Not Found", "message": "Credential not found for id: 8e3da557-3a12-43f3-ac |
| R12.14 | PASS | S1: A overwrites B's name+password via PUT /users/{id} (removed endpoint) | 404 | [404, 405] | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.", "timestamp |
| R12.15 | PASS | B still logs in with ORIGINAL password after A's attack attempt | 200 | 200 |  |
| R12.17 | INFO | A's credential still present after B's attempts | 200 | - |  |
| R4.16 | PASS | A deletes own credential (cascade) | 204 | 204 |  |
| R13.4 | PASS | health | 200 | 200 |  |
| R12.16 | PASS | S1: B deletes user A (removed endpoint; was NOT RUN in M01) | 404 | [404, 405] | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.",  |
| R12.16b | PASS | A still exists and can log in after B's delete attempt | 200 | 200 |  |
| S01.1 | PASS | B creates credential with injected userId=A -> owned by B | 201 | 201 |  |
| S01.2 | PASS | injected credential is NOT in A's list | 200 | 200 |  |
| S01.3 | PASS | A cannot read the credential B created with injected userId=A | 404 | 404 |  |
| S01.4 | PASS | B creates CE record with injected userId=A on own credential | 201 | 201 |  |
| S01.5 | PASS | injected CE record is NOT in A's /ce-records | 200 | 200 |  |
| S01.6 | PASS | A cannot read the CE record B created with injected userId=A | 404 | 404 |  |
| S01.7 | PASS | B moves own CE record onto A's credential -> 404 | 404 | 404 | {"status": 404, "error": "Not Found", "message": "Credential not found for id: 8e3da557-3a |
| S01.8 | PASS | unknown API path -> 404 JSON (was 500) | 404 | 404 | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.",  |
| S01.9 | PASS | wrong method on /users/me -> 405 JSON (was 500) | 405 | 405 | {"status": 405, "error": "Method Not Allowed", "message": "The request method is not suppo |
| S01.10 | PASS | GET /users (removed) -> 404, no internals | 404 | 404 | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.",  |
| S01.10 | PASS | GET /users/{id} (removed) -> 404, no internals | 404 | 404 | {"status": 404, "error": "Not Found", "message": "The requested resource was not found.",  |
| S01.11 | PASS | tampered token on protected endpoint -> generic 401 body | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timest |
| S01.12 | PASS | /users/me still works | 200 | 200 |  |

## Browser level (Playwright + Edge 156, same ten stage scripts as M01)
M01 baseline (effective): 125 PASS / 10 FAIL / 1 NOT RUN / 4 INFO. **S01: 126 PASS / 9 FAIL / 1 NOT RUN / 4 INFO.** Same scenario IDs in both runs; **0 regressions**; **X1.4 changed FAIL -> PASS** (user B opening `/credentials?credentialId=<A's id>` now gets "Credential unavailable / Credential not found" with Retry and no A data; image `verification/s01-evidence/x1-b-deeplink-a-credential-after-fix.png`). X1.1–X1.3 still PASS.

### Browser FAIL rows still failing (frontend-only findings, unchanged and out of S01 scope; backend-only milestone)
| ID | Finding |
|---|---|
| U1.3b | F11 focus not restored after login modal Esc |
| U1.3c | F11 focus not restored after login modal close button |
| C2.4b | F12 Esc/backdrop do not close Add Credential dialog |
| K1.3b | F12 Esc does not close the logout confirm dialog |
| T1.report | F1 report direct load ignores stored dark theme |
| T3.1 | F1 landing dark theme not carried into the app |
| K2.credentials | F7 unlabeled input on the credentials page |
| K2.ce-records | F7 unlabeled inputs on the CE records page |
| K2.title | F8 document title is "Frontend" |

NOT RUN: E3.3 successful certificate upload, replace and remove-after-upload (no safe Cloudinary credentials; placeholders only).

Browser console during the run: 9 `Failed to load resource` entries (401 x3, 404 x3, 502 x2, 409, 400) from deliberate negative tests (one extra 404 compared with M01 is the now-blocked deep link); no page exceptions. The M01 results file `baseline/runtime-results-ui.md` remains the per-row reference for scenario wording.

## Limits
Headless Edge only; screenshots of this run were kept local except the single deep-link image; no real print dialog or screen reader; a PASS means only what the scenario text says. Expired-token behavior is covered by automated backend tests (the runtime run used tampered and garbage tokens because the per-run signing secret is not recoverable by the scripts).