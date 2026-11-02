# UpTrack — React Frontend (`frontend-react/`)

The React frontend for UpTrack, replacing the legacy Angular 21 + PrimeNG client.

## Technology Stack
- **Framework**: React 19 + TypeScript (strict mode)
- **Bundler & Dev Server**: Vite 7
- **Styling**: Tailwind CSS 4 (`@tailwindcss/vite`)
- **UI Components**: Flowbite React 0.12
- **Routing**: React Router v7 (`createBrowserRouter`)
- **Server State**: TanStack Query v5
- **Forms & Validation**: React Hook Form + Zod + `@hookform/resolvers`
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library + `@testing-library/jest-dom` (unit); Playwright (E2E)
- **Linting**: ESLint flat config with TypeScript-ESLint, React Hooks, and JSX A11y

## Development Scripts
- `npm run dev` — start Vite dev server at `http://localhost:5173` (with `/api` proxy to backend)
- `npm run build` — build production bundle in `dist/`
- `npm run typecheck` — validate TypeScript strict mode (`tsc -b --noEmit`)
- `npm run lint` — run ESLint with JSX accessibility rules
- `npm run test` — run Vitest unit and smoke tests in jsdom
- `npm run e2e` — run Playwright E2E tests against local dev server

## Milestone Status
Established during **M03 — React Project Scaffold & Foundation**.
M04 provides theme/shell and shared presentation. M05 provides dormant HTTP/query infrastructure. Authentication and business features remain later milestones; current verification and limitations are in `../context/migration/verification/m05-report.md`.

## M04 shell and shared UI

`/` retains the M03 foundation smoke view. `/dashboard`, `/credentials`, `/ce-records`, and `/settings` are **migration previews**, currently unguarded and containing no business functionality. The standalone report placeholder is outside the shell. M06 owns authentication and will replace this explicitly temporary state. The dashboard's generic shared UI gallery is development-only and is removed by the production build.

- Desktop: 272 px sidebar, 88 px collapsed; preference key `uptrack-sidebar-collapsed`. Mobile ≤768 px inclusive; desktop >768 px. Do not substitute standard md at the boundary.
- Use `PageContainer`/`PageHeader` from `shared/layout`; the shell owns main scrolling. Sidebar header holds brand/theme/collapse; footer holds the preview account menu.
- `core/theme/use-theme` reads UpTrack context. The inline HTML script initializes `html.dark` before the stylesheet/application; React adopts that class. Only `uptrack-theme` stores mode. Flowbite ThemeProvider configures component styles, not mode. Default OS preference is resolved at startup; explicit toggles persist where storage is available.
- Use Flowbite Card/Button/fields directly. Shared `FormField` supplies id/aria-describedby/aria-invalid through a render prop; it does not own validation or form state. `StatusBadge`/`ProgressBar` present supplied values without deriving business rules.
- `StateBlock` takes loading/empty/error variants, copy and optional action callbacks. Use distinct empty/no-match copy. Loading and errors announce changes.
- Controlled `AppModal` and `DrawerShell` accept title, open/onClose and optional focus refs. `AppModal` also accepts description/error/footer. Prefer supplied initial/return/fallback focus targets when the opener may disappear. `ConfirmDialog` initially focuses Cancel; callers own confirmation effects.
- OverlayProvider coordinates portal isolation, top-layer dismissal and scroll cleanup. Only drawers receive a custom focus trap. Flowbite retains modal focus management. A modal can open over a drawer and Escape closes one layer at a time.
- Table convention: use Flowbite Table with labelled column headers and explicit keyboard-reachable action buttons. M10 owns CE-specific mobile cards; M04 adds no generic data-table engine.

Existing M03 smoke tests remain unchanged. New browser tests observe and block API requests and fail on any attempted `/api` contact or uncaught browser error. Visual baselines in `e2e/visual.spec.ts-snapshots` were inspected against M01 shell references; `npm run e2e` compares them without updating. Browser/OS/font differences require inspection, not automatic baseline replacement.

Do not update validation dependencies during M04. Before M06 forms, the resolver/Zod 4 compatibility gate in the M06 spec must pass; installed resolver 3.10.0 currently rejects invalid Zod 4 data instead of returning field errors. Preserve the deepmerge-ts override and tracked tooling advisories.

## M05 HTTP and query foundation

`core/api/api-fetch.ts` exports inert `apiFetch` and `createApiClient({baseUrl, fetch, getAuth})` for deterministic testing. `VITE_API_BASE_URL` defaults to `/api`; Vite's existing proxy targets local port 8080 (`VITE_PROXY_TARGET` can override it). Configuration is build-time and is not a credential store. No M04 preview invokes the client; no backend is needed to render or test the shell.

Use relative paths and `query` scalar values; null/undefined/empty strings are omitted, while zero/false and search whitespace are preserved. Requests stay under the configured origin/base path, and redirects are blocked. `json` and `formData` are mutually exclusive. The client owns Authorization and Content-Type: JSON gets application/json, native FormData supplies its own multipart boundary. No request retries occur in transport.

JSON mode returns `Promise<T>` after JSON parsing, **without runtime DTO validation**. Select `{ response: 'empty' }` for void/delete/password responses. Unexpected empty/204/malformed JSON success throws `ApiError` kind `response` with actual HTTP status. Non-2xx throws kind `http` with actual status and unknown parsed/raw `details`; only a string backend message overrides the established fallback. Network failure is kind `network`, status 0. Do not log raw errors/details that may contain sensitive backend data. Native abort rejections/reasons are preserved, including body-read cancellation.

`registerApiAuth({ getToken, onUnauthorized })` in `core/api/api-auth.ts` returns identity-safe cleanup. M06 supplies these synchronous callbacks; transport reads no storage, decodes no JWT and performs no session effects. Login/register/health never read or attach a token or notify unauthorized. A late protected 401 only notifies if registration and token are still current. M06 must re-register on replacement sessions and implement its own session generation and cache clearing. Caller Authorization overrides are discarded; redirects cannot forward bearer credentials elsewhere.

Thin modules `auth-api`, `credentials-api`, `ce-records-api`, `dashboard-api`, `uploads-api`, `users-api` describe 19 callable endpoints with optional signal arguments. `lib/dto/` preserves Spring wire shapes, arrays, raw ratios and nullable certificate metadata. There is no invented pagination envelope or feature hook; CE flattening/client pagination belongs to M10. Registration/login bindings do not persist returned tokens.

The existing provider owns one production QueryClient initialized by `createQueryClient`. Only HTTP 5xx gets at most two retries; 4xx, network, response, cancellation and unknown failures never retry. Mutations never retry. Lists/dashboard use 30-second freshness; credential/CE detail/report/auth/profile use zero. Leave other Query defaults unchanged. `query-keys.ts` provides canonical M02 keys; `invalidation.ts` invalidates lists/dashboard/affected credential prefixes and CE detail IDs. Future mutation callers supply old/new credential contexts; a cascading delete can also invalidate the CE-detail root. No optimistic update or session cache clearing is implemented here.

Query functions must pass their context.signal into the endpoint binding. TanStack then owns cancellation/reversion; a separately aborted Fetch is a native abort, not a synthesized TanStack CancelledError. Isolate tests with factory-created clients and clear their caches afterward.

New native browser fixtures use intercepted localhost requests; unmatched API/external requests are blocked. Existing M04 fixtures retain zero-API assertions. Captures now go to ignored `test-results/evidence/`; historical M04 evidence and the eight snapshot goldens are never overwritten. Browser coverage is Edge on macOS, not cross-engine/OS parity. The M05 report preserves the original intermittent Escape-test failure and its diagnosis: initial drawer focus opens the theme tooltip, whose first Escape dismissal precedes drawer dismissal. The approved test correction explicitly verifies both layers and focus restoration; five consecutive default parallel suites pass without worker/timeout changes.
