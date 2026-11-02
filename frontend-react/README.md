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
Feature modules (theme/shell, API layer, authentication, landing, dashboard, credentials, CE records, reports, settings) are added in subsequent milestones M04–M12.

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
