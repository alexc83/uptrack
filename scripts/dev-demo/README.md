# UpTrack local demo-data setup (development only)

Safe, repeatable way to run UpTrack locally with synthetic demo data in the
**isolated local PostgreSQL test database** (`uptrack_migration_test` on
`localhost:5432`, role `uptrack_m01`). This tooling is development-only and is
kept separate from the M08+ React milestones: it adds files under
`scripts/dev-demo/` only and changes no application code.

> **Never** point any of this at the hosted backend or a production database.
> The demo credentials below are intentionally public **throwaway** values for
> the local test database only.

## Prerequisites

- Local PostgreSQL running on `localhost:5432` with role `uptrack_m01` and
  database `uptrack_migration_test` (already retained from the M01/S01
  verification runs; contains the two synthetic `m01-user-*@example.test`
  accounts, which this setup preserves).
- JDK 21+ and Node.js 18+.
- `backend/.env.local` (git-ignored) created from `scripts/dev-demo/env.example`
  with a local-only `AUTH_JWT_SECRET` (`openssl rand -hex 32`).

## 1. Start the local backend (default port 8080)

```bash
cd backend
cp ../scripts/dev-demo/env.example .env.local   # then edit AUTH_JWT_SECRET
set -a; . ./.env.local; set +a
./mvnw spring-boot:run
```

The backend must be started with `DB_URL=jdbc:postgresql://localhost:5432/uptrack_migration_test`
and `DB_USERNAME=uptrack_m01`. If port 8080 is already taken on your machine, set
`SERVER_PORT` to a free local port (e.g. 18080) and use that below. Confirm health:

```bash
curl -s http://localhost:8080/api/health   # {"status":"ok"}
# verify the running backend is connected to the isolated test DB only:
psql -h 127.0.0.1 -U uptrack_m01 -d uptrack_migration_test \
  -c "select datname, count(*) from pg_stat_activity where usename='uptrack_m01' group by datname;"
# must show only uptrack_migration_test
```

Verified on this machine with `SERVER_PORT=18080` (8080/8081 were occupied by an
unrelated local app): `curl -s http://localhost:18080/api/health` → `{"status":"ok"}`.

## 2. Seed the demo data (idempotent, additive)

```bash
# from the repo root; point API_BASE_URL at the running local backend
node scripts/dev-demo/seed-demo-data.mjs
# e.g. API_BASE_URL=http://localhost:18080/api node scripts/dev-demo/seed-demo-data.mjs
```

The script refuses non-loopback API targets (including via redirects), verifies
the API is healthy and that the database target is exactly
`uptrack_migration_test` before changing anything, registers accounts through
`POST /api/auth/register` (so passwords are BCrypt-hashed by the backend —
never inserted directly), and only creates records that are missing. Running
it twice creates no duplicates. If an account already exists but the demo
password does not work, the script stops without modifying that account.

## 3. Start the React frontend (default port 5173)

```bash
cd frontend-react
npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8080
# if the backend runs on another local port:
#   VITE_PROXY_TARGET=http://localhost:18080 npm run dev
# if 5173 is busy, Vite picks the next free port (or pass --port 5174 --strictPort)
```

Verified on this machine: `VITE_PROXY_TARGET=http://localhost:18080 npm run dev`
served http://localhost:5174 (5173 was occupied by another local dev server).

## Demo login credentials (local test DB only — throwaway)

| Account purpose | Email | Password |
|---|---|---|
| Main (populated: active, expiring-soon, expired credentials + CE records) | `demo-main@example.test` | `DemoMain-2026!dev` |
| Empty state (no credentials, no CE records) | `demo-empty@example.test` | `DemoEmpty-2026!dev` |
| Second populated account (isolation testing) | `demo-second@example.test` | `DemoSecond-2026!dev` |

Log in at the Vite URL (e.g. http://localhost:5174) via the landing page's
"Log In" dialog. Verified end-to-end in headless Edge: login as
`demo-main@example.test` → `POST /api/auth/login` 200 → redirect to `/dashboard`
→ authenticated shell renders (sidebar Dashboard / Credentials / CE Records,
account menu "Demo Main"), with the M08+ placeholder page content.

## What is implemented in the React app today

- Implemented: public landing page `/` (M07) with login/register dialog and
  route guards (M06), authenticated app shell layout (M04).
- Placeholders (M08–M12 not started): `/dashboard`, `/credentials`,
  `/ce-records`, `/settings` render a "migration preview" placeholder inside
  the authenticated shell; `/credentials/:credentialId/ce-report` renders a
  report placeholder.

## Verifying isolation via the API

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo-main@example.test","password":"DemoMain-2026!dev"}' | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/credentials
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/ce-records
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/dashboard
# replace 8080 with the backend port you used
```

Each account sees only its own records; requesting another user's credential
by ID is rejected. Swap the email/password for the other two demo accounts to
check the empty account (returns `[]`) and the second account.
