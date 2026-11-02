# M02 parity contract — React migration (post-S01)

Status: READY (approved 2026-10-31, `chore/react-architecture`). This is the behavioral contract M03–M14 implement and M13 verifies. Sources: Angular `frontend/src/app/**` (M01 audited, runtime-verified), post-S01 backend controllers (`backend/src/main/java/com/ccruce/backend/**`, verified by 90 tests + S01 runtime). The pre-S01 `baseline/api-matrix.md` is preserved unchanged as historical evidence; **this file is the authoritative post-S01 contract**.

Conventions: `JWT` = any valid Bearer token. Error body for all handled errors: `{status, error, message, timestamp}`; validation message format `field: msg; field: msg`. Status rule (server-side, server date): `EXPIRED` if `expirationDate < today`; `EXPIRING_SOON` if `<= today + 90`; else `ACTIVE`.

## 1. Route matrix

| # | Path | Guard | React target | Behavior to preserve |
|---|---|---|---|---|
| 1 | `/` | landing redirect: await session bootstrap; authenticated → redirect `/dashboard` | `LandingPage` (lazy) + auth modal | login/sign-up modals (Esc/backdrop/X close, focus restored to trigger); theme toggle on landing uses the single `uptrack-theme` key; images swap at 768 px |
| 2 | `/app` | — | redirect → `dashboard` (full) | |
| 3 | `/app/dashboard` | — | redirect → `dashboard` (full) | |
| 4 | `/app/credentials` | — | redirect → `credentials` (full) | |
| 5 | `/app/ce-records` | — | redirect → `ce-records` (full) | exactly these four `/app/*` redirects; no `/app/settings`, no `/app/.../ce-report` |
| 6 | `/credentials/:credentialId/ce-report` | protected | `CeReportPage` (lazy), **outside the app shell** | `?returnTo=`: used as Back target only if it starts with `/`, else `/credentials`; print flow (§6); theme pre-painted from `uptrack-theme` (fixes F1) |
| 7 | `/dashboard` | protected (shell) | `DashboardPage` (lazy) | shell layout; panels per §5 |
| 8 | `/credentials` | protected (shell) | `CredentialsPage` (lazy) | `?credentialId=` opens detail drawer then clears the param |
| 9 | `/ce-records` | protected (shell) | `CeRecordsPage` (lazy) | desktop table / ≤768 px stacked cards |
| 10 | `/settings` | protected (shell) | `SettingsPage` (lazy) | Back uses `history.state.from` else `history.back()` |
| 11 | `**` | — | redirect → `/` | landing then redirects authenticated users to `/dashboard` |

Guard semantics (all routes): unauthenticated access to a protected route → redirect `/` (no return-URL preserved). Session bootstrap is lazy, memoized, single-flight, awaited inside the guard (never render-blocking). Authenticated users hitting `/` → `/dashboard`.

## 2. Shell and layout contract

- Desktop: sidebar (Dashboard, Credentials, CE Records nav with lucide icons LayoutDashboard/FolderOpen/ClipboardList), collapsible via toggle, persisted in `uptrack-sidebar-collapsed`; account menu (avatar with initials, profile → `/settings`, logout with confirm dialog) in a footer area.
- ≤768 px inclusive (desktop >768 px; global Tailwind `md:` is unchanged): sidebar off-canvas behind a hamburger; nav clicks close it.
- Theme toggle in shell; `.dark` on `<html>`; key `uptrack-theme`; default `prefers-color-scheme`; applied pre-paint via inline script in `index.html`.
- Global `ut-fade-in` (0.18 s) on content replacing skeletons; theme-aware skeleton gradients.
- Document title per page (fixes F8: Angular shows "Frontend" everywhere).

## 3. Post-S01 API contract (endpoints the app uses)

Base: `VITE_API_BASE_URL` (dev `/api` via Vite proxy → `http://localhost:8080`). Public (no Bearer): `/api/auth/login`, `/api/auth/register`, `/api/health`.

| Method | Path | Request | Success | Errors | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | `{name ≤120, email, password 8–255}` | 201 `{token, user}` | 400 validation / 400 duplicate email | store token, navigate `/dashboard` |
| POST | `/api/auth/login` | `{email, password}` | 200 `{token, user}` | 400 validation; 401 invalid credentials (generic) | same as register |
| GET | `/api/auth/me` | — | 200 `User{id,name,email,createdAt}` | 401 | session bootstrap |
| GET | `/api/health` | — | 200 `{"status":"ok"}` | — | unused by UI; available |
| GET | `/api/credentials` | query: `status?`, `type?`, `search?` (**no `userId`**) | 200 `CredentialResponse[]` | 401 | always caller-scoped post-S01; client-supplied `userId` ignored |
| POST | `/api/credentials` | `CredentialRequest` | 201 `CredentialResponse` | 400; 401 | owner = caller; client owner fields ignored |
| GET | `/api/credentials/{id}` | — | 200 `CredentialResponse` (with `ceRecords[]`) | 401; 404 (incl. foreign id — indistinguishable) | |
| PUT | `/api/credentials/{id}` | `CredentialRequest` | 200 | 400; 401; 404 | |
| DELETE | `/api/credentials/{id}` | — | 204 | 401; 404 | cascades CE records; Cloudinary assets orphaned (B4, preserved) |
| GET | `/api/credentials/{id}/ce-records` | — | 200 `CERecordResponse[]` | 401; 404 | |
| GET | `/api/credentials/{id}/ce-report` | — | 200 `CEReportResponse` | 401; 404 (non-owner = 404) | records newest-first |
| POST | `/api/ce-records` | `CERecordRequest` (incl. `credentialId`) | 201 `CERecordResponse` | 400; 401; 404 foreign credential ("Credential not found for id: …") | certificate metadata all-or-nothing |
| GET | `/api/ce-records` | — | 200 `CERecordResponse[]` | 401 | caller-scoped post-S01; **app does not use it** (CE rows come from the credentials adapter, decision D9) |
| GET | `/api/ce-records/{id}` | — | 200 | 401; 404 | |
| PUT | `/api/ce-records/{id}` | `CERecordRequest` | 200 | 400; 401; 404; 502 | old Cloudinary asset deleted on change |
| DELETE | `/api/ce-records/{id}` | — | 204 | 401; 404; 502 | Cloudinary asset deleted first |
| GET | `/api/dashboard` | — | 200 `DashboardResponse` | 401 | single call for the whole dashboard |
| POST | `/api/uploads/certificates` | multipart part `file` | 201 `{url, publicId, originalFilename, resourceType}` | 400 missing/empty/unsupported; 401; 502 Cloudinary failure | types pdf/jpg/jpeg/png/webp/gif |
| GET | `/api/users/me` | — | 200 `User` | 401 | profile |
| PUT | `/api/users/me` | `{name, email}` | 200 `User` | 400; 401; 409 duplicate | |
| PUT | `/api/users/me/password` | `{currentPassword, newPassword 8–255}` | 204 | 400 wrong/same/short; 401 | old token stays valid until expiry (documented limitation) |

Removed by S01 (must return generic 404/405, React must not call them): `POST/GET /api/users`, `GET/PUT/DELETE /api/users/{id}`.

**DTO shapes** (TS types in `lib/dto/` must match exactly, including key capitalization):
- `CredentialResponse`: `id, name, type(LICENSE|CERTIFICATION), issuingOrganization, expirationDate, renewalCycleMonths, requiredCEHours, status(ACTIVE|EXPIRING_SOON|EXPIRED), ceHoursEarned, ceProgress, ceRecords[]`
- `CredentialRequest`: `name, type, issuingOrganization, expirationDate, renewalCycleMonths (≥1), requiredCEHours (≥0)` — no max lengths client-side mirror of BE; DB columns 180 chars (B3: over-length → 500, preserved behavior).
- `CERecordResponse`: `id, title, provider, hours, dateCompleted, certificateUrl?, certificatePublicId?, certificateResourceType?, certificateOriginalFilename?`
- `CERecordRequest`: above + `credentialId`; `hours > 0` exclusive.
- `DashboardResponse`: `stats{totalCredentials, activeCount, expiringSoonCount, expiredCount, needsCEAttentionCount}, upcomingExpirations[] (0–90 d only, expired excluded), ceAttention[] (required>0 and earned<required), recentActivity[]{id, credentialId, title, subtitle, icon, activityDate}` (UI caps at 4).
- `CEReportResponse`: `credential{…, requiredCEHours, status}, summary{totalHoursEarned, remainingHours, recordCount, progress}, records[]{title, provider, hours, dateCompleted, certificateUrl}` newest first.
- `AuthResponse`: `{token, user}`. `User`: `{id, name, email, createdAt}`.
- Upload response: `{url, publicId, originalFilename, resourceType}`.

**Known server behaviors preserved (not fixed by the frontend):** B1 500s on malformed UUID/JSON/multipart; B3 over-length → 500; S6 oversize upload → 500 (Spring 1 MB default); R6.9 URL-only certificate metadata accepted; B5 activity subtitle hard-codes "(PDF)"; B2 register 400 vs profile 409 duplicate email.

## 4. Auth, session and HTTP state contract (precise)

- **Storage**: `localStorage['uptrack_token']` only. Known limitations documented: XSS-readable (S5), no refresh, client-only logout, no revocation.
- **Bootstrap**: on first protected-route or landing access, if a token exists, exactly one `GET /api/auth/me` (single-flight promise). Success → `user` set, route proceeds. Failure (401 or network) → token removed, user null, redirect `/`. No token → guard redirects immediately without a request.
- **401 handling**: any API response with status 401 (except the public paths, which never carry a token) → clear session + navigate `/`, silently (Angular F3 behavior; no toast).
- **apiFetch**: builds URL from base + path; appends query params skipping null/undefined/empty string (same as Angular `buildHttpParams`); sets `Authorization: Bearer <token>` for non-public `/api` paths; `Content-Type: application/json` for JSON bodies (never set manually for FormData); parses error body `{message}` into `ApiError{status, message}`; fetch rejection (network) → `ApiError{status: 0, message: 'Unable to reach the server right now. Please try again.'}`; default fallback message `'Something went wrong. Please try again.'`; accepts an optional `AbortSignal`.
- **Query keys & invalidation**: `['auth','me']`, `['dashboard']`, `['credentials', {status?, type?, search?}]`, `['credential', id]`, `['credential', id, 'ce-records']`, `['credential', id, 'ce-report']`, `['ce-record', id]`, `['profile']`. After any credential/CE mutation: invalidate `['credentials']` (all variants), `['dashboard']`, the affected `['credential', id]` and `['credential', id, 'ce-records']` — this replaces Angular's `CredentialWriteEventsService.revision`. `retry: (failureCount, error) => error.status >= 500 && failureCount < 2` (no retry on 4xx). `staleTime: 30s` for lists; report/detail default.
- **Loading/empty/error states** (every feature): skeleton while loading (with fade-in on replace); error state with Retry button on failure; empty state with CTA copy when no data; no-match state when filters/search exclude everything; server-error banner inside dialogs keeps the dialog open. These mirror the Angular states verified in M01 runtime.

## 5. Feature behavior matrix (UI parity)

| Feature | Behavior |
|---|---|
| Landing `/` | hero/marketing sections, login/sign-up modals; modal closes via Esc/backdrop/X with focus restored (fixes F11); images swap at 768 px |
| Dashboard | one `GET /api/dashboard`; 4 stat tiles; upcoming expirations (first 3 shown, "See more" opens list drawer, 0–90 d); "CEs Still Needed" (first 3 + See more); recent activity capped at 4; Add Credential / Add CE buttons (Add CE disabled when no credentials); row click opens credential drawer; focus returns to opener after drawer Esc |
| Credentials | `GET /api/credentials` with `status`/`type`/`search`; 250 ms debounced search; status/type chip filters (`aria-pressed`); sort by expiration asc; stale-response guard; card grid: type pill, name, org, status badge, quick facts, CE progress bar, expiring-soon colored border; create/edit dialog (fields per `CredentialRequest`, inline validation, submit disabled until valid, server banner keeps dialog open); detail drawer: metadata, progress, CE list, actions Add CE / Edit / Delete (confirm warns about linked CE) / Open CE Report; `?credentialId=` opens drawer |
| CE records | rows derived from credentials adapter (D9); 10 per page; filters: search, credential, certificate-present; desktop table (row click + action icons open drawer; rows keyboard reachable — fixes F7) / ≤768 px stacked cards; summary cards (record count, total hours, missing certificates); create/edit dialog incl. credential select when no context, title, provider, hours (>0), date, certificate file; upload on select with inline status/error; delete confirm; drawer: Edit, Delete (confirm), Remove Certificate (PUT with null metadata), credential link → `/credentials?credentialId=` |
| Certificates | file select → immediate `POST /api/uploads/certificates`; accepted types pdf/jpg/jpeg/png/webp/gif; `.txt` rejected client-side with message, no request; failure (incl. 502) shows "Certificate upload failed." inline; replace deletes old asset on save; success path NOT RUN in verification without safe Cloudinary credentials |
| CE report | `GET /api/credentials/{id}/ce-report`; Back via `?returnTo=` (must start with `/`, else `/credentials`); print: removes `.dark` from `<html>` for print, `@page` margins, `.screen-only` hidden in print media, native table header repetition, multi-page support; loading/error+Retry/empty states; non-owner → 404 error state |
| Settings | profile `GET/PUT /api/users/me` (Save disabled unless valid+changed; 409 duplicate banner); password dialog `PUT /api/users/me/password` (confirm match, differs from current, min 8; wrong current → 400 message); avatar/name in shell updates after profile save |
| Logout | account menu → confirm dialog (Esc closes — fixes F12) → clear token → `/` |

## 6. PrimeNG → Flowbite React component mapping

Counted from Angular source (imports + templates). "Custom" = shared wrapper in `shared/ui/` composing Flowbite primitives + small utilities.

| Angular / PrimeNG (usage) | Flowbite React equivalent | Notes |
|---|---|---|
| `p-dialog` ×7 (auth modal, credential form, CE form, logout confirm, password change, dashboard add flows) | `Modal` wrapped in custom `AppModal` | custom: focus restore to opener (F11 fix), Esc/backdrop close (F12 fix), server-error banner region, `aria-live` |
| `p-drawer` ×1 (right, modal, dismissible, blockScroll) | `Drawer` (position right) in custom `DrawerShell` | custom: focus return, Esc/overlay close, scroll lock |
| `p-card` ×4 | `Card` | token-driven padding/colors |
| `p-button` ×16 | `Button` | variants map to color/size props; primary uses `--ut-primary` |
| `p-inputtext` ×2 + native inputs | `TextInput` / `Label` / `Select` / `Textarea` | all inputs labelled (F7 fix) |
| `p-menu` ×2 (account menu) | `Dropdown` | keyboard accessible, `aria-expanded` |
| `p-avatar` ×1 | `Avatar` (initials) | |
| `p-tooltip` ×1 | `Tooltip` | |
| `providePrimeNG` Aura + cssLayer + `.dark` selector | Tailwind v4 `@custom-variant dark` on `html.dark` + `@theme` tokens | `--ut-*` palette + status tokens reproduced for both themes |
| PrimeFlex utilities | Tailwind layout utilities | |
| PrimeIcons | `lucide-react` | Shield, Award, BookOpen, Heart, LayoutDashboard, FolderOpen, ClipboardList per project-overview icon table |
| Custom status pills / progress bars | custom `StatusBadge`, `ProgressBar` on Flowbite `Badge`/`Progress` | token colors incl. dark variants; expiring-soon card border |
| Reactive forms | RHF + Zod (`@hookform/resolvers`) | schemas mirror Bean Validation (§3); hours `>0` (F6: Angular effective min 0.1 via HTML attr; React uses Zod `>0` with clear message) |

**Unsupported patterns requiring custom composition** (no direct Flowbite equivalent): focus-managed modal/drawer wrappers; debounced search input (`useDebouncedValue`); confirm dialogs; print-specific report CSS (`print:` variant + `@page`); skeleton loaders with theme-aware gradients; multi-select chip filters with `aria-pressed`.

## 7. Theme and design tokens

- Strategy: `html.dark` class (Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))`); single key `uptrack-theme` (`dark`/`light`), applied pre-paint by inline script in `index.html`, fallback `prefers-color-scheme`.
- Palette (must match Angular `styles.scss`): primary `#185FA5` light / `#378ADD` dark (hover `#134d87` / `#5499e3`); sidebar bg `#f8f9fa` / `#1a1a1a`; main bg `#eef0f3` / `#111111`; status tokens — Active `#EAF3DE`/`#27500A` (dark `#1e2d1a`/`#C0DD97`), Expiring Soon `#FAEEDA`/`#633806` (dark `#2d2010`/`#FAC775`), Expired `#FCEBEB`/`#791F1F` (dark `#2d1515`/`#F7C1C1`); primary-subtle `#e8f1fb` / `#172233`. Font: Inter stack.
- Breakpoints: shell mobile ≤768 px / desktop >768 px; use matching arbitrary media variants; verified viewports 375 / 768 / 1280 px.

## 8. Defect dispositions (records preserved in `baseline/defects.md`)

- S1–S4: remediated by S01 (backend), verified; React must rely on the post-S01 contract (404/401 semantics above).
- S5 (localStorage JWT): preserved by decision D7; documented limitation.
- S6/S7/B1–B4/R6.9: preserved server behaviors (see §3 notes); S7 dev CORS solved by Vite proxy.
- F1: fixed by single theme key + pre-paint (decision D8). F7/F8/F11/F12: fixed deliberately in React milestones (decision D10), documented as improvements in each `mxx-report.md`. F2/F3/F4/F5/F6/F9/F10/F13–F15: behavior preserved unless a milestone report records an explicit deviation; F10 closed by adding lint/e2e scripts.

## 9. Verification hooks for later milestones

- Unit/component: apiFetch (headers, public paths, error parsing, status 0), query-key invalidation, auth guard matrix, Zod schemas vs §3 rules, CE adapter, theme init.
- E2E (Playwright, local backend + isolated DB `uptrack_migration_test`, synthetic accounts A/B): the M01/S01 scenario IDs (R1–R13, U/C/E/T/K/X series) re-run against React; screenshots compared with `baseline/screenshots/`; viewports 375/768/1280; print emulation for the report.
- Every check recorded PASS/FAIL/NOT RUN with command + exit code in `verification/mxx-report.md`. Upload success path: NOT RUN without safe Cloudinary credentials.

## M04 implementation clarification — approved 2026-11-01

The human selected Angular's inclusive mobile boundary: mobile ≤768 px, desktop >768 px. Standard Tailwind md starts at 768 px and is not an exact match. M04 uses matching arbitrary media variants and matchMedia; it does not redefine global md. Apply the same inclusive boundary when M10 implements table/cards.

M04 canonical routes are explicitly labelled migration placeholders with no authentication or API behavior. The final route/auth/query-param contract above remains unchanged and is implemented in its owning later milestones. The root foundation view remains until M07. Report placeholder stays outside AppShell.
