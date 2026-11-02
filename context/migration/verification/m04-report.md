# M04 verification report — Theme, shared UI and app shell

Status: **IMPLEMENTED AND VERIFIED — implementation/results approved; two focused commits authorized after final scope/evidence checks.** No push, merge or deployment authorized or performed.
Agent: OpenAI Codex. Date: 2026-11-01.
Branch: `feature/react-app-shell`; base `9e297f8b034575785cd4d6323464d34e6e8c8058`.
Spec: `specs/m04-theme-shared-ui-and-app-shell.md`, READY, expanded before application edits after explicit implementation approval.

## Result and boundaries

Implemented shared theme, Flowbite presentation, shell/navigation, accessible overlays, route placeholders, component/browser tests and visual evidence. Angular, backend, API/DB contracts, package manifest/lockfile, M01 evidence and historical milestone reports remain unchanged. No API integration, JWT/token access, business features, M05 work or deployment. Hosted backend not contacted. No dependencies installed or changed.

Before branching: clean main at expected full hash; main/origin/main ahead/behind 0/0; live `git ls-remote origin refs/heads/main` returned the same hash. M03 is merged (`eb7948b`, `9e297f8`), correcting stale tracker/handoff descriptions. Branch creation was explicitly approved; sandbox Git-ref restriction required escalation.

## Delivered files and responsibilities

The exhaustive changed/new-file list is [m04-evidence/changed-files.txt](m04-evidence/changed-files.txt), including evidence and golden images.

| Area | Files / responsibility |
|---|---|
| Theme | `src/core/theme/{theme-context.ts,theme-provider.tsx,use-theme.ts,flowbite-theme.ts,theme-provider.test.tsx}`; class/context/storage synchronization and component tokens |
| Shell | `src/shared/layout/{app-shell,app-sidebar,sidebar-header,primary-navigation,account-menu,mobile-toolbar,page-container,page-header}.tsx`, `navigation.ts`, `use-shell-navigation.ts`; shell/account tests |
| Shared UI | `src/shared/ui/{app-modal,confirm-dialog,drawer-shell,form-field,status-badge,progress-bar,state-block,skeleton,overlay-provider}.tsx`, `overlay-context.ts`, `use-overlay-layer.ts`; presentation/overlay tests |
| Integration | `src/app/providers.tsx`, `router.tsx`, `router.test.tsx`, `preview/{shell-placeholder,report-placeholder,shared-ui-preview}.tsx`; `src/vite-env.d.ts` |
| HTML/CSS | `index.html`, `src/main.tsx`, `src/styles/globals.css`; HTML stylesheet entry, pre-paint theme, tokens, reduced motion |
| Test utilities | `src/test/setup.ts`, `match-media.ts`, `render-with-providers.tsx`; fresh QueryClient/memory router, storage/DOM isolation and Node-compatible AbortController for native Request |
| Browser | `e2e/{helpers.ts,app-shell.spec.ts,theme.spec.ts,shared-ui.spec.ts,visual.spec.ts}`, eight golden images; existing `e2e/smoke.spec.ts` unchanged |
| Documentation | M04 spec/report, tracker/handoff/master plan/feature inventory, architecture/parity clarification, dated M02 clarification, mandatory M06 prerequisite, current-feature record, React README |

Original `src/test/smoke.test.tsx` and `e2e/smoke.spec.ts` were preserved unchanged (2 unit and 3 browser cases).

## Commands and actual results

All npm commands run in `frontend-react/` unless an initial invocation failure is explicitly noted.

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS — strict application/tooling projects, including browser tests |
| `npm run lint` | 0 | PASS — zero reported warnings/errors |
| `npm run test` | 0 | PASS — 10 files, 32 tests, including original 2 smoke tests |
| `npm run test -- --run` | 0 | PASS — final 10-file, 32-test suite |
| `npm run build` | 0 | PASS — Vite production build; gallery excluded; final main JS approximately 498.51 kB (158.89 kB gzip), CSS 95.35 kB |
| `npm run e2e -- --grep 'visual ' --update-snapshots` | 0 | PASS — established eight inspected golden images in four tests; subsequent verification does not update them |
| `npm run e2e` | 0 | PASS — final full rerun: 34 tests in 34.4 s, including original 3 smoke cases and eight unchanged visual comparisons |
| Focused E2E follow-up (command below) | 0 | PASS — 3 focused checks after opposite-OS preference assertions and browser metadata capture |
| `npm audit` | 1 | **FAIL — deferred tooling risks:** 16 vulnerabilities, 14 moderate and 2 critical; no auto-fix attempted |
| `npm audit --omit=dev` | 0 | PASS — found 0 vulnerabilities |
| `git diff --exit-code -- frontend backend frontend-react/package.json frontend-react/package-lock.json context/migration/baseline context/migration/verification/m03-report.md` | 0 | PASS — protected source/contracts/dependencies/history unchanged |
| `git diff --check` | 0 | PASS — final whitespace check |

Runtime: Node 24.22.0, npm 11.19.1.

Focused follow-up command: `npm run e2e -- --grep 'theme light:|theme dark:|nested dialog'` (3/3 passed after adding opposite-OS assertions and metadata capture).

Browser configuration: Playwright 1.64.1, Microsoft Edge channel on macOS; runtime version in `m04-evidence/browser.json`. Verification starts Vite locally and does not need backend/test accounts. Playwright webServer terminates after the suite.

### Failures and corrections preserved

| Observation | Grounded correction / disposition |
|---|---|
| Three early npm commands were invoked from repository root and failed ENOENT (254) | Corrected working directory to frontend-react; no root package created. |
| Initial typecheck rejected polymorphic SidebarItem `to`, Badge theme shape, nullable manager closure and missing Vite env types | Router link adapter uses href; corrected Badge root theme; narrowed context; added Vite client type reference. No type-safety bypass. |
| Lint found unassociated checkbox label | Added explicit id/htmlFor. |
| Initial unit batch: 15 failures / 12 errors, largely native Request rejecting jsdom AbortSignal | Test-only Node AbortController via existing node:util; corrected disabled-menu assertion to actual button, refreshed link query after router render, and added lazy hydration fallback. |
| Overlay unit tests found disconnected opener/body focus and nested scroll-lock cleanup timing | Body is not an opener; supplied fallback restored. Coordinator reapplies underlying lock before next paint; assertions wait for focus/cleanup completion. |
| First expanded browser run: 23 PASS / 7 FAIL | Waited for lazy shell before first Tab; modal guard assertions poll until Flowbite focus settles. No custom modal focus trap added. |
| Subsequent browser run: 28 PASS / 2 FAIL at 375 px | Hit testing proved Flowbite mobile full-height dialog covered visible backdrop. Theme now uses auto-height content and overlay padding. Real mobile backdrop clicks pass; accessibility mechanisms remain Flowbite-owned. |
| Added prior-style cleanup regression: 5 PASS / 1 FAIL in overlay tests | FloatingOverlay cleared pre-existing body padding. Minimal coordinator now restores only affected original scroll styles/priority and preserves pre-existing inert state; all 32 unit tests pass. |
| Visual inspection caught pale default Flowbite error surface in dark mode | Error StateBlock now uses approved expired background/text tokens; computed-color assertions added for both themes. |
| Sandbox local-port bind EPERM and registry DNS failures | Explicit escalations used for approved local browser checks and npm advisory queries; no workaround or dependency install. |

## Acceptance criteria

| ID | Result | Evidence |
|---|---|---|
| AC1 | PASS | Browser width assertions 272/88 px; collapse/expand and reload; all nav active states and account Settings navigation |
| AC2 | PASS | 375/768 mobile fits min(300px, viewport−32px), starts closed; Escape/X/real backdrop/selection close; 767/768/769 transitions retain collapse |
| AC3 | PASS | Stored light/dark, OS light/dark with absent/invalid/denied storage; context/HTML/button/storage/tokens verified |
| AC4 | PASS | React module blocked at root/credentials/report URLs; HTML class and actual CSS body background still correct; root stays empty |
| AC5 | PASS | Skip link → main, menu keyboard activation/arrow focus, named collapsed links, visible outline; all mobile shell controls ≥44×44 px |
| AC6 | PASS | Modal/drawer close paths and tab containment; nested modal closes alone, focus returns into drawer then opener; empty panel, disconnected opener, StrictMode and previous styles/inert unit checks |
| AC7 | PASS | Labels/hints/errors, aria-invalid, status/busy loading, empty/no-match distinctions, alert/retry callbacks and Cancel-first confirmation |
| AC8 | PASS | Light/dark 375/768/1280 browser captures/no-overflow; drawer widths, independent main scrolling, token computed colors, reduced-motion assertions; visual review below |
| AC9 | PASS | Four exact legacy redirects, canonical labelled placeholders, query preservation, wildcard smoke and report outside shell |
| AC10 | PASS | New browser fixtures block/observe all attempted API calls and report zero; no uncaught browser errors; original smoke cases retained/passing |
| AC11 | PASS with deferred audit failure | Required verification executed; no production advisories; full tooling audit remains FAIL and tracked, not represented as clean |
| AC12 | PASS | Durable spec/tracker/handoff/report and file inventory; protected history/source/dependencies unchanged; only the two subsequently authorized commits; no next milestone started |

PASS means the stated check ran and matched its expectation. FAIL means it ran and failed (including the deferred full audit). BLOCKED means execution was prevented; NOT RUN means not executed with a reason. Initial environment blocks were resolved; no essential M04 check remains BLOCKED or NOT RUN.

## Visual and browser evidence

See [m04-evidence/README.md](m04-evidence/README.md). Eight golden images were inspected directly and compared on a subsequent ordinary E2E run without updating. Additional evidence captures cover forms, states, light/dark desktop/mobile navigation, detail drawers, modal and nested overlays.

M01 comparisons used unchanged `baseline/screenshots/d1-dashboard-populated-1280.png`, `t1-dashboard-dark-1280.png`, `p-credentials-768.png` and `c5-credential-drawer-1280.png`.

Measured/asserted geometry: sidebar expanded 272 px, collapsed 88 px; mobile navigation 300 px at 375/768; detail drawer 375 px at 375, 544 px at 768, 480 px at 1280. Main content scroll changes while sidebar position and window scroll remain unchanged. No document/main horizontal overflow in tested viewports. Light/dark primary colors #185FA5/#378ADD and status text palette confirmed by computed CSS.

Visual judgement: shell surface split, sidebar header/footer placement, active link tint, width, rounded cards and theme palettes follow Angular references. Buttons use approved 44 px targets, icons use approved Lucide mapping; page text is deliberately generic. React golden images establish shared shell/UI appearance, not full feature parity or pixel identity with business screenshots. Feature content/authentication/report printing remain later milestones.

## Architecture decisions and implementation refinements

- Approved breakpoint correction: mobile ≤768 px, desktop >768 px. Arbitrary media variants plus matchMedia; global Tailwind md unchanged. Architecture/parity/M02 clarification updated prospectively.
- One theme key and pre-painted html.dark; no Flowbite mode hook. Component `applyTheme="replace"` preserves custom token classes without retaining conflicting default dark classes.
- CSS entry moved from main.tsx into index.html so pre-paint tests verify real background styling even when React is blocked. This is a small justified addition to the approved file list, not a scaffold replacement. Vite's production CSS output remains normal.
- Added Vite client type declaration for the development-only gallery gate and a small overlay-context file for typed coordination.
- Flowbite owns modal focus trapping. Drawer-only custom trap, portal-host isolation/topmost dismissal and scroll cleanup form the coordinator; no additional package or general overlay framework.
- UI state is component/context state. No server-state or QueryClient policy changes. Optional injected QueryClient enables isolated tests.
- Canonical placeholders are intentionally unguarded until M06, visibly labelled and backend-independent. No feature query semantics are consumed. No fake login/logout workflow.
- F7/F11/F12-class improvements are intentional M02-approved accessibility fixes, not undocumented parity regressions.

## Resolver/Zod compatibility issue — mandatory M06 gate

Versions: @hookform/resolvers 3.10.0, Zod 4.6.7. Reproduction, from frontend-react:

```sh
node --input-type=module -e 'import { z } from "zod"; import { zodResolver } from "@hookform/resolvers/zod"; const resolver=zodResolver(z.object({name:z.string().min(1)})); console.log("valid", JSON.stringify(await resolver({name:"Example"},{},{shouldUseNativeValidation:false,fields:{}}))); try { console.log("invalid", JSON.stringify(await resolver({name:""},{},{shouldUseNativeValidation:false,fields:{}}))); } catch(e) { console.log("invalid rejected", e.constructor.name, "errors array:", Array.isArray(e.errors), "issues array:", Array.isArray(e.issues)); }'
```

Actual exit 0 (probe catches the rejection): valid → `{"errors":{},"values":{"name":"Example"}}`; invalid → `invalid rejected ZodError errors array: false issues array: true`. This is a reproduced compatibility failure, not a passing validation check. The installed resolver checks `.errors`; Zod 4 exposes `.issues`.

M04 adds no schemas, resolver workaround, version change or downgrade. The M06 draft, master-plan gate and handoff now require valid/invalid async resolver verification and a separately approved dependency decision before authentication forms. Do not rely on M03's historical compatibility claim.

## Dependencies, limitations and deferred work

- Manifest and lockfile unchanged. Flowbite deepmerge-ts override retained at resolved 8.0.2; Zod remains 4.6.7.
- Full audit: 16 dev-tree vulnerabilities (14 moderate, 2 critical). Current output includes @vitest/mocker GHSA-82fw-gwwq-j7x9 / GHSA-qxg6-89mg-rqv8, minimatch GHSA-g3hv-75wg-m249 and tinypool GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr plus affected dependants. These affect the existing lint/test tooling tree. M04 uses static local tests, no untrusted mock registration service; no claim that advisories are fixed. Breaking upgrades/force fixes remain unauthorized. Production audit: 0 vulnerabilities.
- Lockfile resolved versions differ from parts of M03 report (e.g. Tailwind 4.3.3, Query 5.105.1, RHF 7.91.0, Playwright 1.64.1). Historical report preserved; lockfile is authoritative.
- NOT RUN: screen-reader audit and other browser engines/OSes (not part of configured M04 browser suite); full cross-feature parity (M13); backend tests/runtime (unchanged and intentionally unnecessary); certificate upload success (historical credential limitation); deployment (unauthorized).
- Golden images are Edge/macOS-specific; inspect differences before adding another platform baseline. Interactions use native inert, with a jsdom-only inert shim in unit tests; native behavior is verified in Edge.
- M04 complete does not mean login, dashboard, CRUD, reports or settings are migrated. M05 has not started.

## Attempts and interventions

The human approved the plan with explicit scope/security/testing conditions and later authorized execution. One user status request was answered during verification. Grounded implementation/test corrections and unsuccessful runs are retained in the table above; no acceptance criteria were relaxed. Changed/new files: 111 (including 37 evidence captures and 8 golden images); exhaustive inventory linked above. No sub-agents were used. Application source/tests were committed as `9440d2160f74b43314dfa9519179290d709254dd` after the final scope check. This documentation commit records the approved handoff.

## Review and approvals

Implementation, branch creation and reported results: approved by human. Exactly two specified commits: authorized subject to final scope/evidence checks, which passed. Push: NOT authorized. Merge: NOT authorized. Branch deletion: NOT authorized. Deployment/backend contact: NOT authorized.

Authorized focused commits:

1. `feat(react): add themed application shell and shared UI`
2. `docs(migration): record M04 verification and handoff`

Next action: stop after the two approved commits and report hashes, exact changed-file inventory, branch diff and clean working tree. Keep the milestone branch; await separate push/merge authorization and do not advance to M05.

## Final pre-commit scope and evidence check

- Inventory matched exactly 111 approved paths. Commit 1 contains 51 React application/test source files only. Commit 2 contains 60 documentation/verification files: migration docs, React README, 37 deliberate evidence screenshots, 8 deliberate golden images and evidence metadata/inventory/notes.
- Protected Angular/backend sources, manifest/lockfile, original 2 unit/3 browser smoke tests, M01 baseline and all earlier verification reports match main byte-for-byte. No node_modules, dist, ignored transient screenshots/test reports, environment files or build output staged.
- Application call-site inspection found no fetch/XMLHttpRequest/axios calls, JWT token reads, Authorization wiring or server-state hooks in the M04 additions. Runtime zero-API-request assertions remain the browser evidence.
- The controlled preview screenshot pipeline captures only browser viewport UI from generic local presentation examples; no auth/session/backend records are used. Reviewed images show no credentials or real personal/health data. Text secret-pattern checks found no private keys, access keys, provider tokens or JWT literals in the approved changes.
- The eight Edge/macOS golden comparisons remain tied to the unchanged M01 reference images through the evidence README and visual section above. Browser/OS coverage limits, the mandatory resolver/Zod 4 prerequisite, and 16 deferred tooling findings remain explicit. No historical report was rewritten.
- No application code changed during this commit-only review; prior passing typecheck/lint/32 unit/build/34 browser results remain applicable. Git staged-diff checks passed. The second commit refers to itself rather than embedding its own hash; both full hashes are reported to the human afterward.
