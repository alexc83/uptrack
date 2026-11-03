# M12 Settings — implementation and targeted verification

**Status: IMPLEMENTED on `feature/react-settings` — pending owner acceptance. Not merged, not pushed.**
Date: 2026-11-03. Baseline main/origin/main: `35fd1dc` (verified equal via fetch, ahead/behind 0/0; only new remote state is Dependabot branches).
Authorized by owner brief of 2026-11-03 ("Begin M12 implementation now").

## Scope implemented (Angular parity, no backend changes)

- Replaced the React Settings shell placeholder at `/settings` with a fully functional Settings experience matching the Angular application.
- Authenticated Settings page within `AppShell`:
  - Page title `Settings — UpTrack`.
  - Back button with icon navigates to previous route (`location.state?.from`) or `history.back()`.
  - Header: kicker `Account`, `h1` `Settings`, subtitle `Manage your account information.`
  - Responsive centered layout matching Angular geometry (`max-w-[46rem] mx-auto`).
- Profile Management (`ProfileCard`):
  - Card heading: `h2` `Profile`, subtitle `Update the name and email tied to your UpTrack account.`
  - Form fields for `Name` (required, max 120, autocomplete `name`) and `Email` (required, valid email, max 180, autocomplete `email`).
  - Change detection: "Save Changes" is disabled unless the form is valid, values differ from loaded profile (trimmed name differs or trimmed lowercase email differs), and save is not pending.
  - Profile update: dispatches `PUT /api/users/me` with trimmed values.
  - On success: updates React Query cache (`['profile']`), refreshes session store identity (`session.updateUser(updatedProfile)`), immediately updating shell avatar and user identity; shows `role="status"` banner "Profile updated"; disables Save Changes.
  - On error: displays server error (e.g. 409 Conflict "Email is already in use.") in a `role="alert"` banner while preserving user input.
- Password Security (`SecurityCard` and `PasswordDialog`):
  - Security card: `h2` `Security`, subtitle `Update your password.`, with "Change Password" action button.
  - Success banner: `role="status"`, "Password updated" appears on the Settings page after password update succeeds.
  - Password modal dialog built on `AppModal` with title `Change Password`, subtitle `Update your password with a secure confirmation step.`
  - Form fields: `Current Password` (required), `New Password` (required, min 8, max 255), `Confirm New Password` (required).
  - Validations matching Angular:
    - New password must differ from current password (`samePassword`).
    - Confirm password must match new password (`passwordMismatch`).
    - Password must be at least 8 characters.
  - Form actions: Cancel (clears form, closes modal) and Update Password (disabled if invalid or submitting).
  - Dynamic clearing: typing in password fields clears server error.
  - On submit: `PUT /api/users/me/password` with `{ currentPassword, newPassword }`.
  - On 204 No Content: closes modal, resets form, displays "Password updated" on Settings page.
  - On 400 Bad Request: displays server error (e.g. "Current password is incorrect.") inside modal in `role="alert"` banner, keeping modal open and inputs preserved.
- Loading & Error States:
  - Skeleton loading card matching Angular proportions.
  - Error state with "Settings unavailable" alert and Retry button that refetches `usersApi.getProfile()`.
- Session Isolation & Security:
  - `SettingsSessionBoundary` ensures the component unmounts and all draft/dialog state is discarded when a session changes/replaces.
  - `SessionGuard` checks in `useUpdateProfile` and `useChangePassword` prevent mutations across swapped accounts.

## Intentional deviations from Angular (all documented)

1. Form implementation uses React Hook Form + Zod resolver (`@hookform/resolvers/zod` + `zod`) instead of Angular reactive forms (`FormBuilder`). Validation rules and error messages match character-for-character.
2. Modal uses Flowbite React `Modal` via the shared `AppModal` (with `useOverlayLayer` focus management and escape/backdrop dismiss) instead of PrimeNG `p-dialog`.
3. Dev-only shared UI preview is mounted at `/preview` in `router.tsx` to maintain accessibility of presentation components in dev mode.

## Files changed

- New `frontend-react/src/features/settings/`:
  - `settings-page.tsx`
  - `profile-card.tsx`
  - `security-card.tsx`
  - `password-dialog.tsx`
  - `settings-schema.ts`
  - `use-settings.ts`
  - `settings-session-boundary.tsx`
  - `settings-schema.test.ts` (7 tests)
  - `settings-page.test.tsx` (12 tests)
- `frontend-react/src/app/router.tsx` (maps `/settings` to `SettingsPage`; adds `/preview` for dev presentation preview).
- `frontend-react/src/app/preview/shell-placeholder.tsx` (supports `/preview` for shared-UI preview).
- `frontend-react/src/app/router.test.tsx` (updated placeholder test to assert `/settings` renders Settings page and `/preview` renders placeholder).
- `frontend-react/src/core/auth/route-guards.test.tsx` (updated 7 protected route tests to use `/preview` placeholder; added `usersApi.getProfile` mock).
- New `frontend-react/e2e/settings.spec.ts` (3 tests for settings page, password dialog, and back navigation).
- `frontend-react/e2e/helpers.ts` (added `mockSettings` helper).
- `frontend-react/e2e/app-shell.spec.ts` (added `mockSettings` in beforeEach; updated initial scroll check to `/preview`).
- `context/migration/specs/m12-settings-and-security-ui.md` (marked READY with complete specification).
- `context/migration/migration-status.md` (updated M12 status).
- No backend, Angular, or API-contract changes. No dependency changes.

## Verification results

- Unit tests: `npm run test -- --run` — **39 test files, 543/543 PASS** (523 prior + 20 new tests).
- Lint: `npm run lint` — **PASS** (0 warnings, 0 errors).
- TypeScript: `npm run typecheck` — **PASS** (`tsc -b --noEmit`).
- Production build: `npm run build` — **PASS** (`tsc -b && vite build` built in 1.25s; `settings-page-*.js` chunk emitted).
- Targeted Playwright: `E2E_CHROMIUM_FALLBACK=1 npx playwright test e2e/settings.spec.ts --project=chromium` — **3/3 PASS**.
- AppShell Playwright: `E2E_CHROMIUM_FALLBACK=1 npx playwright test e2e/app-shell.spec.ts --project=chromium` — **8/8 PASS**.
- Duplicate file check: verified 0 files ending in ` 2.ts`, ` 2.tsx`, or ` 2.md`.
- Attribution check: git author and committer are `alexc83 <alexc83@users.noreply.github.com>`, no AI co-authors.

## Post-acceptance Playwright correction (2026-11-03)

### Root cause
Owner acceptance found 41 failures in the 4-browser Playwright suite.
1. When M12 replaced the shell placeholder at `/settings` with the real Settings page, the dev presentation preview was relocated to `/preview`. However, `e2e/shared-ui.spec.ts` and `e2e/theme.spec.ts` still navigated to `/settings`.
2. On `/settings`, the real Settings component mounts and executes `GET /api/users/me`. Because these tests did not declare or mock `/api/users/me` (as they are presentation tests), Playwright's strict default-deny network isolation guard aborted the request and failed the tests with `Unexpected API traffic (only declared, mocked auth calls are allowed): ['GET /api/users/me']`.
3. In addition, the presentation DOM elements (e.g. `Shared UI preview` region, `Primary action` button, `Active` badge, preview form controls, modal, and drawer) were missing on `/settings`, and `theme.spec.ts` reduced-motion test encountered a strict-mode violation on `.animate-pulse` (matching 4 skeleton elements instead of 1).
4. These 10 failing tests accounted for 40 of the 41 owner failures (10 tests × 4 browsers).
5. The remaining WebKit failure (`e2e/auth.spec.ts:123`) was investigated: `auth.spec.ts:123` and all 16 tests in `e2e/auth.spec.ts` passed cleanly in repeated isolated runs (1 + 5 = 6 consecutive passes for line 123; 16/16 for full file). The access-control message occurs when Playwright aborts an undeclared request in WebKit, not an application CORS or route defect. No M12 defect existed in `auth.spec.ts`.
6. Stale references to the old Settings placeholder were also cleaned up in `shell-placeholder.tsx` (which still listed `/settings` in `pages`) and `e2e/visual.spec.ts` (which navigated to `/settings` expecting `Shared UI preview`).
7. `/preview` was conditionally mounted in `router.tsx` via `import.meta.env.DEV`, ensuring it is completely stripped from production builds.

### Files modified
- `frontend-react/e2e/shared-ui.spec.ts` (updated preview navigation to `/preview` at lines 10 and 85)
- `frontend-react/e2e/theme.spec.ts` (updated preview navigation to `/preview` at lines 9 and 76)
- `frontend-react/e2e/visual.spec.ts` (updated preview navigation to `/preview` at lines 11 and 20)
- `frontend-react/src/app/preview/shell-placeholder.tsx` (removed obsolete `/settings` entry from `pages` map and pathname check)
- `frontend-react/src/app/router.tsx` (mounted `/preview` dev-only via `import.meta.env.DEV`)
- `context/migration/verification/m12-report.md` (recorded owner acceptance correction)

### Verification results after correction
- Chromium (fallback): `shared-ui.spec.ts`, `theme.spec.ts`, `auth.spec.ts` — **35/35 PASS**
- Microsoft Edge: `shared-ui.spec.ts`, `theme.spec.ts`, `auth.spec.ts` — **35/35 PASS**
- Google Chrome: `shared-ui.spec.ts`, `theme.spec.ts`, `auth.spec.ts` — **35/35 PASS**
- Mozilla Firefox: `shared-ui.spec.ts`, `theme.spec.ts`, `auth.spec.ts` — **35/35 PASS**
- WebKit (Safari engine): `shared-ui.spec.ts`, `theme.spec.ts`, `auth.spec.ts` — **35/35 PASS**
- Four-browser total for affected specs: **140/140 PASS** (0 failures).
- Settings E2E: `settings.spec.ts` — **3/3 PASS**
- Unit tests: `npm run test` — **39 test files, 543/543 PASS**
- Typecheck: `npm run typecheck` — **PASS** (`tsc -b --noEmit`)
- Lint: `npm run lint` — **PASS** (0 warnings, 0 errors)
- Production build: `npm run build` — **PASS** (verified `shell-placeholder` and `shared-ui-preview` excluded from production bundle)

## Deferred acceptance checks (owner scope)
- Full four-browser Playwright suite (msedge, chrome, firefox, webkit).
- Visual snapshot approval (`visual-edge` macOS).
- Live-backend acceptance against port 18080 / PostgreSQL test database.
