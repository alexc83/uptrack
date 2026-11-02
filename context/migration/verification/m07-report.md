# M07 verification report

**Status: IMPLEMENTED and verified locally (all mandatory commands PASS; full browser suite 88/88 on the final run); awaiting human review. No commit, push, merge or deployment has occurred.**

Agent: Muse (Muse Code), 2026-11-02.
Branch / base: `feature/react-landing` from `main` `f1583b737c14e5bf908689d0bb4841939d41bee1` (verified equal to local and live `origin/main`; no tracked/staged changes at branch time).
Spec: `specs/m07-public-landing-page.md` (READY, approved decisions recorded).

## What was built

Public landing page at `/` replacing the temporary `FoundationSmokeView`, reusing the M06 `AuthDialog`, session provider, `GuestOnly` guard and `returnTo` validation unchanged:

- `src/features/landing/`: `landing-page.tsx` (composition + `auth`/`returnTo` param state migrated from `AuthHost`), 7 section components (`landing-header`, `hero-section`, `dashboard-preview`, `features-section`, `compliance-section`, `cta-section`, `landing-footer`), `landing-content.ts` (cards/benefits data + `LandingTrigger` type), `landing-page.test.tsx` (7 tests).
- `public/landing/` + the 8 Angular preview PNGs (MD5-verified identical copies; unreferenced `landing-page-*.png`/modal PNGs not copied).
- `src/styles/globals.css`: `--ut-landing-*` tokens (`:root` + `html.dark`, values copied from Angular `landing-page.component.scss`) + Tailwind `@theme inline` aliases.
- `src/core/theme/flowbite-theme.ts`: new `landing` Button color (landing primary/hover/lift; Flowbite-first per M02).
- `src/app/router.tsx`: `/` renders `<GuestOnly><LandingPage /></GuestOnly>` (eager import; landing is the entry route); `FoundationSmokeView` removed.
- Deleted `src/features/auth/auth-host.tsx` after verifying zero remaining references and migrating its param semantics exactly (close deletes only `auth`, preserving `returnTo`).
- Focus restoration: a shared trigger ref (mounted to header Log In, updated by whichever trigger is clicked) passed as `returnFocusRef` — deep-link parity with M06 plus correct per-trigger restore. No `AuthDialog`/guard/session/transport changes. No mutations or cache writes, so no `captureSession().isCurrent()` obligation arises.

## Commands

| Command | Result |
|---|---|
| `npm run typecheck` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run test` | PASS, 361/361 across 26 files (baseline was 354/25; +7 new landing tests) |
| `npm run build` | PASS (exit 0; existing >500 kB chunk advisory only) |
| `npm run e2e` (final run) | **PASS — 88/88** (58 prior + 30 new landing tests; 8/8 visual comparisons, goldens byte-identical) |
| `npm audit` | exit 1, 17 findings (15 moderate/2 critical), all dev — see below |
| `npm audit --omit=dev` | PASS, 0 findings |

Manifests/lockfile unchanged: `git diff HEAD` empty on both, `package-lock.json` SHA-1 `377890e030fb4944858d7fe70f0113a083b635b2` matches HEAD, last touched by M06 `dc12d35`. The 17 vs 16 full-audit count differs from M06 with **identical unique advisories** (5 GHSAs: @vitest/mocker GHSA-82fw-gwwq-j7x9 + GHSA-qxg6-89mg-rqv8, minimatch GHSA-g3hv-75wg-m249, tinypool GHSA-5gmw-xhrv-c9v3 + GHSA-85c8-ppgw-ccpr — the same roots M05 recorded). npm's headline count enumerates affected dependency-path nodes, not advisories; the exact additional node cannot be diffed because M06 recorded only the count (16), not the node list. With a byte-identical lockfile, no new vulnerable code could have been introduced — the +1 moderate node is audit-reporting/registry-metadata drift (transitive-path re-mapping under the same 5 advisories), not a new vulnerability and not caused by M07. No fix was applied (none auto-applicable; changes forbidden). Disposition unchanged: deferred dev findings, production clean (0).

## Browser evidence (Edge/macOS; default-deny /api fixture throughout)

New `e2e/landing.spec.ts` (30 tests): section/landmark/copy render; no-overflow at 375/640/768/769/920/1080/1280 × light+dark; ≥44px targets (+ single-line header check at 375); centering regression test; all 4 triggers → correct dialog mode + focus restore; `?auth=`/`returnTo` restore after mocked login; authenticated redirect without flash; theme persistence + image swap; 12 candidate captures (viewport + full-page at 375/768/1280 × light+dark).
Candidates: `verification/m07-evidence/landing-candidate-*` (evidence for review, **not** approved goldens). Angular comparison captures in the same dir (`angular-*`, local `ng serve`, read-only reference) + `react-dialog-login-1280.png`.

## Failures found and fixed during M07 (preserved)

1. **Centered CTA buttons rendered left-aligned.** Cause (proven by live DOM inspection): `<button>` computes `width:auto` as fit-content even when block-level `display:flex`, so `text-center` cannot center a bare Flowbite Button. Fix: `mx-auto` on hero + CTA buttons + new centering regression test (button vs section center-x ≤2px). Inspected before/after screenshots confirm.
2. **"Log In" wrapped to two lines at 375px** (44px targets exceed Angular's widths). Fix: `whitespace-nowrap` + reduced ≤640px padding on header actions + single-line regression assertion. Note: live Angular **also wraps "Log In" at 375px** (see `angular-light-375-full.png`) — the nowrap is an intentional micro-improvement over Angular, documented here.
3. **Two M07 test bugs fixed:** sub-pixel 43.999998px toggle measurement (43.5px floor with comment) and an init-script re-seeding light on reload in the persistence test (now seeds via storage + reload).

## Pre-existing intermittent failure (not M07, not modified)

**Resolved in M08 (`b150343`):** root cause was a test-side race (floating-ui autofocuses the first menu item on keyboard open; with Log out enabled since M06, ArrowDown correctly moves to it). Historical details follow.

Exact test: `e2e/app-shell.spec.ts:5` "desktop geometry, persistence, navigation, account menu and independent scrolling", failing assertion at line 35: `await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeFocused()` after opening the account menu (Enter) and pressing ArrowDown. Failure signature (preserved error-context): the Settings link resolves with `tabindex="-1"` and stays "inactive" for the full 5s timeout — i.e. Flowbite/Floating-UI menu list-navigation did not move focus within the window. Observable cause class: timing/focus-state race (menu open → ArrowDown → focus move), not test isolation (no shared state; passes 3/3 in isolation on this branch) and not an assertion error (the expectation is correct when timing allows).

Full-suite history on this branch: 87/88 (flake), 87/88 (flake), 88/88, then final-verification reruns 87/88 (flake), 88/88, 88/88. The flake also **failed identically on pristine stashed main** (full suite: 54 passed / 4 failed — the same app-shell test plus 3 theme pre-paint tests, further environment flakiness in this sandbox). The M04 test and application files were not modified, per authorization. Recommended future correction (M13 or environment owner, not M07): await menu readiness before ArrowDown (e.g. assert the first menu item is focusable/activedescendant set, or retry the ArrowDown+focus pair once), since cold dev-server compile latency in CI-like environments can exceed the implicit timing the test assumes.

## Final verification reruns (no snapshot updates)

| Run | Result | Notes |
|---|---|---|
| Final run (pre-correction) | 88/88 PASS | All 30 landing + 8 visuals green |
| Rerun 1 of 3 | 87/88 | Only the pre-existing app-shell ArrowDown flake; all landing tests passed |
| Rerun 2 of 3 | 88/88 PASS | — |
| Rerun 3 of 3 | 88/88 PASS | — |

No snapshots were updated in any run (`--update-snapshots` never used); all 8 goldens verified byte-identical to HEAD via `cmp` (see below).

## Angular comparison findings

Compared against live local Angular rendering + M01 `u1-*` crops + `context/screenshots/` (with documented staleness). Match: 7-section structure and order, all copy (except approved footer), hero wrap, preview images and 768px swap, 4→2→1 card grid at 1080/640px, compliance stack with visual-first order at ≤1080px, CTA gradient, footer layout, both themes.

Final visual summary (375px + 1280px, light + dark, inspected from `m07-evidence/` candidates vs live Angular): header/hero identical in layout with the approved light-header deviation below; feature cards match in icon tints, titles and copy (Lucide glyph shapes differ slightly from PrimeIcons per M02 D11); compliance copy/benefits/drawer crop match; CTA banner and footer match except approved footer wording; mobile stacks all sections without overflow; dark theme matches section-for-section. Remaining visible deviations from Angular, all intentional and approved: (1) light header `#E9EFF8` + `#C7D4E5` border (user design feedback; Angular uses near-white translucent) — inspected at 375/1280, clearly distinct without looking disconnected; (2) footer "powered by React and Spring Boot"; (3) 44px targets (Angular toggle 35px/login 39px); (4) M06 dialog wording/appearance; (5) Lucide glyphs; (6) header nowrap at 375px (Angular wraps "Log In" there). No other meaningful differences found.

The 17 `m07-evidence/` PNGs (5.1 MB total) are candidate verification evidence, not approved Playwright goldens; they are intended to be committed as the M07 evidence record (same precedent as `m04-evidence/`).

## Changed-file inventory

Modified (tracked): `context/migration/specs/m07-public-landing-page.md`; `frontend-react/src/app/router.tsx`; `src/styles/globals.css`; `src/core/theme/flowbite-theme.ts`; `src/test/smoke.test.tsx`; `e2e/smoke.spec.ts`; `e2e/api-transport.spec.ts`; `src/core/auth/route-guards.test.tsx`; `src/features/auth/auth-dialog.test.tsx` (trigger-label only, 2 lines — required AuthHost-removal fallout beyond the 4 authorized files, same category, intent preserved).
Deleted: `src/features/auth/auth-host.tsx`.
New: `src/features/landing/*` (10 files), `public/landing/` + 8 PNGs, `e2e/landing.spec.ts`, `verification/m07-evidence/` (17 PNGs), this report.
Docs: `migration-status.md` (incl. stale M05-era sentence fix), `master-plan.md` (stale M05/M06 sentences), `agent-handoff.md`, `current-feature.md`.
Untouched: backend, Angular, manifests/lockfiles, 8 shell/modal goldens (verified via `git status` + passing comparisons), M01 evidence, historical reports, untracked `render-with-providers 2.tsx`, unrelated untracked `conversation-2026-11-02-064616.txt` (pre-existing, left alone).

## Approved Angular parity deviations (this milestone)

44px targets; React footer wording; single theme key behavior (M02-mandated); M06 dialog reuse (wording/appearance owned by M06); Lucide icons (M02 D11); header nowrap at 375px; light header `#E9EFF8`/`#C7D4E5` (user design feedback — explicitly approved visual correction during final verification; dark mode unchanged).

## Not run / limitations

Edge/macOS only; other engines/OS and manual screen-reader checks NOT RUN; no live-backend runtime (M13); hosted backend never contacted; Angular served locally for read-only comparison only (no Angular edits); isolated Postgres DB untouched. Candidate landing screenshots are review evidence, not approved goldens — golden approval needs a separate decision.

## Final git status and commit readiness

Branch `feature/react-landing`. Tracked changes (15 paths): 6 docs (`current-feature.md`, `agent-handoff.md`, `master-plan.md`, `migration-status.md`, `specs/m07-public-landing-page.md`, `verification/m07-report.md`); `src/app/router.tsx`; `src/styles/globals.css` (landing tokens + approved light-header values); `src/core/theme/flowbite-theme.ts`; 5 test files (4 foundation + `auth-dialog.test.tsx` trigger labels; all intent-preserving, reviewed hunk-by-hunk); deleted `src/features/auth/auth-host.tsx` (no leftover references; single query-param logic site in `landing-page.tsx`; typecheck/lint confirm no unused imports). New untracked (intended for commit): `src/features/landing/` (10 files), `public/landing/` + 8 PNGs, `e2e/landing.spec.ts`, `verification/m07-evidence/` (17 PNGs, 5.1 MB). Pre-existing untracked `render-with-providers 2.tsx` and `conversation-2026-11-02-064616.txt` preserved (bytes untouched; mtimes refreshed by a stash round-trip during flake investigation). No Angular/backend/DB/manifest/lockfile changes; no test output or secrets in the diff (scanned); nothing staged.

Remaining blockers to the two proposed commits: none. Open items for the human: (1) authorize the two commits; (2) separately decide golden approval for landing candidates if desired (not required for M07); (3) the pre-existing shell ArrowDown flake is documented for M13/environment follow-up.

## Review and approvals

Approval to commit: not granted. e2e required sandbox escalation (port binding denied under sandbox; proxy env bypassed for localhost) — environment only, no code impact.
