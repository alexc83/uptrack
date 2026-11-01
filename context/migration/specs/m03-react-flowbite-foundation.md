# M03 — React/Flowbite foundation

**Status:** READY — approved by human on 2026-11-01.  
**Branch:** `feature/react-foundation` (created from `main` at `6e0ba0d`)  
**Dependency:** S02 merged and verified (`cb74890`, `6e0ba0d`); M02 architecture approved.  

## 1. Objective
Establish a clean, buildable, testable React application foundation in sibling directory `frontend-react/` that strictly conforms to the approved M02 architecture and parity contract.

## 2. In Scope
- Scaffolding `frontend-react/` with React 19, strict TypeScript, Vite 7, Tailwind CSS 4, Flowbite React 0.12, React Router v7, and TanStack Query v5.
- Pinned dependency manifest (`package.json`) and committed lockfile (`package-lock.json`).
- TypeScript multi-project configuration (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) with strict typechecking.
- ESM-compatible Vite configuration with `/api` dev proxy to `http://localhost:8080` (overridable via `VITE_PROXY_TARGET`).
- Tailwind CSS 4 setup with `@tailwindcss/vite`, Flowbite React integration, UpTrack design tokens (`--ut-*`), and `ut-fade-in` keyframe animation in `src/styles/globals.css`.
- `index.html` with real application title (`UpTrack — Credential & CE Tracking`, fixing F8) and inline pre-paint theme restoration script reading `uptrack-theme` (fixing F1).
- Minimal application root, `QueryClientProvider`, and router foundation (`/` foundation smoke view and `*` redirect fallback).
- Testing infrastructure: Vitest + jsdom + React Testing Library + `@testing-library/jest-dom` unit smoke tests; Playwright standalone E2E smoke tests.
- Toolchain scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, `e2e`.
- Milestone documentation under `context/migration/`.

## 3. Out of Scope
- Modifying or deleting Angular `frontend/` (read-only reference).
- Modifying Java `backend/` or database schemas.
- Contacting, deploying to, or restarting the suspended hosted backend.
- Migrating feature pages (landing, dashboard, credentials, CE records, reports, settings) prematurely (M07–M12).
- Introducing speculative empty placeholder files in future feature directories.
- Any state library outside React Context and TanStack Query.
- Any UI component library outside Flowbite React and custom Tailwind v4 compositions.

## 4. Deliverable File Tree
```
frontend-react/
├── .gitignore                  # ignores dist, node_modules, test results
├── package.json                # pinned dependencies & scripts
├── package-lock.json           # committed lockfile
├── vite.config.ts              # ESM path resolution, React, Tailwind, Flowbite plugins, proxy
├── tsconfig.json               # solution / project references
├── tsconfig.app.json           # strict mode application config
├── tsconfig.node.json          # strict mode tooling config
├── eslint.config.js            # flat config (typescript-eslint, react, hooks, jsx-a11y)
├── vitest.config.ts            # jsdom, globals, setupFiles
├── playwright.config.ts        # standalone E2E configuration with msedge channel
├── index.html                  # pre-paint theme script, real title
├── README.md                   # instructions, architecture overview, scripts
├── e2e/
│   └── smoke.spec.ts           # Playwright smoke test (standalone start, Flowbite styling, theme, routing)
└── src/
    ├── main.tsx                # React DOM entry
    ├── app/
    │   ├── providers.tsx       # QueryClientProvider wrapper
    │   └── router.tsx          # createBrowserRouter foundation
    ├── styles/
    │   └── globals.css         # Tailwind v4, Flowbite source, UpTrack tokens, ut-fade-in
    └── test/
        ├── setup.ts            # @testing-library/jest-dom matchers
        └── smoke.test.tsx      # unit smoke tests
```

## 5. Acceptance Criteria (Given / When / Then)
1. **AC1: Clean Project File Tree**
   - *Given* clean `main`, *when* `feature/react-foundation` is created, *then* all scaffold files exist under `frontend-react/` without empty placeholder files in future feature folders; `frontend/` and `backend/` are 100% untouched.
2. **AC2: Dependency Installation & Lockfile**
   - *Given* `package.json`, *when* `npm install` runs in `frontend-react/`, *then* installation completes cleanly with exit code 0 and generates a committed `package-lock.json`.
3. **AC3: Strict Multi-Project Typecheck**
   - *Given* TypeScript code across application and tooling projects, *when* `npm run typecheck` runs, *then* `tsc -b --noEmit` exits with code 0 and zero type errors.
4. **AC4: Flat ESLint Config with JSX A11y**
   - *Given* TypeScript and TSX files, *when* `npm run lint` runs, *then* ESLint exits with code 0 and zero warnings or errors.
5. **AC5: Unit / Component Smoke Tests**
   - *Given* `src/test/smoke.test.tsx`, *when* `npm run test` runs, *then* Vitest runs in jsdom and passes all tests with exit code 0.
6. **AC6: Production Bundle Build**
   - *Given* the foundation codebase, *when* `npm run build` runs, *then* `tsc -b && vite build` outputs the production bundle to `frontend-react/dist/` with exit code 0.
7. **AC7: Standalone Playwright E2E Suite**
   - *Given* `e2e/smoke.spec.ts`, *when* `npm run e2e` runs, *then* Playwright launches the Vite dev server without the backend, renders the foundation page, verifies Flowbite button styling, verifies pre-paint theme toggling, verifies wildcard route fallback, and passes 100%.
8. **AC8: Entry HTML & Pre-Paint Script**
   - *Given* `index.html`, *when* inspected, *then* it specifies `<title>UpTrack — Credential &amp; CE Tracking</title>` (fixing F8) and contains an inline script that evaluates `localStorage['uptrack-theme']` before first paint (fixing F1).
9. **AC9: Security Audit**
   - *Given* installed dependencies, *when* `npm audit` and `npm audit --omit=dev` run, *then* findings are recorded, with zero high or critical vulnerabilities in production dependencies.
10. **AC10: Milestone Tracking & Handoff**
   - *Given* milestone completion, *when* presented, *then* `specs/m03-react-flowbite-foundation.md` is marked READY, `migration-status.md` reflects S02 Merged / M03 In progress, `agent-handoff.md` is updated, and `verification/m03-report.md` records all execution evidence with exact commands and exit codes.

## 6. Verification Commands
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `npm audit`
- `npm audit --omit=dev`

## 7. Completion Report
`context/migration/verification/m03-report.md`
