# M06 — Authentication and route guards

**Status: READY — architecture plan approved and implementation authorized by the human (2026-11-01). Commit, push, merge, deployment, backend change and M07 are NOT authorized.**
**Branch:** `feature/react-auth`, from `main` at `22ddf5e5f996703b5c770118f9c4defd6828f0d4` (synchronized with `origin/main`).
**Prerequisite:** M05 merged and pushed (`ac720664`, `712647de`; handoff `22ddf5e`).

## Objective

Activate authentication on the dormant M05 foundation: session store and React bindings, protected/guest routing, login/register dialogs, logout, expired-session handling and user-scoped cache isolation. No business pages (M07–M12), no backend or Angular changes, no hosted-backend contact.

## Audited backend contract (read-only; unchanged)

- `POST /api/auth/register` `{name ≤120, email ≤180 @Email, password 8–255}` → 201 `{token,user}`; duplicate email → 400 "Email is already in use.".
- `POST /api/auth/login` `{email @Email, password required}` → 200 `{token,user}`; any failure → 401 "Invalid email or password.".
- `GET /api/auth/me` → 200 `{id,name,email,createdAt}`; missing/invalid/expired token or deleted user → 401 "Authentication is required.". Backend cannot distinguish expired from invalid tokens.
- Validation failures: 400 with one flat string `field: msg; field: msg`; no field-error map. Malformed JSON → 500 (B1; frontend never sends it).
- Absent: refresh tokens, revocation, logout endpoint, cookies, reset, email verification, server sessions. Ownership failures are 404, never 403.

## Approved decisions (human, 2026-11-01)

1. **Resolver gate:** upgrade only `@hookform/resolvers` 3.10.0 → 5.9.2; keep Zod 4 and RHF. Reproduce failure first; prove with real RHF integration, async and type tests; stop on failure.
2. **Session store** (framework-agnostic, outside React) + React bindings on the M05 transport and the single QueryClient. No new auth library, HTTP client, QueryClient, refresh token or cookie. `localStorage['uptrack_token']` preserved.
3. **States:** `initializing | authenticated | unauthenticated | unavailable`; transient `notice: 'expired'`. 403, ownership 404, network errors and 5xx never invalidate a session. Non-401 bootstrap failure keeps the token (`unavailable`, Retry / Sign out) — an approved deviation from the older "any failure clears the token" parity text.
4. **Isolation:** serialized, generation-guarded session transitions (invariants in the M06 report); tests for all required races; `removeQueries()` is not assumed sufficient; later milestones must follow the documented session-epoch contract.
5. **Routing/UI:** Angular-style modal login/register; temporary triggers on the foundation `/` view until M07; optional `auth` and `returnTo` query parameters on `/`; strict internal-only `returnTo`; legacy `/app*` redirects preserve search and hash; CE report protected, outside AppShell; no `/login` or `/register` routes; expired-session notice approved; submit enabled before validation and disabled while pending; cross-tab `storage` listener approved (conditional on isolation tests passing).
6. **Forms:** RHF + Zod 4 + Flowbite + `FormField` + `AppModal`; backend-matching limits only; field errors client-side only; server message shown as a flat banner.
7. **Tests:** default browser fixture keeps denying unexpected API traffic (M04/M05); auth specs use explicit mocks; existing eight M04 visual baselines unchanged; unit suite run repeatedly.

## Out of scope

M07 landing, M08 dashboard, M09/M10 CRUD and certificates, M11 report rendering, M12 settings/password UI, M13 live-backend parity runs, M14 cutover; backend; Angular; the isolated PostgreSQL database; the untracked duplicate `render-with-providers 2.tsx`.

## Acceptance criteria (Given/When/Then, abbreviated)

- No token → guest immediately, zero requests. Valid token → exactly one `/auth/me`, then authenticated; never any protected content while `initializing`.
- `/auth/me` 401 → token removed, guest + expired notice. Network/5xx/403 → `unavailable` with token retained, Retry re-runs one request, Sign out clears.
- Login/register success installs token, persists it, clears all user-scoped cache, navigates to validated `returnTo` or `/dashboard`. Login/register never carry a bearer (public paths).
- Logout (confirmed) cancels and removes all queries and mutations, clears token, navigates `/`.
- Unauthenticated protected URL → `/?auth=login&returnTo=<path+search+hash>`; external/malformed/unknown targets fall back to `/dashboard`.
- Old responses (`/me`, login, 401, cleanup) never alter a newer session or its cache.
- Tests listed in the approved plan are executed or reported NOT RUN with reasons.

## Verification commands

`npm run typecheck`, `npm run lint`, `npm run test` (repeated), `npm run build`, `npm run e2e`, `npm audit`, `npm audit --omit=dev`. Edge/macOS-only browser coverage and manual screen-reader checks are reported as limitations.

## Completion report

`context/migration/verification/m06-report.md`
