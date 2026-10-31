# M01 baseline — Angular routes and guards (SOURCE: `frontend/src/app/app.routes.ts`, `core/auth/auth.guard.ts`)

Behavior below is read from code; runtime verification status is in the last column.

| Path | Guard | Target | Notes | Runtime |
|---|---|---|---|---|
| `/` | `landingRedirectGuard` (awaits session bootstrap; authenticated -> `/dashboard`) | LandingPage (lazy) | login/signup modals | NOT RUN |
| `/app` | redirect (full) | `dashboard` | | NOT RUN |
| `/app/dashboard` | redirect (full) | `dashboard` | | NOT RUN |
| `/app/credentials` | redirect (full) | `credentials` | | NOT RUN |
| `/app/ce-records` | redirect (full) | `ce-records` | | NOT RUN |
| `/credentials/:credentialId/ce-report` | `authGuard` | CeReportPage (lazy), **outside shell** | `?returnTo=` (must start with `/`, else `/credentials`) | NOT RUN |
| `/dashboard` | `authGuard` + `authChildGuard` (shell) | Dashboard | | NOT RUN |
| `/credentials` | same | Credentials | `?credentialId=` opens drawer then is cleared | NOT RUN |
| `/ce-records` | same | CeRecords | | NOT RUN |
| `/settings` | same | Settings | Back uses `history.state.from` else `location.back()` | NOT RUN |
| `**` | redirect | `/` | landing then redirects authenticated users to `/dashboard` | NOT RUN |

Facts to preserve or consciously change in React:
- There are exactly **four** `/app/*` redirects plus `/app`; no `/app/settings` and no `/app/credentials/:id/ce-report` redirect.
- Unauthenticated access to a protected route redirects to `/` (no return-URL is preserved).
- PreloadAllModules is enabled (`app.config.ts`).
- Auth: token in `localStorage['uptrack_token']`; `AuthStore.bootstrap()` (memoised) calls `GET /auth/me`; any 401 clears the session and navigates to `/`; logout is client-only.
- Theme: `.dark` class on `<html>`; shell key `uptrack-theme` (falls back to `prefers-color-scheme`); landing key `uptrack-landing-theme`; sidebar collapse key `uptrack-sidebar-collapsed`. The CE report route is outside the shell, so a direct load does not run shell theme initialisation (SOURCE; unverified at runtime).
- Mobile breakpoint in the shell is 768 px (`window.innerWidth <= 768`).
