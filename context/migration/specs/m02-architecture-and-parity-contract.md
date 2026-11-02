# M02 — Architecture and parity contract

**Status:** READY — approved by the human on 2026-10-31 (approval message recorded in `verification/m02-report.md`). Documentation-only milestone: no application code, dependency, scaffold, backend or deployment change is authorized by this spec.
**Branch:** `chore/react-architecture` (created from `main` at `ee72760`)
**Dependency:** S01 merged and verified (`39ceddf`, `6fd6f47`); this contract describes the **post-S01** API.
**Companion documents:** `context/migration/architecture.md` (decision record), `context/migration/parity-contract.md` (route/API/state/UI contract). M01 baselines under `context/migration/baseline/` are preserved unchanged as historical evidence; the post-S01 API contract lives in `parity-contract.md`, not in `baseline/api-matrix.md`.

## 1. Objective and scope

Finalize the technical architecture for replacing the Angular 21 + PrimeNG UI in `frontend/` with a sibling React + TypeScript application in `frontend-react/`, and define the parity contract that M03–M14 must satisfy. The Angular frontend remains untouched as the reference application; the Spring Boot backend and its S01-hardened API contracts are preserved unchanged.

**In scope (M02):** architecture decision record, parity contract (routes, API, state, UI, theme, testing), folder structure, dependency list with rationale, acceptance criteria, documentation updates under `context/migration/`.
**Out of scope:** any change to `frontend/`, `backend/`, dependency manifests or lockfiles; scaffolding `frontend-react/` (M03, and only after S02 is merged and verified); S02 implementation; any contact with the suspended hosted backend; commits/pushes without separate approval.

## 2. Existing Angular architecture findings (verified in M01/S01)

Source: `frontend/src/app/**`, audited in M01 (`baseline/*.md`, runtime-verified) and re-verified against source for M02.

- **Routing** (`app.routes.ts`): `/` landing with `landingRedirectGuard` (authenticated → `/dashboard`); redirects `/app`, `/app/dashboard`, `/app/credentials`, `/app/ce-records`; shell layout guarded by `authGuard`/`authChildGuard` with children `/dashboard`, `/credentials` (`?credentialId=` opens the detail drawer, then clears the param), `/ce-records`, `/settings`; standalone `/credentials/:credentialId/ce-report` outside the shell (`?returnTo=` must start with `/`, else `/credentials`); `**` → `/`. All feature routes lazy-loaded; `PreloadAllModules` enabled.
- **Auth** (`core/auth/`): JWT in `localStorage['uptrack_token']`; `AuthStore` (signals) with memoized idempotent `bootstrap()` calling `GET /api/auth/me`, invoked lazily from the guards (not `APP_INITIALIZER` — fixed in `8ac5f03`); any 401 → clear session + navigate `/`; login/register → store token + navigate `/dashboard`; logout is client-only. `authInterceptor` attaches `Authorization: Bearer` to API requests except public paths (`/api/auth/login`, `/api/auth/register`, `/api/health`).
- **API layer** (`core/api/`, `services/`): `API_BASE_URL` from `environment.ts` (`http://localhost:8080/api` dev; production file holds the suspended hosted URL — React must not hard-code any host); URL/param builders; error parser reading `{status, error, message}` bodies with status-0 network fallback; typed models in `models/` mirroring backend DTOs (note the literal JSON key `requiredCEHours`).
- **Server state**: no server-state library. Services return observables consumed by components; cross-feature refresh after any credential/CE write is a global `CredentialWriteEventsService.revision` signal that dashboard, credentials, CE pages and drawers subscribe to.
- **Feature behavior**: dashboard from one `GET /api/dashboard` call (stats, upcoming expirations 0–90 d, CE attention, recent activity capped at 4 in UI); credentials list with 250 ms debounced search, status/type chips, sort by expiry asc, stale-response guard; CE page flattens nested `ceRecords` from `GET /api/credentials` client-side, 10-per-page pagination, in-memory filters (search/credential/certificate), desktop table ≤768 px stacked cards; credential/CE forms as dialogs with inline validation and server-error banner that keeps the dialog open; drawers (right-side, modal, Esc/overlay close, focus returned to opener); certificate upload on file select via multipart `POST /api/uploads/certificates` (types pdf/jpg/jpeg/png/webp/gif, no client size check); CE report page with print flow (removes `.dark`, `@page` margins, `.screen-only` hidden in print); settings profile + change-password flows against `/api/users/me*`.
- **Theme/layout** (`layout/shell.component.ts`, `styles.scss`): `.dark` class on `<html>`; keys `uptrack-theme` (shell), `uptrack-landing-theme` (landing), `uptrack-sidebar-collapsed`; `prefers-color-scheme` fallback; mobile breakpoint `window.innerWidth <= 768`; design tokens as CSS variables (`--ut-primary` #185FA5/#378ADD, status palettes for ACTIVE/EXPIRING_SOON/EXPIRED in both themes); fade-in animation on loaded content.
- **UI library usage** (PrimeNG, counted from source): `Button` (16), `Dialog` (7), `Card` (4), `Menu` (2), `InputText` (2), `Drawer` (1), `Avatar` (1), `Tooltip` (1), plus `providePrimeNG` theme config (Aura, `.dark` selector, CSS layers).
- **Testing**: Vitest via `@angular/build:unit-test` (38 tests); no lint script, no e2e; build has 5 budget warnings.
- **Known defects** (preserved in `baseline/defects.md`, referenced not erased): security S1–S8 (S1–S4 remediated by S01), backend B1–B8, frontend F1–F15 (theme-key split F1, focus restore F11, Esc/backdrop F12, title "Frontend" F8, a11y gaps F7, etc.). M02 decision: F7/F8/F11/F12-class issues are **fixed deliberately** in the React milestones as documented improvements, not parity regressions (human decision 7).

## 3. Target React architecture

- **Stack** (all approved, human decision 5): React 19, TypeScript strict mode, Vite (dev server + build), Flowbite React component library, Tailwind CSS 4 (`@tailwindcss/vite` plugin), React Router (data router, `createBrowserRouter` + lazy routes), TanStack Query v5 (all server state), native `fetch` centralized in one client, React Hook Form + Zod (`@hookform/resolvers`) for forms, `lucide-react` icons, Vitest + React Testing Library (jsdom) for unit/component tests, Playwright for e2e/screenshot parity. No Redux/Zustand or other state library.
- **App composition**: `QueryClientProvider` + `AuthProvider` + `ThemeProvider` wrap the router; route loaders/guards (not app bootstrap) trigger lazy session restoration, mirroring the fixed Angular guard behavior (no render-blocking bootstrap, no landing flash).
- **HTTP**: single `apiFetch` in `core/api/`; base URL from `import.meta.env.VITE_API_BASE_URL`, dev default `/api` served through a Vite `server.proxy` entry to `http://localhost:8080` (eliminates CORS/S7 in dev without any backend change); attaches Bearer except public paths; parses the backend error body into a typed `ApiError {status, message}`; network failure (fetch reject) mapped to a distinct "unable to reach server" message; optional `AbortSignal` pass-through for cancellation.
- **Server state**: TanStack Query with a query-key factory (`['auth','me']`, `['dashboard']`, `['credentials', filters]`, `['credential', id]`, `['credential', id, 'ce-records']`, `['credential', id, 'ce-report']`, `['ce-record', id]`, `['profile']`); mutations invalidate the affected keys — the React-native replacement for the Angular revision signal; `retry` disabled for 4xx; stale-time and cache policy documented in `parity-contract.md`.
- **Auth state**: React context + `useReducer` (no external library); token persisted in `localStorage['uptrack_token']` (human decision 1 — contract preserved, XSS/no-revocation risks documented as known limitations, see section 10); single-flight session bootstrap (`GET /api/auth/me`) awaited inside the protected-route guard and the landing redirect guard; any 401 response anywhere → clear session + redirect `/`.
- **Routing**: React Router data router replicating the exact Angular route matrix (parity contract §2), including the four `/app/*` redirects, report route outside the shell, `?credentialId=` / `?returnTo=` query-param semantics, and `**` → `/`.
- **Theme**: Tailwind v4 class-based dark mode (`@custom-variant dark` on `html.dark`); design tokens expressed as Tailwind v4 `@theme` values plus the existing `--ut-*` CSS variables where components need them; **single** `uptrack-theme` localStorage key (human decision 2) applied by an inline script in `index.html` before first paint (fixes F1's report-route flash); `prefers-color-scheme` fallback; landing uses the same key.
- **Layout**: responsive shell with sidebar — desktop collapsible (persisted `uptrack-sidebar-collapsed`), off-canvas drawer at ≤768 px (`md:` breakpoint in Tailwind = 768 px, matching Angular exactly); 44 px minimum tap targets; semantic HTML throughout.

## 4. Key architectural decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | React 19 + TS strict + Vite in sibling `frontend-react/` | Modern, fast, minimal toolchain; Angular app untouched as reference. Vite chosen over other bundlers for ecosystem fit with Vitest and Tailwind v4. |
| D2 | Flowbite React + Tailwind CSS 4 for UI | Approved UI direction (AGENTS.md); Flowbite primitives first, custom composition only for gaps (§6 mapping). Tailwind v4 replaces PrimeNG theming/SCSS. |
| D3 | React Router data router with lazy routes | Direct equivalent of Angular lazy routes + guards; loaders give a natural place for the lazy session bootstrap. |
| D4 | TanStack Query for all server state; context for auth/UI state | Server state (caching, invalidation, loading/error) belongs to a server-state library; auth token + user is small local state — no external store needed (AGENTS.md: no extra state library without approval). |
| D5 | One `fetch` client, env-driven base URL, Vite `/api` proxy in dev | Native fetch per AGENTS.md; proxy avoids CORS changes to the backend (S7); `VITE_API_BASE_URL` keeps the suspended hosted URL out of the repo (human decision 6). |
| D6 | RHF + Zod schemas mirroring backend Bean Validation | Typed, testable validation co-located with forms; mirrors Angular reactive-form behavior incl. "server error keeps dialog open". |
| D7 | Keep `localStorage` JWT + Bearer contract (human decision 1) | Parity with the S01-verified backend contract; changing storage (e.g. httpOnly cookie) would require backend changes, which are out of scope. XSS exposure and lack of revocation documented as known limitations for later review. |
| D8 | Single `uptrack-theme` key, theme applied pre-paint in `index.html` (human decision 2) | Consolidates the split keys (F1) and removes the report-route light flash; invisible-behavior improvement, documented. |
| D9 | CE records derived from `GET /api/credentials` via a dedicated adapter/query function (human decision 3) | Preserves Angular behavior exactly, keeps credential context (name/org) available for CE rows, and decouples components from the nested response shape. `userId` param is not sent (human decision 4; post-S01 the list is always caller-scoped and the param is ignored). |
| D10 | Fix F7/F8/F11/F12-class issues in respective React milestones (human decision 7) | A11y (aria-live, labels, aria-pressed/expanded, focusable rows), focus restore on dialog close, Esc/backdrop dismissal, real document titles — intentional improvements, documented as deviations in each milestone report, not parity regressions. |
| D11 | lucide-react for icons | Already sanctioned in `architecture.md`; maps 1:1 to the icon table in `project-overview.md` (Shield, Award, BookOpen, Heart, LayoutDashboard, FolderOpen, ClipboardList). |
| D12 | Testing: Vitest+RTL unit/component, Playwright e2e + screenshots vs committed M01 baseline | Closes the "no lint/no e2e" gap (F10) with scripts `typecheck`, `lint`, `test`, `build`, `e2e`; parity evidence compared against `baseline/screenshots/`. |

## 5. Proposed project and folder structure

```text
frontend-react/
├── index.html                  # inline pre-paint theme script; real <title>; Vite entry
├── vite.config.ts              # react + tailwindcss plugins; server.proxy /api → localhost:8080 (env-overridable target)
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json   # strict mode
├── eslint.config.js            # flat config (typescript-eslint, react, hooks, jsx-a11y)
├── vitest.config.ts            # jsdom environment, RTL setup
├── playwright.config.ts        # e2e against local backend; screenshot comparison harness
├── package.json                # pinned deps + lockfile; scripts: dev, build, typecheck, lint, test, e2e
└── src/
    ├── main.tsx                # providers: QueryClientProvider, AuthProvider, ThemeProvider, router
    ├── app/
    │   ├── router.tsx          # createBrowserRouter route tree (parity contract §2)
    │   └── providers.tsx
    ├── core/
    │   ├── api/                # apiFetch client, ApiError, query-key factory, api modules (auth/credentials/ce-records/dashboard/uploads/users)
    │   ├── auth/               # AuthProvider, useAuth, token storage, bootstrapSession, guards (ProtectedRoute, LandingRedirect)
    │   └── theme/              # ThemeProvider, useTheme, pre-paint init, token definitions
    ├── features/
    │   ├── landing/            # landing page + auth modal (M07)
    │   ├── dashboard/          # page + panels + stats (M08)
    │   ├── credentials/        # list, card grid, filters, form dialog, detail drawer (M09)
    │   ├── ce-records/         # table/cards, pagination, filters, form dialog, detail drawer (M10)
    │   ├── ce-records/adapters/  # credentials→CE rows adapter (decision D9)
    │   ├── ce-report/          # report page + print flow (M11)
    │   ├── settings/           # profile + password (M12)
    │   └── drawers/            # shared drawer shell + containers
    ├── shared/ui/              # Flowbite compositions: AppModal, DrawerShell, StatusBadge, ProgressBar, Spinner/Skeleton, EmptyState, ErrorState, ConfirmDialog, form fields
    ├── lib/
    │   ├── dto/                # TS types mirroring backend DTOs exactly (incl. requiredCEHours key)
    │   ├── validation/         # Zod schemas per form, mirroring Bean Validation rules
    │   └── utils/              # date/status/format helpers, error-message mapping
    └── styles/
        └── globals.css         # Tailwind v4 import, @theme tokens (--ut-* palette, both themes), print rules, animations
```

Conventions: kebab-case file names, one responsibility per component, feature-first organization, co-located tests (`*.test.tsx`), no `any` (strict TS), import order: react/libs → core → shared → features → lib → relative.

## 6. Mapping of Angular features to React equivalents

Full route/API/state detail is in `parity-contract.md`. Summary:

| Angular construct | React equivalent |
|---|---|
| Standalone components + signals | Function components + hooks; local state via `useState`/`useReducer`; server state via TanStack Query |
| `AuthStore` (signals, localStorage token) | `AuthProvider` context + reducer; same localStorage key; same guard-lazy bootstrap |
| `authInterceptor` (Bearer attach, 401 handling) | `apiFetch` header logic + central 401 handler in auth context/query client |
| RxJS services (`CredentialService` etc.) | Typed api modules returning promises, consumed via `useQuery`/`useMutation` |
| `CredentialWriteEventsService.revision` | Mutation `onSuccess` invalidation of query keys |
| `app.routes.ts` + guards | `createBrowserRouter` route tree + wrapper guards (ProtectedRoute/LandingRedirect) |
| `p-dialog` (7 uses: auth modal, credential/CE forms, logout confirm, password) | Flowbite `Modal` wrapped in shared `AppModal` (focus restore, Esc/backdrop close — fixes F11/F12) |
| `p-drawer` (right, modal, dismissible) | Flowbite `Drawer` (right position) in shared `DrawerShell` |
| `p-card`, `p-avatar`, `p-menu`, `p-button`, `p-inputtext`, `p-tooltip` | Flowbite `Card`, `Avatar`, `Dropdown`, `Button`, `TextInput`/`Label`, `Tooltip`; Tailwind for layout |
| PrimeNG Aura theme + CSS layers + `--ut-*` vars | Tailwind v4 `@theme` tokens + `globals.css`; `.dark` class strategy preserved |
| Reactive forms + template validation | RHF + Zod resolver, inline errors, server-error banner |
| Angular HttpClient params | `URLSearchParams` builder in `apiFetch` (skips null/undefined/empty, same as `buildHttpParams`) |
| Vitest via Angular builder | Vitest + RTL directly; Playwright for e2e |

**Unsupported patterns requiring custom composition** (PrimeNG → custom/ Flowbite gap): right-side modal drawer with blockScroll + focus return (compose Flowbite `Drawer` + focus trap utility); dialog with embedded complex forms + server-error banner (shared `AppModal`); status-colored badges driven by design tokens (custom `StatusBadge` on Flowbite `Badge`); CE progress bars (Flowbite `Progress` with token colors); debounced search input (small `useDebouncedValue` hook); confirm dialogs (Flowbite `Modal` variant); print-specific report styling (Tailwind `print:` variant + `@page` in globals.css).

## 7. API integration and authentication strategy

- Base URL: `VITE_API_BASE_URL` env var; dev default `/api` with Vite proxy to `http://localhost:8080` (target overridable, e.g. `VITE_PROXY_TARGET`); production build reads the env var at build time — **no host is committed** (human decision 6).
- Public paths (no Bearer): `/api/auth/login`, `/api/auth/register`, `/api/health`. All other `/api/**` requests attach the token.
- Post-S01 contract (full matrix in `parity-contract.md` §3): register/login/me; `GET/POST /api/credentials`, `GET/PUT/DELETE /api/credentials/{id}`, `GET /api/credentials/{id}/ce-records`, `GET /api/credentials/{id}/ce-report` (query params `status`, `type`, `search` only — **no `userId`**, decision D9); `POST /api/ce-records`, `GET/PUT/DELETE /api/ce-records/{id}`; `GET /api/dashboard`; `POST /api/uploads/certificates` (multipart part `file`); `GET/PUT /api/users/me`, `PUT /api/users/me/password`. General `/api/users` CRUD no longer exists (S01).
- Error handling: every non-2xx parsed into `ApiError {status, message}` from the `{status, error, message, timestamp}` body; 400 validation messages surface per-field where mapped, otherwise as the form banner; 401 → session cleared + redirect `/` (silent, as Angular); 404 → resource error states (drawer/report); 409 → duplicate-email banner; 5xx/502 → generic retryable error state. Network failure → "unable to reach server" message.
- Session: login/register store token + user, navigate `/dashboard`; on app load with a stored token, guards await one `GET /api/auth/me`; success → session restored, failure → token cleared, redirect `/`; logout clears token client-side and navigates `/` (no server call — backend has none).
- Upload: on file select, validate type client-side (pdf/jpg/jpeg/png/webp/gif), `FormData` POST; response `{url, publicId, originalFilename, resourceType}` carried in the CE form until save; failure shows inline error (502 included); replace/remove semantics preserved from Angular flows.

## 8. Component and UI conventions

- Flowbite React primitives first; every shared pattern wrapped once in `shared/ui/` (AppModal, DrawerShell, StatusBadge, ProgressBar, StateBlock for loading/empty/error, ConfirmDialog, FormField) so features never re-compose primitives.
- Status pill colors from the approved token table (light/dark pairs); `EXPIRING_SOON` cards get the colored border alert; progress bars use brightened dark fills.
- Drawers for detail/edit context; modals for short actions (add credential/CE, confirms, password); full pages for lists/dashboard — the Angular interaction hierarchy is preserved.
- Accessibility baseline: semantic landmarks, labelled inputs (fixes F7), `aria-pressed` on filter chips, `aria-expanded` on toggles, `aria-live` regions for async status/errors, focus restore on close (fixes F11), Esc/backdrop dismissal (fixes F12), keyboard-reachable rows, 44 px tap targets, visible focus rings; per-page document titles (fixes F8).
- Responsive: `md:` (768 px) as the shell breakpoint matching Angular; CE table → stacked cards ≤768 px; no horizontal overflow at 375/768/1280 px (verified in parity runs).
- Minimal custom CSS; Tailwind utilities for layout; `globals.css` holds tokens, keyframes (fade-in), print rules only.

## 9. Testing and verification strategy

- `npm run typecheck` (`tsc --noEmit`), `npm run lint` (ESLint flat config incl. jsx-a11y), `npm run test -- --run` (Vitest + RTL: api client error parsing, query-key/invalidation contracts, auth guard/session flows, form validation schemas, adapter transforms, key components), `npm run build` (Vite production), `npm run e2e` (Playwright: register/login/logout/session restore, route guards + redirects, dashboard vs API, credentials CRUD + filters + drawer, CE CRUD + pagination + upload failure path, report + print emulation, settings, theme, 375/768/1280 px, keyboard spot checks) with screenshots compared to `baseline/screenshots/`.
- Evidence policy (from master plan): every check reported PASS/FAIL/NOT RUN with command and exit code; failures preserved, never claimed as passing; successful Cloudinary upload stays NOT RUN unless safe non-production credentials are supplied.
- Per-milestone: fill `verification/mxx-report.md`; update tracker + handoff; human approval before each commit/merge/branch deletion.

## 10. Dependencies and implementation risks

**Scoped dependency list** (to be pinned with lockfile in M03; `npm audit` recorded at scaffold time, with a no-high/critical-production-advisory gate at M13/M14 per the approved assessment):

| Package | Why necessary |
|---|---|
| react, react-dom (19) | framework (approved) |
| react-router-dom | routing/guards (approved) |
| @tanstack/react-query | server state (approved) |
| flowbite-react | UI primitives (approved) |
| tailwindcss@4 + @tailwindcss/vite | styling (approved) |
| react-hook-form + zod + @hookform/resolvers | forms/validation (approved; resolvers is the standard RHF↔Zod bridge) |
| lucide-react | icons (sanctioned in architecture.md) |
| vite + @vitejs/plugin-react, typescript | build/toolchain (approved) |
| vitest + @testing-library/react + @testing-library/user-event + jsdom | unit/component tests (approved) |
| @playwright/test | e2e (approved) |
| eslint + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-jsx-a11y | lint script (closes F10; jsx-a11y enforces the F7 fixes) |

No other libraries. Risks: Flowbite React component gaps (mitigated by the custom-composition list in §6); Tailwind v4 dark-mode class strategy must match `html.dark`; Vite proxy must not leak into prod builds; token-in-localStorage risk (S5) accepted and documented; version drift between spec approval and M03 scaffold (re-pin and re-audit then); Playwright browser availability in CI/dev machines (documented NOT RUN if unavailable).

## 11. Measurable acceptance criteria (M02 itself)

1. This spec contains all 12 required sections and is marked READY with human approval recorded.
2. `parity-contract.md` route matrix covers every entry of `frontend/src/app/app.routes.ts` (10 entries incl. `**`) with guard/redirect/query-param behavior; API matrix covers every endpoint the Angular app calls, cross-checked against post-S01 controller source.
3. `architecture.md` finalized; no open "M02 finalizes" placeholders remain.
4. Folder structure, decision table, PrimeNG→Flowbite mapping (incl. custom-composition list), and dependency table with rationale are present; no unapproved library.
5. Tracker shows M02 = Spec ready on `chore/react-architecture`; handoff and `verification/m02-report.md` updated; stale branch/commit references corrected; `baseline/` files untouched (`git diff --stat` proof).
6. `git diff --stat` on the branch touches only `context/migration/**`; no secrets/tokens/passwords in any file.
7. Verification section of `m02-report.md` records read-only cross-checks actually executed and marks all runtime checks NOT RUN (docs-only milestone).

## 12. Out-of-scope items and future milestones

Out of scope for M02: all code, scaffolding, dependency installs, backend changes, deployments, S02/M03 work. Future: **S02** (dependency remediation — must be merged and verified **before M03 begins**; hosted backend stays suspended and is not redeployed until S02 is verified/merged and deployment is separately approved), then M03 foundation → M14 cutover per `master-plan.md`. Angular deletion is out of scope by default (M14 decision).

## Completion report
`context/migration/verification/m02-report.md`

## Dated clarification — M04 approval, 2026-11-01

The human approved preserving actual Angular mobile behavior at ≤768 px inclusive, with desktop >768 px. The original references equating this to standard Tailwind md were inaccurate at exactly 768 px. Use matching arbitrary media variants and matchMedia without changing the global md breakpoint. This dated clarification supersedes only that wording; the original approval record and historical verification report remain intact. M04 uses canonical labelled presentation placeholders until each later feature/auth milestone implements the final behavior.
