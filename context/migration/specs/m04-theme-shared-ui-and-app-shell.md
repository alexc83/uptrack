# M04 — Theme, shared UI and app shell

**Status: READY — implementation plan approved by the human on 2026-11-01.**
**Branch:** `feature/react-app-shell`, from clean `main` at `9e297f8b034575785cd4d6323464d34e6e8c8058`.
**Prerequisites:** M01/S01/M02/S02/M03 merged. M03 commits: `eb7948b`, `9e297f8`.

## Approval and boundaries

The human approved the independently audited M04 plan and subsequently authorized implementation. This specification records that approved scope before application edits. No additional package, dependency version, auth mechanism, API client, business feature, backend/Angular edit, deployment, or M05 work is authorized. Commit, push, merge and branch deletion each need separate authorization. Historical reports and M01 screenshots remain unchanged.

## Source evidence

- Angular `frontend/src/app/layout/shell.component.{ts,html,scss}`, `src/styles.scss`, `src/app/app.routes.ts`.
- Angular shared drawer shell and credential form dialog; dashboard-page and credentials loading/error/empty styles.
- M01 `baseline/runtime-results-ui.md`: P375/P768/P1280, T1/T2/T3, K1/K2, C5.2 and D1.6; screenshots `d1-dashboard-populated-1280.png`, `t1-dashboard-dark-1280.png`, `p-credentials-768.png`, `c5-credential-drawer-1280.png`.
- Approved M02 architecture/parity contract; M03 scaffold, lockfile and smoke tests.
- Installed Flowbite 0.12.17 source: Modal already has Floating UI focus management and scroll lock; Drawer has Escape/backdrop but no focus trap or scroll lock.

## Architecture and interfaces

Preserve QueryClient defaults, StrictMode, Vite configuration, existing root smoke view/tests, and CSS integration. Add UpTrack theme context, Flowbite theme configuration (styles only), and a minimal overlay coordinator to AppProviders.

Hierarchy: AppShell → desktop sidebar OR mobile left DrawerShell → SidebarHeader (brand/theme/collapse), PrimaryNavigation, AccountMenu footer; independently scrolling main → MobileToolbar → Outlet → PageContainer/PageHeader. No persistent desktop content header.

- `useTheme`: theme `light | dark`, setTheme, toggleTheme. Initialize from pre-painted html.dark. One storage key: `uptrack-theme`; explicit choice wins over OS. Invalid/missing storage uses OS on initialization. Denied storage must not crash or prevent OS fallback. No Flowbite mode hook or second storage system.
- AppShell: desktop sidebar 272/88 px; persist collapse as true/false in `uptrack-sidebar-collapsed`. Mobile ≤768 px, desktop >768 px; shared matchMedia and matching arbitrary Tailwind media variants, without changing global md. Navigation width min(300px, 100vw - 2rem). Mobile starts closed, closes on selection/location change/Escape/backdrop/X/desktop transition. Desktop preference survives resizing. Main scrolls independently in 100dvh.
- PageContainer: min-width zero, 16 px mobile/24 px desktop padding and 24 px section gaps. PageHeader: eyebrow, one h1, description, wrapping action slot.
- AccountMenu: optional display identity/logout callback; explicit preview identity; Settings navigation with state.from; disabled logout until M06.
- AppModal: controlled open/onClose, title/description, content/footer, initial/return focus refs, optional error region. Preserve Flowbite focus mechanisms; no duplicate modal trap.
- DrawerShell: controlled open/onClose, navigation/detail variant, left/right position, labelled title, focus refs. Detail width matches Angular: min(92vw,30rem), ≤1024 min(96vw,34rem), ≤640 full width.
- Overlay coordinator: portal hosts, topmost dismissal ownership, background inert and scroll locking, drawer-only Tab containment, focus return. Modal over drawer must close one layer at a time and return focus first into drawer, then to opener. Closed drawers unmount. Empty drawers focus their panel; disconnected openers use a supplied page fallback. StrictMode cleanup restores prior styles/inert state.
- FormField: control id, label, hint/error and accessibility attributes through a render prop. Flowbite inputs remain directly usable with RHF later; no schemas or resolver workaround.
- StatusBadge: supplied status/label → Flowbite Badge with approved tokens. ProgressBar: supplied percentage/label/tone → Flowbite Progress; visual clamp 0–100, no CE calculations.
- StateBlock: discriminated loading/empty/error presentation with supplied messages/actions; no-match is distinct copy. Skeletons theme-aware; Spinner/Alert from Flowbite.
- Use Flowbite Card/Button/Dropdown/Avatar/Sidebar/Tooltip/Label/TextInput/Select/Textarea/Table directly with shared theme settings. Table convention: labelled headers, keyboard-reachable action buttons, responsive containment; no data-table abstraction.

## Routes and preview behavior

Preserve `/` foundation smoke view, add a shell-preview link. Lazy placeholders at `/dashboard`, `/credentials`, `/ce-records`, `/settings`, each labelled “Migration preview — feature not implemented.” Four exact legacy redirects: `/app`, `/app/dashboard`, `/app/credentials`, `/app/ce-records`. Wildcard → `/`. Standalone `/credentials/:credentialId/ce-report` placeholder outside shell. Preserve query strings; do not implement credentialId or returnTo feature behavior. No guards/loaders/token reads/API calls. M06 owns future auth protection. Dashboard placeholder contains a development-only generic shared UI preview, with no invented business widgets or records.

## Theme and accessibility

Keep and harden index.html pre-paint restoration before module execution; do not introduce independent initialization. Bind color-scheme and React state to html.dark. Complete Tailwind @theme inline aliases for --ut-* plus surfaces/text/borders. Preserve primary #185FA5/#378ADD and approved status palettes. Theme-aware gradients and existing 180 ms fade-in; reduced-motion disables nonessential animation.

Semantic landmarks, skip link, labelled nav/inputs, aria-current, aria-expanded/pressed where relevant, visible focus rings, ≥44×44 px interaction targets, per-page titles, status/busy and error announcements. Confirm initial focus is Cancel. Dismissal via Escape/backdrop/X; inside clicks do not dismiss. Mobile navigation completion focuses new page heading; cancellation restores trigger.

## Ordered implementation and gates

1. Theme provider/tokens: theme unit tests plus existing smoke tests.
2. Shell/responsive navigation: component tests for collapse, links and boundary.
3. Shared presentation primitives: semantic render/action/form associations.
4. Modal/drawer coordinator: focus, dismissal, nested overlays and cleanup tests.
5. Lazy route placeholders and development preview: router tests.
6. Browser, accessibility and visual checks: screenshot inspection and measured geometry.
7. Documentation/report: actual commands/results, unchanged frontend/backend/manifest checks, review handoff. Do not commit.

## Acceptance criteria (Given / When / Then)

| ID | Given / When / Then |
|---|---|
| AC1 | Given desktop 1280 px, when expanded/collapsed, then sidebar measures 272/88 px ±1 and persists after reload; active links expose aria-current. |
| AC2 | Given 375/767/768 px, when opened, then mobile drawer fits, traps focus, isolates background and closes on all specified paths; at 769 px desktop returns with saved preference. |
| AC3 | Given explicit light/dark or missing/invalid/denied storage and either OS preference, when page initializes or theme toggles, then class, context, controls, tokens and persistence agree without crashing. |
| AC4 | Given the application module is blocked, when root/shell/report documents load, then inline theme initialization and CSS still apply the expected background/class before React runs. |
| AC5 | Given keyboard use, when navigating shell/menu/skip link, then all actions work with meaningful names, visible focus and ≥44 px targets; no closed off-canvas controls remain tabbable. |
| AC6 | Given modal/drawer and nested modal-over-drawer, when Tab/Shift+Tab/Escape/backdrop/X are used, then only the top layer responds; focus returns correctly; prior scroll/inert state restores after final close, including StrictMode cleanup and missing opener. |
| AC7 | Given loading/empty/no-match/error examples and labelled form controls, when rendered/acted upon, then status/error semantics, labels/hints/errors and supplied callbacks work. |
| AC8 | Given both themes at 375/768/1280 px, when shell/preview/overlays render, then no document/main horizontal overflow, geometry fits, main scroll is independent, reduced-motion applies, and computed colors/spacing match tokens. |
| AC9 | Given canonical/legacy/unknown URLs, when visited, then placeholders/redirects/outside-shell report behave as specified without consuming feature query parameters. |
| AC10 | Given backend stopped, when all M04 flows execute, then zero /api/** requests occur; original 2 unit/3 browser smoke tests still pass. |
| AC11 | Given verification commands, when run, then typecheck/lint/test/build/e2e pass; audit output is recorded and no high/critical production advisory regression is accepted silently. Existing dev advisories remain tracked. |
| AC12 | Given completion, when reviewed, then spec/tracker/handoff/current-feature/report record evidence, files, intentional F7/F11/F12 improvements and limitations; frontend/backend/dependencies and historical evidence are unchanged. |

## Verification implementation

Co-located Vitest/RTL tests: theme/storage, shell navigation/collapse, account menu, modal/drawer layering and focus cleanup, fields/badges/progress/states, route matrix. Shared utilities: fresh QueryClient + memory router + providers + userEvent, configurable matchMedia; reset classes/storage/inert/scroll state after tests.

Playwright Edge: desktop/mobile/boundary 767/768/769; both themes 375/768/1280; keyboard/menu/skip link; persistence/pre-paint (block module); all overlay close paths/nesting; computed styles, target sizes, no overflow, zero API calls. Inspect screenshots against M01 shell regions (business content differs). Capture expanded/collapsed, mobile closed/open, UI examples, dialogs/drawers/nesting. Only establish React snapshots after inspection; unexplained rerun differences fail.

Commands from frontend-react: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test -- --run`, `npm run build`, `npm run e2e`, `npm audit`, `npm audit --omit=dev`. Record command/exit/counts/browser/viewports/evidence and PASS/FAIL/BLOCKED/NOT RUN. Known full-audit nonzero is a deferred failure, not clean PASS. Essential blocked browser checks prevent Verified. No backend tests required because backend is unchanged.

## Files

Modify frontend-react index.html, src/main.tsx (move CSS entry into HTML for real pre-paint styling), README.md, src/app/providers.tsx, src/app/router.tsx, src/styles/globals.css, src/test/setup.ts. Add theme files under src/core/theme; shell/layout under src/shared/layout; presentation and overlays under src/shared/ui; lazy previews under src/app/preview; test helpers and co-located tests, e2e app-shell/theme/shared-ui specs and screenshot evidence. Exact delivered file list must be recorded in m04-report.md. Existing smoke tests stay unchanged.

Documentation: this spec; migration-status.md, agent-handoff.md, master-plan.md, feature-inventory.md, verification/m04-report.md, context/current-feature.md. Approved breakpoint clarification in architecture.md/parity-contract.md and dated append-only clarification in M02 spec. Preserve historical milestone reports.

## Dependency risks and future gate

No installs or manifest/lockfile changes. Preserve Zod 4 and Flowbite deepmerge-ts 8.0.2 override. M03 historical full audit: 16 dev-tree vulnerabilities (14 moderate/2 critical); record current output without deleting that history. Installed lockfile, not M03's version inventory, is authoritative.

**Mandatory before M06 auth forms:** reproduce and resolve the @hookform/resolvers 3.10.0 / Zod 4 compatibility failure through a separately approved dependency decision. Invalid Zod 4 data currently rejects with ZodError (issues array), rather than returning field errors (resolver expects errors array). M04 adds no resolver workaround or business validation.

Completion report: `context/migration/verification/m04-report.md`.

## Implementation completion

Implemented and verified on the approved branch; READY acceptance criteria remain unchanged. See m04-report.md for commands, initial failures/fixes, 32 passing unit tests, 34 passing browser tests, eight inspected/compared visual baselines, and deferred tooling/form-compatibility risks. Post-verification approval: human approved implementation/results and authorized exactly two commits after final scope/evidence checks. React source: `9440d2160f74b43314dfa9519179290d709254dd`; the second commit records documentation/evidence. No push, merge, deployment, branch deletion or M05 work authorized.

## Subsequent merge/push record

After the implementation/verification and two commits above, the human separately authorized merge and push. `main` was fast-forwarded to `b47bd4226c83015139bf9e5a54cd4ad170f06bbd` and pushed to `origin/main`; live remote hash and clean local tree were verified. M04 is Merged. The original feature branch remains retained; no branch deletion, deployment, hosted-backend contact or M05 work was performed. The verification report remains preserved as the pre-merge record.
