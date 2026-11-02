# Feature inventory / parity matrix

Status: M02 mapping decisions recorded 2026-10-31 (see bottom section). These are verified source locations, not a claim of functional runtime verification.

| Area | Angular source | React milestone | Baseline | React result | Notes |
|---|---|---|---|---|---|
| Landing/auth entry | `frontend/src/app/features/landing-page/` | M06–M07 | Not run | Not started | Login/register dialogs |
| Route guards/session | `frontend/src/app/core/auth/` | M06 | Not run | Not started | Deep links and refresh |
| Dashboard | `frontend/src/app/features/dashboard/` | M08 | Not run | Not started | Counts, attention, drawers |
| Credentials | `frontend/src/app/features/credentials/` | M09 | Not run | Not started | CRUD, filters, detail |
| CE records | `frontend/src/app/features/ce-records/` | M10 | Not run | Not started | Desktop table/mobile cards |
| Certificates | `frontend/src/app/services/upload.service.ts` | M10 | Not run | Not started | Cloudinary through backend |
| CE report | `frontend/src/app/features/ce-report/` | M11 | Not run | Not started | Print and multi-page |
| Settings | `frontend/src/app/features/settings/` | M12 | Not run | Not started | Profile/password |
| Responsive/theme | `frontend/src/app/layout/`, `context/screenshots/` | M04, M13 | M01 runtime + screenshots | M04 implementation; verification report authoritative | Light/dark, shell and shared UI only; M13 cross-feature checks pending |


## M01 expanded scenario matrix

Evidence: SOURCE = read in code, TEST = automated test passed (`environment.md`), RUNTIME = browser/live backend. **RUNTIME is NOT RUN for every row** until `baseline/runtime-verification-plan.md` is approved and executed. "Baseline" below therefore means the best evidence currently available.

| Area | Scenario (start -> action -> endpoint -> expected) | Empty/error/mobile/auth notes | Evidence now |
|---|---|---|---|
| Landing | `/` unauth -> view; Log In / Sign Up modal opens | modal: Esc/backdrop/X close, focus restored; dark toggle (`uptrack-landing-theme`); images swap at 768 px | SOURCE |
| Register | modal signup -> `POST /auth/register` {name,email,password>=8} -> token stored, go `/dashboard` | duplicate email -> 400 message in `role=alert`; validation inline | SOURCE; backend TEST |
| Login | `POST /auth/login` -> `/dashboard` | bad creds 401 message; stale token behavior UNVERIFIED (S4) | SOURCE; backend TEST |
| Session | refresh with token -> `GET /auth/me` -> stay; invalid -> cleared, `/` | any 401 -> `/` silently; no refresh token | SOURCE |
| Guards | unauth deep link to protected route -> `/` | `/` redirects authed users to `/dashboard`; `/app/*` redirects (4) | SOURCE |
| Logout | account menu -> confirm dialog -> clear token -> `/` | client-only | SOURCE |
| Dashboard | `GET /dashboard` -> 4 stat tiles, expirations (first 3, 0-90 days), CEs Still Needed (first 3), recent activity (4) | skeleton; error + Retry; empty copy per panel; "See more" drawers; Add buttons (Add CE disabled with no credentials) | SOURCE; backend TEST |
| Credentials list | `GET /credentials?userId&status&type&search` | search 250 ms debounce; status/type chips; sort by expiry asc; stale-response guard; empty/no-match/error | SOURCE |
| Credential create/edit | form: name, type, org, expiry, renewal>=1, requiredCEHours>=0 -> `POST/PUT /credentials[/{id}]` | server error banner keeps dialog open | SOURCE; backend TEST |
| Credential detail drawer | `GET /credentials/{id}` -> metadata, progress, CE list; actions: Add CE, Edit, Delete (confirm), Open CE Report | loading/error/retry; "No CE records required" variant | SOURCE |
| Credential delete | `DELETE /credentials/{id}` cascades CE records | confirm copy warns about linked CE; Cloudinary assets orphaned | SOURCE; backend TEST (cascade untested) |
| CE records list | `GET /credentials?userId` flattened client-side; filter search/credential/certificate; 10 per page | desktop table, <=768 px stacked cards, 480 px tweak; skeleton/error/empty/no-match; summary cards | SOURCE |
| CE create/edit | form: credential (if no context), title, provider, hours>0, date, certificate -> `POST /ce-records` / `PUT /ce-records/{id}` | HTML min 0.1 vs validator >0 (F6) | SOURCE; backend TEST |
| CE detail drawer | `GET /ce-records/{id}`; Edit, Delete (confirm), Remove Certificate (PUT nulls) | credential link -> `/credentials?credentialId=` | SOURCE |
| Certificates | file select -> immediate `POST /uploads/certificates` -> url/publicId stored on save | types pdf/jpg/jpeg/png/webp/gif; no client size check; status text only; failure 502; replace deletes old asset on save | SOURCE; backend TEST (mocked Cloudinary); live upload NOT RUN |
| CE report | `GET /credentials/{id}/ce-report`; Back (`returnTo`), Print | loading/error+Retry/empty; print removes `dark`, `@page` margins, `.screen-only` hidden; not owner -> 404 | SOURCE; backend TEST |
| Settings profile | `GET/PUT /users/me` name,email | Save disabled unless valid+changed; 409 duplicate; success banner | SOURCE; backend TEST |
| Settings password | `PUT /users/me/password` | confirm-match, differs-from-current, min 8; wrong current 400 | SOURCE; backend TEST |
| Shell/theme | sidebar collapse (`uptrack-sidebar-collapsed`), off-canvas <=768 px, theme toggle (`uptrack-theme`) | tooltips; account menu | SOURCE |
| Cross-user access | user B token vs user A data | S1-S3 expected to expose data | SOURCE (unverified at runtime) |

## Dependencies between features
Auth store -> every protected route and the interceptor; `CredentialWriteEventsService.revision` -> dashboard, credentials, CE records and drawers refresh after any write; credential drawer -> CE form dialog -> upload service; CE drawer -> credential drawer via `?credentialId=`; credentials card/drawer -> CE report (`?returnTo=`); settings -> `authStore.setCurrentUser` -> shell avatar/name.

## M02 architecture mapping (2026-10-31, `chore/react-architecture`)

Decisions from the approved M02 spec (`specs/m02-architecture-and-parity-contract.md`) and `parity-contract.md`:

| Area | React pattern (decision) | Milestone |
|---|---|---|
| Landing/auth entry | Flowbite `Modal` in shared `AppModal` (focus restore, Esc/backdrop close — fixes F11/F12); auth via `AuthProvider` context + TanStack Query mutation | M06–M07 |
| Route guards/session | React Router data router; guard-lazy single-flight `GET /api/auth/me` bootstrap; token in `localStorage['uptrack_token']` (contract preserved, S5 documented) | M06 |
| Dashboard | `useQuery(['dashboard'])`; panels per parity contract §5 | M08 |
| Credentials | `useQuery(['credentials', filters])` — **no `userId` param** (post-S01 caller-scoped); 250 ms debounce; chip filters; RHF+Zod form dialog; invalidation replaces the revision signal | M09 |
| CE records | derived from `GET /api/credentials` via dedicated adapter (`features/ce-records/adapters/`) — decision D9; 10/page; table/cards at `md:` breakpoint | M10 |
| Certificates | multipart upload on select via apiFetch; inline status/error; success path NOT RUN without safe credentials | M10 |
| CE report | standalone route outside shell; `print:` Tailwind variant + `@page`; theme pre-paint fixes F1 | M11 |
| Settings | `useQuery/useMutation` on `/api/users/me*`; password dialog | M12 |
| Responsive/theme | Tailwind v4 class dark mode on `html.dark`; single `uptrack-theme` key, pre-paint inline script; `md:` = 768 px shell breakpoint; token palette per parity contract §7 | M04, M13 |

Cross-feature refresh in React = mutation `onSuccess` query invalidation (parity contract §4), replacing Angular's `CredentialWriteEventsService.revision`.

## M04 clarification — 2026-11-01

M04 implements shared presentation and shell only. Canonical business routes are labelled migration previews; their feature/auth statuses above remain Not started. Mobile is ≤768 px inclusive, desktop >768 px (approved correction to the earlier md wording). M01 evidence is historical and unchanged. Current M04 browser results and screenshots are in `verification/m04-report.md` and `verification/m04-evidence/`.
