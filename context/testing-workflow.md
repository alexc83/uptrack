# UpTrack — Testing workflow (canonical)

Canonical testing policy for all coding agents (Claude Code, Codex, Mistral Vibe, Antigravity, others) and the project owner. `AGENTS.md` links here; do not copy this text into other files. Commands are defined in `frontend-react/package.json` and `frontend-react/playwright.config.ts`.

## 1. Responsibilities

| | AI coding agents | Project owner |
|---|---|---|
| Targeted tests for code created/modified | **Run** | — |
| Typecheck, lint, build | **Run** | Runs again in full sequence |
| Focused browser tests when changing interactive behaviour | **Run** | — |
| Failures introduced by the agent's changes | **Investigate and fix** | — |
| Full unit + integration suite | Not by default | **Runs locally** |
| Full Playwright suite (all browsers) | Not by default | **Runs locally** |
| Visual diffs / screenshot baseline approval | Never updates baselines | **Reviews and approves** |
| Live-backend acceptance (when applicable) | Prepares procedure only unless authorized | **Performs final check** |
| Verification results before integration approval | Reports what ran | **Provides** |

Agents report **exactly** which commands ran (with exit codes) and which are **PENDING owner verification**. An agent must never describe a milestone as "fully verified" when only targeted checks ran; use "targeted checks passed; full regression pending owner".

**Exceptions** — an agent may run a full suite when (a) the owner explicitly authorizes it, (b) it is needed to diagnose a regression, or (c) the change's risk warrants it (e.g. shared layout/theme/auth/transport code, config or dependency changes). State the reason in the report. Do not repeat full suites by default; do not weaken, skip or delete tests to get a pass.

## 2. Verification levels

1. **Targeted development verification** (agents, every change)
   - `npx vitest run <path-or-pattern>` (unit/component, e.g. `npx vitest run src/features/dashboard`)
   - `npm run typecheck`, `npm run lint`, `npm run build`
   - Focused browser run in one browser: `npx playwright test --project=msedge e2e/<file>.spec.ts -g "<title>"` (use `--project=chromium` with `E2E_CHROMIUM_FALLBACK=1` where Edge is absent — see §3).
2. **Full local regression** (owner): `npm run verify:local` = typecheck → lint → `npm run test` (all Vitest) → build → `npm run e2e` (all Playwright projects). Run from `frontend-react/`. Add `./mvnw test` from `backend/` for backend-impacting work.
3. **Browser compatibility** (owner; agents on request): `npm run e2e:functional` — all functional specs on Edge, Chrome, Firefox, WebKit. Single browser: `npm run e2e:edge | e2e:chrome | e2e:firefox | e2e:webkit`. Any other combination: `npx playwright test --project=<name> [--project=<name>] [file[:line]] [-g text]` (`npm run e2e -- <args>` also works).
4. **Edge/macOS visual regression** (owner): `npm run e2e:visual`. Only the `visual-edge` project runs `e2e/visual.spec.ts`, only on macOS with installed Microsoft Edge, against the committed `*-msedge-darwin.png` goldens. Never pass `--update-snapshots` without owner approval; agents (especially in Linux/cloud) never create or regenerate goldens. No per-browser goldens are created for Chrome/Firefox/WebKit.
5. **Live backend acceptance** (owner, or agent only with explicit authorization): run against the isolated `uptrack_migration_test` database with synthetic accounts, per the milestone spec/report. Never contact the hosted backend. Mocked Playwright specs (default-deny `/api`) are not live acceptance.

## 3. Browser projects

| Project | Engine / launch | Specs | Notes |
|---|---|---|---|
| `msedge` | installed Microsoft Edge (`channel: 'msedge'`) | functional | pre-existing project name, unchanged |
| `chrome` | installed Google Chrome (`channel: 'chrome'`) | functional | requires Chrome; fails to launch if absent |
| `firefox` | Playwright-managed Firefox | functional | `npm run e2e:install` |
| `webkit` | Playwright-managed WebKit (Safari engine) | functional | not Safari itself; `npm run e2e:install` |
| `visual-edge` | installed Edge, macOS only | `visual.spec.ts` only | uses existing goldens via pinned snapshot template |

"Functional" = every spec except `visual.spec.ts`.

**One-time setup:** `npm run e2e:install` (Firefox + WebKit). Edge and Chrome must be installed on the machine (Playwright can fetch them with `npx playwright install msedge chrome`, which may prompt for administrator rights).

**Linux / cloud agents:** installed Chrome/Edge are normally unavailable. Run `npm run e2e:install:linux`, then `npm run e2e:chromium-fallback` (bundled Chromium + Firefox + WebKit). Bundled Chromium covers the Chromium engine only; it is **not** Edge or Chrome branded-build coverage, and reports must say "Chromium (bundled)" and list `msedge`, `chrome` and `visual-edge` as NOT RUN. Visual tests are not registered off macOS.

## 4. Reporting browser-specific failures

Report each failure per browser, separately from the shared-browser results, classified as one of: **test assumption** (spec presumes one engine's behaviour), **browser difference** (documented engine behaviour, app acceptable), **application defect**, or **unclassified (needs investigation)**. Do not skip, weaken or `fixme` a test merely to turn a project green; changing a test requires the owner's approval and a recorded reason.

## 5. Verification status, resolved findings and limitations

**Configuration is not verification.** Counts change as milestones add tests; re-run before relying on them.

### Current baseline (D01-A audit, 2026-11-04, `main` = `7fabdbb`, Linux cloud container)

| Check | Result |
|---|---|
| Vitest unit/component (`npx vitest run`) | 571/571 passed, 41 files |
| typecheck / lint / build | pass / pass / pass (build warns: main chunk 679 kB) |
| Functional Playwright on **Chromium (bundled)** (`E2E_CHROMIUM_FALLBACK=1`, project `chromium`) | 146/146 passed |
| `msedge`, `chrome`, `firefox`, `webkit`, `visual-edge` | NOT RUN in this audit |
| Backend `./mvnw -B -ntp verify` (H2) | 165/165 passed, JAR built |

The functional suite is now **146 tests per project** (it was 108 at the 2026-11-02 run below; M10–M13 and P01 added specs). Evidence: [`migration/verification/d01-a-ci-baseline.md`](migration/verification/d01-a-ci-baseline.md). In cloud containers whose preinstalled Playwright browsers do not match the pinned `@playwright/test` version, `browserType.launch` fails before any test runs; install the matching build with `npm run e2e:install:linux` (or `npx playwright install --with-deps chromium`) — this is infrastructure, not a test failure.

### Historical four-browser run (2026-11-02)

The status below is the result of one owner-authorized run on 2026-11-02 (macOS, Playwright 1.64.1, Edge/Chrome/Firefox installed on the owner's Mac, Playwright-managed Firefox and WebKit). It was a specifically authorized exception for establishing this infrastructure; it does not change the default policy that full suites are owner-run. Re-run after relevant changes; do not treat it as standing proof.

| Project | Result (108 functional tests each at that time) |
|---|---|
| `msedge` | 108/108 passed |
| `chrome` | 108/108 passed (installed Google Chrome via the `chrome` channel). **Run before the final corrections**; it was covered again only by the combined post-fix run below |
| `firefox` | 108/108 passed (Playwright-managed Firefox; the installed Firefox app was **not** tested) |
| `webkit` | 108/108 passed (Playwright WebKit engine: Safari-engine compatibility testing, **not** equivalent to testing the installed Safari application) |
| `visual-edge` | 4/4 tests, 8/8 screenshots compared without update mode; checksums of all 8 PNGs unchanged. Edge/macOS remains the authoritative screenshot-baseline environment; this says nothing about other engines' rendering |
| Combined post-fix functional suite | 432/432 passed (4 projects × 108) |

Other checks in the same pass: unit 424/424 (historical count; 571 at the D01-A baseline); typecheck, lint and build passed.

### Resolved findings
- **Firefox breakpoint flake (application race, fixed).** `useShellNavigation` read `matchMedia` in initial state but subscribed to `change` in an effect without re-reading, so a viewport crossing between render and subscription left `mobile` stale. Fix: `setMobile(query.matches)` after subscribing; regression test `use-shell-navigation.test.ts` (fails without the fix). The unmodified `app-shell.spec.ts:94` went from ~10% failures to 80/80 passes in Firefox.
- **WebKit harness/browser assumptions (test changes only; no assertion removed):**
  - Multipart upload and redirect specs now use a real loopback server (`e2e/local-server.ts`) via `route.continue({ url })`, verifying the bytes actually transmitted and a genuine 302 (redirect target must receive no request).
  - Abort spec asserts `AbortError`, aborted signal, non-`ApiError` and pre-abort identity; it no longer requires `error === signal.reason` for in-flight aborts, because WebKit rejects with a fresh `AbortError`. `apiFetch` is unchanged.
  - Skip-link spec presses Option+Tab on WebKit/macOS (`nextFocusableKey`) and still asserts link focus, activation and `#main-content` focus.
  - Overlay focus-restoration specs open triggers by keyboard (`activateWithKeyboard`); Safari does not focus buttons on mouse click. Nested-modal containment is asserted with `expect.poll` because focus can rest briefly on a floating-ui guard.

### Remaining limitations (not verified)
- Real Safari (installed application) and VoiceOver/assistive-technology testing remain **outstanding**: NOT RUN. Playwright WebKit is an engine proxy. Whether a VoiceOver activation focuses the trigger (affecting focus return) is unverified.
- **Unresolved manual accessibility-check item:** in WebKit, overlays opened with the mouse restore focus to `<main>`, not the trigger (Safari does not focus a clicked button, so there is nothing to restore to). The specs deliberately cover only the keyboard-opened path; whether this is acceptable, and what VoiceOver does, needs manual Safari/VoiceOver review. It is not accepted product behaviour and not evidence of Safari parity.
- Linux/Windows runs, mobile-emulated browser projects, and installed (non-Playwright-managed) Firefox: NOT RUN.
- Visual goldens exist for Edge/macOS only.
- Live-backend acceptance: not part of this suite.
