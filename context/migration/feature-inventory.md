# Feature inventory / parity matrix (initial)

Status: DISCOVERY REQUIRED. These are verified source locations, not a claim of functional runtime verification.

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
| Responsive/theme | `frontend/src/app/layout/`, `context/screenshots/` | M04, M13 | Not run | Not started | Light/dark |


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
