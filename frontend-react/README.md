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
