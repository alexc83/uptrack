# M01 runtime verification plan — EXECUTED 2026-10-31 (approved by human)

Execution record: role `uptrack_m01` and DB `uptrack_migration_test` created and verified (owner `uptrack_m01`, 0 tables); backend ran as `uptrack_m01` against it; Angular dev server on :4200. API scenarios: `runtime-results-api.md`. Browser scenarios (Playwright + Edge instead of manual): `runtime-results-ui.md`. Deviations from this plan: the three tables in the isolated DB were emptied once before the browser run; only accounts A and B were used (no third account); R12.16 (cross-user `DELETE /users/{id}`) NOT RUN; successful upload NOT RUN. Servers were stopped afterwards; DB and role retained (teardown, step 7, still requires separate approval).

Original plan text follows.

Nothing in this file has been executed. Per the approved conditions, the database, backend startup, test users and browser runs below require explicit approval of these exact commands first. Only the disposable database `uptrack_migration_test` may be used; no existing database is to be listed, opened, or modified.

## Open questions before approval
1. How does the local PostgreSQL authenticate your macOS user (trust/peer, or a password)? If a password role is needed, supply a throwaway role/password via your own shell; I will not read `backend/.env.local`.
2. Is the dummy-Cloudinary approach acceptable (below)?

## Step 1 — pre-checks (read-only, maintenance DB only)
```bash
psql -h localhost -p 5432 -d postgres -Atc "select current_user, version();"
psql -h localhost -p 5432 -d postgres -Atc "select count(*) from pg_database where datname='uptrack_migration_test';"   # expect 0
```
(This connects to the built-in `postgres` maintenance database only; it does not open any application database. If you prefer, run these yourself with `! ` and paste the output.)

## Step 2 — create the disposable database
```bash
createdb -h localhost -p 5432 uptrack_migration_test
```

## Step 3 — start the backend (env vars exist only in this shell; no files written)
```bash
cd backend
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export DB_URL='jdbc:postgresql://localhost:5432/uptrack_migration_test'
export DB_USERNAME="$(whoami)"            # or your throwaway role
export DB_PASSWORD=''                     # or throwaway password
export AUTH_JWT_SECRET="$(openssl rand -base64 48)"   # random, discarded with the shell
export AUTH_JWT_EXPIRATION_SECONDS=3600
export CLOUDINARY_CLOUD_NAME='m01-disabled'
export CLOUDINARY_API_KEY='m01-disabled'
export CLOUDINARY_API_SECRET='m01-disabled'
export ALLOWED_ORIGIN_PATTERNS='http://localhost:4200,http://127.0.0.1:4200'
./mvnw -B spring-boot:run          # port 8080; Hibernate ddl-auto=update creates tables ONLY in uptrack_migration_test
```
Cloudinary uses placeholder values, so no real account is configured or contacted by intent. Upload requests will reach the Cloudinary SDK, which will fail (expected 502) — this exercises only the failure path; the upload success path stays **NOT RUN**.

## Step 4 — start the Angular dev server
```bash
cd frontend && npm start      # http://localhost:4200, API base http://localhost:8080/api
```

## Step 5 — synthetic data (via the UI/API only)
Two throwaway users, e.g. `m01-user-a@example.test` and `m01-user-b@example.test`, with a generated password held only in the test session and never written to files; synthetic credentials and CE records (no real names, license numbers or health data). Second user is needed for ownership/cross-user tests.

## Step 6 — scenarios (record PASS / FAIL / NOT RUN with evidence; screenshots under `baseline/screenshots/`, synthetic data only)
| # | Area | Scenario |
|---|---|---|
| R1 | Auth | register; duplicate email; login; wrong password; refresh keeps session; logout; protected route redirects to `/` |
| R2 | Auth | tampered/expired token: UI behavior and raw API status/body (defect S4); stale token then login/register |
| R3 | Routes | `/app`, `/app/dashboard`, `/app/credentials`, `/app/ce-records`, `/app/settings`, unknown path, deep link to report while logged out/in |
| R4 | Credentials | create/edit/delete; each filter; search debounce; validation messages; empty state; server error state |
| R5 | CE records | create/edit/delete; filters; pagination (>10 records); empty; mobile cards |
| R6 | Certificates | upload failure path (502 message); invalid type; oversize (>1 MB) behavior; remove certificate; success path **NOT RUN** |
| R7 | Dashboard | empty, populated, 30/60/90 boundary, drawers, overflow "See more", Retry on backend down |
| R8 | CE report | load, empty, progress, print preview (light/dark), returnTo, other user's credential id -> 404 |
| R9 | Settings | profile save, duplicate email 409, password success/failure/mismatch/same-as-old |
| R10 | Theme/responsive | light/dark on every page; 375 / 768 / 1280 px; sidebar collapse and mobile off-canvas; theme key behavior (F1) |
| R11 | A11y | keyboard order, dialog/drawer focus and Escape, labels (spot check) |
| R12 | Security | with user B's token call user A's `/users/{id}`, `/ce-records`, `/credentials/{id}`, `/credentials` (no userId) to confirm or refute S1–S3 (read-only calls; destructive calls only against user B's own synthetic data) |
| R13 | Errors | bad UUID, malformed JSON, long credential name (B1, B3) |

## Step 7 — teardown (separate approval)
Stop backend and dev server; `dropdb -h localhost -p 5432 uptrack_migration_test`; unset shell env vars.
