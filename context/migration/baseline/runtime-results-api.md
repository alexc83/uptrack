# M01 runtime results — API-level (RAN 2026-10-31)

Environment: Spring Boot backend (JDK 21) started with `./mvnw spring-boot:run` against disposable PostgreSQL DB `uptrack_migration_test`, connecting as the limited role `uptrack_m01` (NOSUPERUSER, NOCREATEDB, NOCREATEROLE; trust auth on 127.0.0.1). Cloudinary values were placeholders (`m01-disabled`); JWT secret random per run; no real credentials used. Two synthetic accounts only (`m01-user-a@example.test` = A, `m01-user-b@example.test` = B). Script: scratchpad `api_run.py` (raw HTTP; tokens/passwords never printed).

Verdict key: PASS = matches the expectation stated in the row. FAIL = differs from the expectation (for R12 rows a FAIL **is a confirmed security finding**). INFO = observation without a pass/fail expectation. NOT RUN = not executed.

| ID | Verdict | Scenario | Actual | Expected | Evidence / note |
|---|---|---|---|---|---|
| R1.1 | PASS | register A | 201 | 201 |  |
| R1.2 | PASS | register B | 201 | 201 |  |
| R1.3 | PASS | register duplicate email | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Email is already in use.", "timestamp": "2026-10-31T10:04:56.022526Z"} |
| R1.4 | PASS | register short password | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "password: size must be between 8 and 255", "timestamp": "2026-10-31T10:04:56.029028Z"} |
| R1.5 | PASS | login A | 200 | 200 |  |
| R1.6 | PASS | login wrong password | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Invalid email or password.", "timestamp": "2026-10-31T10:04:56.159914Z"} |
| R1.7 | PASS | me with token | 200 | 200 |  |
| R1.8 | PASS | me without token | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.176745Z"} |
| R1.9 | PASS | protected endpoint without token | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.178033Z"} |
| R2.1 | PASS | tampered token on protected endpoint (expect structured 401) | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.182533Z"} |
| R2.2 | PASS | garbage token on protected endpoint | 401 | 401 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.183965Z"} |
| R2.3 | FAIL | login WITH tampered Bearer token (S4: stale token blocks public endpoint?) | 401 | 200 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.185331Z"} |
| R2.4 | FAIL | register (duplicate email, so no account created) WITH garbage Bearer token: expect 400 like R1.3; 401 => S4 blocks public endpoint | 401 | 400 | {"status": 401, "error": "Unauthorized", "message": "Authentication is required.", "timestamp": "2026-10-31T10:04:56.186546Z"} |
| R4.1 | PASS | A creates credential (active) | 201 | 201 |  |
| R4.2 | PASS | A creates expiring-soon credential | 201 | 201 | status=EXPIRING_SOON |
| R4.3 | PASS | A creates expired credential | 201 | 201 | status=EXPIRED |
| R4.4 | PASS | exactly today+90 days status | 201 | 201 | status=EXPIRING_SOON (source says EXPIRING_SOON) |
| R4.5 | INFO | today+91 days status | 201 | - | status=ACTIVE |
| R4.6 | PASS | invalid credential body | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "renewalCycleMonths: must not be null; type: must not be null; name: must not be blank; requiredCEH |
| R4.7 | FAIL | credential name 300 chars (B3: expect 400/ok, suspect 500) | 500 | [201, 400] | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T1 |
| R4.8 | PASS | renewalCycleMonths=0 | 400 | 400 |  |
| R4.9 | PASS | requiredCEHours=-1 | 400 | 400 |  |
| R4.10 | PASS | list own credentials | 200 | 200 | count=5 |
| R4.11 | PASS | filter status=EXPIRED | 200 | 200 | count=1 |
| R4.12 | PASS | filter type=CERTIFICATION | 200 | 200 | count=2 |
| R4.13 | PASS | search 'bls' (case-insensitive) | 200 | 200 | count=1 |
| R4.14 | PASS | A edits own credential | 200 | 200 |  |
| R13.1 | FAIL | bad UUID path (B1: expect 400, suspect 500) | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T10:04:56.273711Z"} |
| R13.2 | FAIL | malformed JSON (B1) | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T10:04:56.275421Z"} |
| R13.3 | FAIL | bad userId query (B1) | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T10:04:56.276877Z"} |
| R4.15 | PASS | unknown credential id | 404 | 404 |  |
| R5.1 | PASS | A creates CE record | 201 | 201 |  |
| R5.2 | PASS | CE hours=0 | 400 | 400 |  |
| R5.3 | PASS | CE for unknown credential | 404 | [400, 404] | {"status": 404, "error": "Not Found", "message": "Credential not found for id: 1c1c6ecf-db34-4093-9486-2948da488f16", "timestamp": "2026-10-31T10:04:5 |
| R5.4 | PASS | edit own CE record | 200 | 200 |  |
| R5.5 | PASS | credential detail aggregates CE | 200 | 200 | earned=15.5 progress=0.775 records=12 |
| R6.1 | PASS | upload unsupported type | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Unsupported certificate file type. Allowed types: PDF, JPG, JPEG, PNG, WEBP, GIF.", "timestamp": " |
| R6.2 | PASS | upload empty file | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Certificate file must not be empty.", "timestamp": "2026-10-31T10:04:56.332981Z"} |
| R6.3 | FAIL | upload with wrong content-type/no file part | 500 | 400 | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T10:04:56.335196Z"} |
| R6.4 | PASS | upload valid PDF with placeholder Cloudinary creds (expect 502 failure path) | 502 | 502 | {"status": 502, "error": "Bad Gateway", "message": "Certificate upload failed.", "timestamp": "2026-10-31T10:04:56.684410Z"} |
| R6.5 | FAIL | upload 1.2 MB (S6: size behaviour) | 500 | [400, 413, 502] | {"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred.", "timestamp": "2026-10-31T10:04:56.694078Z"} |
| R6.6 | PASS | upload without token | 401 | 401 |  |
| R6.7 | INFO | successful certificate upload | NOT RUN | - | no safe Cloudinary credentials |
| R6.8 | PASS | CE with certificate publicId in another user's folder | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Certificate asset does not belong to the authenticated user.", "timestamp": "2026-10-31T10:04:56.6 |
| R6.9 | FAIL | CE with incomplete certificate metadata | 201 | 400 | {"id": "0f1e81e4-104c-4137-b61c-7dc202c69aad", "title": "Synthetic CE", "provider": "Test Provider", "hours": 4.5, "dateCompleted": "2026-10-21", "cer |
| R7.1 | PASS | dashboard A | 200 | 200 | stats={"totalCredentials": 5, "activeCount": 2, "expiringSoonCount": 2, "expiredCount": 1, "needsCEAttentionCount": 3} upcoming=2 attention=3 activity |
| R7.2 | PASS | dashboard B empty | 200 | 200 | stats={"totalCredentials": 0, "activeCount": 0, "expiringSoonCount": 0, "expiredCount": 0, "needsCEAttentionCount": 0} |
| R8.1 | PASS | report own credential | 200 | 200 | summary={"totalHoursEarned": 20.0, "remainingHours": 0.0, "recordCount": 13, "progress": 1.0} |
| R8.2 | PASS | report of A's credential as B | 404 | 404 |  |
| R9.1 | PASS | get profile | 200 | 200 |  |
| R9.2 | PASS | update profile name | 200 | 200 |  |
| R9.3 | PASS | update profile to B's email | 409 | 409 | {"status": 409, "error": "Conflict", "message": "Email is already in use.", "timestamp": "2026-10-31T10:04:56.732924Z"} |
| R9.4 | PASS | change password wrong current | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "Current password is incorrect.", "timestamp": "2026-10-31T10:04:56.799352Z"} |
| R9.5 | PASS | change password same as old | 400 | 400 | {"status": 400, "error": "Bad Request", "message": "New password must be different from the current password.", "timestamp": "2026-10-31T10:04:56.8643 |
| R9.6 | PASS | change password too short | 400 | 400 |  |
| R9.7 | PASS | change password success | 204 | 204 |  |
| R9.8 | PASS | old password rejected | 401 | 401 |  |
| R9.9 | PASS | new password accepted | 200 | 200 |  |
| R9.10 | PASS | pre-change token still valid after password change | 200 | 200 | (token not invalidated) |
| R12.1 | FAIL | S1: B lists all users (secure=403/404) | 200 | [401, 403, 404] | returned 2 users |
| R12.2 | FAIL | S1: B reads user A by id | 200 | [401, 403, 404] | {"id": "2a2714ae-b6b3-4da0-9db0-cafd39cbd534", "name": "M01 User A2", "email": "m01-user-a@example.t |
| R12.3 | FAIL | S2: B lists /ce-records | 200 | [401, 403, 404] | returned 14 records (B owns 1) |
| R12.4 | FAIL | S2: B reads A's CE record by id | 200 | [403, 404] | {"id": "707124bf-5792-4f6b-8bb9-d6d31683d4d2", "title": "Synthetic CE edited", "provider": "Test Pro |
| R12.5 | FAIL | S2: B reads A's credential by id | 200 | [403, 404] | {"id": "84708c57-a840-4353-b596-4938d45f8793", "name": "RN License M01 edited", "type": "LICENSE", " |
| R12.6 | FAIL | S2: B reads A's credential CE records | 200 | [403, 404] | 13 records |
| R12.7 | PASS | S3: B lists /credentials without userId | 200 | 200 | returned 6 (B owns 2+? A has many) -> leak if > B's own |
| R12.8 | FAIL | S3: B lists /credentials?userId=A | 200 | [403, 404] | returned 5 |
| R12.9 | PASS | B edits A's credential | 404 | [403, 404] |  |
| R12.10 | PASS | B deletes A's credential | 404 | [403, 404] |  |
| R12.11 | PASS | B edits A's CE record | 404 | [403, 404] |  |
| R12.12 | PASS | B deletes A's CE record | 404 | [403, 404] |  |
| R12.13 | FAIL | B creates CE record on A's credential | 400 | [403, 404] | {"status": 400, "error": "Bad Request", "message": "Credential does not belong to the specified user |
| R12.14 | FAIL | S1: A overwrites B's name+password via PUT /users/{id} | 200 | [403, 404] | {"id": "5138094d-bcb7-43cd-86ec-7cbf969526b7", "name": "pwned-by-A", "email": "m01-user-b@example.te |
| R12.15 | INFO | B logs in with ORIGINAL password after A's attack (401 => password was replaced) | 401 | - |  |
| R12.17 | INFO | A's credential still present after B's attempts | 200 | - |  |
| R4.16 | PASS | A deletes own credential (cascade) | 204 | 204 |  |
| R13.4 | PASS | health | 200 | 200 |  |

Totals: 55 PASS, 18 FAIL, 4 INFO (plus NOT RUN items listed below).

## Additional runtime checks (RAN, curl/psql)
| ID | Verdict | Check | Result |
|---|---|---|---|
| E1 | PASS | CORS preflight from `http://localhost:4200` | 200, `Access-Control-Allow-Origin: http://localhost:4200`, methods GET,POST,PUT,DELETE,OPTIONS, credentials true |
| E2 | FAIL (finding S7 confirmed) | CORS preflight from `http://localhost:5173` (Vite default) | 403 "Invalid CORS request"; React dev needs `ALLOWED_ORIGIN_PATTERNS` or a Vite proxy |
| E3 | PASS | Dev server serves `index.html` (200 text/html) for `/`, `/dashboard`, `/app/settings`, `/credentials/abc/ce-report`, `/nonexistent` | SPA fallback works; client-side redirects NOT RUN |
| E4 | PASS | Schema created by Hibernate in isolated DB only | tables `users`, `credentials`, `ce_records`; rows users=2, credentials=5, ce_records=14 at check time |
| E5 | PASS | Stored passwords are BCrypt | 0 of 2 users with a non-`$2` hash |

## NOT RUN (no browser automation available in this session; Playwright/Chrome not installed, install not approved)
R1 UI (session survives refresh, logout, redirect to `/`), R2 UI (how Angular reacts to a stale/invalid token), R3 (all client-side redirects and deep links), R4/R5 UI (forms, filters, debounce, pagination at 10+ records, empty/error states), R6 UI (file picker behavior), R6.7 successful upload (no safe Cloudinary credentials), R7 UI (drawers, See more, Retry), R8 UI (print preview), R9 UI, R10 (light/dark, 375/768/1280 px, sidebar), R11 (keyboard/focus/dialog dismissal), R12.16 (`DELETE /users/{id}` cross-user attempt; intentionally not executed to keep the two synthetic accounts for UI testing; the write-without-ownership flaw is already shown by R12.14), screenshots.

## Notes on specific results
- **R6.9 (incomplete certificate metadata with URL only -> 201):** my expectation (400) contradicted the source reading that blank publicId+resourceType means "no certificate"; a lone URL is accepted. Recorded as FAIL vs expectation / validation gap, not a regression to fix in M01.
- **R2.3/R2.4 (S4 confirmed):** any request carrying an invalid Bearer token gets 401 `Authentication is required.` even on public `/api/auth/login` and `/api/auth/register`. Real impact on the Angular app depends on interceptor behavior (it does not attach the token to login/register, per source) — UI behavior NOT RUN.
- **R12.14/R12.15:** after A's `PUT /api/users/{B}` B's original password no longer works (401), i.e. account takeover by any authenticated user. Account B is now in a mutated state (name `pwned-by-A`, unknown password); it is disposable test data in the isolated DB.
- **R12.13:** B creating a CE record on A's credential returns 400 (not 403/404) and nothing was created.
- **R12.7:** B (owns 1 credential) received 6 credentials without `userId` = all users' credentials.
- **R4.4:** exactly today+90 days = EXPIRING_SOON; today+91 = ACTIVE (matches source).
- **R9.10:** the pre-password-change JWT stays valid (no invalidation).
