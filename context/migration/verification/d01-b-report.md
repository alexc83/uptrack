# D01-B verification report — initial GitHub Actions CI

Status: **IMPLEMENTED — first GitHub Actions run PASS (owner-accepted 2026-11-04); draft PR #27 open, not merged.** §1–§5 are the original pre-push local validation, preserved as historical evidence; §6 records the GitHub results.
Agent / session: Claude Code (cloud session).
Date / branch / base: 2026-11-04 / `chore/d01-b-ci-workflow` / `origin/main` = `2588d05ec29e4d7ad0a688cea294181410ef352c` (merge of D01-A PR #26), ahead/behind 0/0 before changes.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md) §5.1, §5.4, §6 (D01-B). Authorization: owner D01-B brief of 2026-11-04.

## 1. Changes

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | New. Workflow `CI` with three independent jobs: `backend`, `frontend`, `e2e-chromium` |
| `.github/dependabot.yml` | Added `github-actions` ecosystem (directory `/`, weekly, 3 PRs) to keep SHA pins current. Existing npm/Maven entries unchanged |
| `context/migration/verification/d01-b-report.md` | This report |
| `context/migration/migration-status.md`, `context/migration/agent-handoff.md` | D01-B status entries |

No application code, test, dependency manifest, lockfile, Playwright/Vitest config, deployment configuration or GitHub setting changed. No PostgreSQL service container (D01-C).

## 2. Workflow design (as implemented)
- Triggers: `pull_request` → `main`, `push` → `main`, `workflow_dispatch`. No path filters.
- `permissions: contents: read` (workflow level; no job overrides). No `secrets.*`, no `GITHUB_TOKEN` use, no `pull_request_target`/`workflow_run`, no environments.
- Concurrency: group `ci-<PR number | ref>`; `cancel-in-progress` only for `pull_request` events (pushes to `main` always complete).
- Runner `ubuntu-latest`; timeouts 15 / 15 / 20 min.
- `actions/checkout` with `persist-credentials: false` in every job.
- Jobs:
  - **backend** — Temurin 21 (`cache: maven`, keyed on `backend/pom.xml`); `./mvnw -B -ntp verify`; on failure upload `backend/target/surefire-reports/`.
  - **frontend** — Node 22 (`cache: npm`, keyed on `frontend-react/package-lock.json`); `npm ci --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npx vitest run --reporter=default --reporter=junit --outputFile.junit=test-results/vitest-junit.xml`, `npm run build`; on failure upload `frontend-react/test-results/`.
  - **e2e-chromium** — Node 22 + `npm ci`; `npx playwright install --with-deps chromium`; `npx playwright test --project=chromium --reporter=list,html,junit --trace=retain-on-failure` with `E2E_CHROMIUM_FALLBACK=1`, `PLAYWRIGHT_HTML_OPEN=never`, `PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report`, `PLAYWRIGHT_JUNIT_OUTPUT_FILE=test-results/e2e-junit.xml`; on failure upload `playwright-report/` and `test-results/`. `CI=true` is set by GitHub, so `forbidOnly` applies and `reuseExistingServer` is off.
- Artifacts: only on failure, `retention-days: 7`, `if-no-files-found: ignore`. All report directories are already git-ignored.

## 3. Action pins (verified 2026-11-04)
Each SHA was resolved with `git ls-remote` (lightweight tags → commit), fetched at that exact commit, and its `action.yml` inspected.

| Action | Tag | Commit SHA | Commit date | Runtime | Notes |
|---|---|---|---|---|---|
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | 2026-07-17 | `node24` | = current `v7` tag; `persist-credentials` input present |
| `actions/setup-java` | v6.1.0 | `b843ebf9b913146b38da2eaa7aeddf76074ae1ad` | 2026-10-14 | `node24` | = current `v6`; `distribution`, `java-version`, `cache`, `cache-dependency-path` present |
| `actions/setup-node` | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` | 2026-10-07 | `node24` | = current `v7`; `cache`, `cache-dependency-path` present; auto package-manager cache inactive (no `packageManager` field), so `cache: npm` is explicit |
| `actions/upload-artifact` | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | 2026-10-07 | `node24` | = current `v7`; `retention-days`, `if-no-files-found` present |

Compatibility: all four are official GitHub-owned JavaScript actions on the `node24` runtime, which GitHub-hosted Ubuntu runners provide. All releases are ≥3 weeks old. Actual execution on a hosted runner is still to be observed (§6).

## 4. Local validation (Linux cloud container; not a GitHub runner)

| Check | Command | Result |
|---|---|---|
| actionlint 1.7.12 (official release; `sha256sum -c` against `actionlint_1.7.12_checksums.txt`: OK; scratch only, not committed) | `actionlint -verbose .github/workflows/ci.yml` | **0 errors**. `shellcheck`/`pyflakes` rules disabled (not installed) |
| `dependabot.yml` | YAML parse | OK |
| Security/structure script (24 assertions) | triggers, no `pull_request_target`/`workflow_run`, `contents: read`, no job permissions, no secrets/token, 3 independent jobs, `ubuntu-latest` + timeouts, every `uses:` = approved SHA, `persist-credentials: false`, artifacts 7 days on failure, no production hosts/services in non-comment lines | **all PASS** |
| backend job | `./mvnw -B -ntp verify` | exit 0, 68 s; **165/165**, 0 skipped; JAR built |
| frontend job (with `CI=true`) | `npm ci` / typecheck / lint / Vitest+JUnit / build | exit 0 each; 14 s / 8 s / 8 s / 37 s / 11 s; **571/571** (41 files); `vitest-junit.xml` reports `tests="571" failures="0"` |
| e2e-chromium job | browser install | **NOT RUN locally**: the container's network policy blocks `cdn.playwright.dev` (HTTP 403). GitHub-hosted runners have unrestricted egress |
| e2e-chromium job | exact test command, flags and env, via a scratch config that only adds `launchOptions.executablePath` to the container's preinstalled Chromium (build 1243, not the pinned 1248) | exit 0, 217 s; **146/146**; HTML report written; `e2e-junit.xml` reports `tests="146" failures="0"` |
| Failure diagnostics | one deliberately failing spec **in the scratchpad only** (never in the repository), same flags/env | exit 1; `test-results/<test>/trace.zip` and `error-context.md` retained; `playwright-report/index.html` with trace viewer; JUnit `failures="1"`. Paths match the upload step |

`git status` after all runs: only `.github/workflows/ci.yml` (new) and `.github/dependabot.yml` (modified) before documentation was added; report output stayed in ignored directories.

## 5. Limitations and deviations
- Playwright browser download and `--with-deps` system packages could not be exercised locally (blocked host). First proof will be the GitHub run.
- Local E2E used Chromium build 1243 instead of the lockfile's 1248.
- `shellcheck` was unavailable, so actionlint did not lint `run:` scripts (all are single commands).
- Screenshots are not separately configured (`playwright.config.ts` unchanged); failure traces include DOM snapshots and screenshots per action.
- Concurrency cancellation is configured but not yet observed; it will be checked on GitHub only if it can be done without extra commits.
- Measured GitHub runtimes: pending.
- No deviation from the approved plan.

## 6. GitHub Actions validation — first run (2026-11-04)

Commits `633cdda` (CI configuration) and `46f8f86` (documentation) pushed to `chore/d01-b-ci-workflow`; GitHub accepted the workflow file (no permission refusal). Draft PR [#27](https://github.com/alexc83/uptrack/pull/27). Run [#1 / 41766563250](https://github.com/alexc83/uptrack/actions/runs/41766563250), event `pull_request`, head `46f8f86`. Exactly one run was created (the branch push does not trigger CI because `push` is limited to `main`).

All three jobs started at 03:21:06 UTC on separate `ubuntu-latest` runners and ran independently.

| Job | Conclusion | Evidence from job log | Duration |
|---|---|---|---|
| `backend` | success | `Tests run: 165, Failures: 0, Errors: 0, Skipped: 0`; JAR built and repackaged; `BUILD SUCCESS` (Maven 56.4 s) | 66 s |
| `frontend` | success | typecheck 4 s, lint 3 s; Vitest `41 passed (41)`, `571 passed (571)` (23.3 s), JUnit report written; build 8 s | 52 s |
| `e2e-chromium` | success | Playwright Chromium install from lockfile **succeeded on GitHub** (44 s; the step that could not run locally); `146 passed (2.4m)` | 3 min 20 s |

- **Total: 882 passing test executions** (165 + 571 + 146), 0 failures, 0 skipped. Overall workflow wall time ≈ **3 min 20 s** (bounded by `e2e-chromium`).
- Failure-only upload steps were correctly `skipped` in all three jobs.
- Caches saved on first run: Maven repository, Maven wrapper, npm.
- No secrets, production credentials or production services (Neon, Render, Vercel, Cloudinary) were used or needed.
- Existing integrations unaffected on the same head: CodeQL `Analyze (java-kotlin)` success (66 s), `Analyze (javascript-typescript)` success (56 s), `CodeQL` success; `Vercel` status "Deployment has completed"; `Vercel Preview Comments` success.

Non-blocking observations
- npm cache race: `e2e-chromium` logged `Failed to save: Unable to reserve cache with key node-cache-Linux-x64-npm-… another job may be creating this cache.` The `frontend` job saved the identical key first; both jobs restore it on later runs. Harmless; no change needed.
- Existing build warnings, unchanged from local: main chunk 678.81 kB (> 500 kB) and two Rollup notices about annotation comments in `node_modules/zod/v4/core/{regexes,util}.js`.
- Concurrency cancellation of superseded PR runs: configured, not yet observed (single push).

## 7. Intermittent test exposed by CI (run #2) and its correction

**Observation.** Run [#2 / 41770554769](https://github.com/alexc83/uptrack/actions/runs/41770554769) on PR #27 (head `c550c3e`, a documentation-only commit) failed in `backend`: 164/165, `TrustedProxyRateLimitIntegrationTest.untrustedDirectClientSharesNoBucketAndCannotSpoofForwardedIdentity:60 Response header 'Retry-After' expected:<60> but was:<59>`. `frontend` passed (571/571). The `backend-surefire-reports` artifact (42 files, ID 13294726747, expires 2026-11-11) uploaded as designed. Run #1 and all local runs had passed.

**Root cause (test assumption, not an application or CI defect).** `RequestRateLimiter` measures windows in whole epoch seconds (`clock.instant().getEpochSecond()`) on `Clock.systemUTC()` and returns `Retry-After = duration − (now − windowStart)`. The test sends three login requests (two allowed, third limited) and asserted exactly `60`, implicitly assuming all three land in the same wall-clock second. When they straddle a second boundary the limiter correctly reports `59`. With the test taking ≈0.16 s on CI, roughly one run in six could fail. Reproduced deterministically in a scratch harness (outside the repository) against the compiled limiter: same second → `60`; clock moved 00.900 → 01.100 → `59`. The test was introduced in S05H (`ec37e35`, on `main`); D01-B did not cause it. `RequestRateLimiterTest`'s exact `"60"` assertion already uses a controllable `MutableClock` and is not affected.

**Correction (test-only, owner-authorized 2026-11-04).**
- `TrustedProxyRateLimitIntegrationTest`: Spring `@TestBean` replaces the `RequestRateLimiter` bean in this test's context with the real limiter constructed on `Clock.fixed(2026-01-01T00:00:00Z)`. Limits are shared constants used by both the `@SpringBootTest` properties and the factory (2 / 100 / 100, unchanged). The full security chain (filter, `ClientIpResolver`, trusted-proxy allowlist, controllers) is unchanged. **No assertion was removed or relaxed**; `Retry-After` is still asserted to be exactly `60`.
- New `backend/src/test/java/com/ccruce/backend/security/RequestRateLimiterTestSupport.java`: test-only public factory exposing the limiter's existing package-private clock constructor to tests in other packages.
- No application code, no sleeps, no retries, no tolerance window.

**Verification (local, Linux cloud container).**
| Check | Result |
|---|---|
| Fixed test class, single run | 4/4 pass |
| Proof that the injected limiter is the one in use: test temporarily run with a clock advancing 1 s per reading (scratch edit, then restored; `cmp` identical) | fails as expected: `Retry-After expected:<60> but was:<58>` (strict assertion still detects wrong values) |
| Fixed test class, 30 consecutive runs (`./mvnw -q test -Dtest=TrustedProxyRateLimitIntegrationTest`) | **30/30 pass**, ≈12 s per run, 348 s total |
| Full backend `./mvnw -B -ntp verify` | **165/165**, `BUILD SUCCESS`, 42 s |

(An earlier proof attempt with 400 ms clock steps passed and was inconclusive, because the first and third requests could still share a whole second; it was replaced by the 1 s-step check above.)

## 8. Controlled failure validation (disposable PR [#28](https://github.com/alexc83/uptrack/pull/28), branch `test/d01-b-ci-failure-validation`)

Each scenario adds one new temporary failing probe file; no existing test is modified. The probes never exist on `chore/d01-b-ci-workflow`.

| # | Probe | Run | Expected job | Result |
|---|---|---|---|---|
| 1 | `backend/.../ciprobe/CiFailureProbeTest.java` (commit `b3d7de0`) | [#3 / 41770603100](https://github.com/alexc83/uptrack/actions/runs/41770603100) | `backend` fails | **As expected.** Run conclusion `failure`. `backend`: 166 run, 1 failure = the probe (`CiFailureProbeTest.deliberateBackendFailureForCiValidation:12 … expected: <expected> but was: <D01-B deliberate backend failure>`); `backend-surefire-reports` uploaded (44 files, ID 13294861544, listed via API, expires 2026-11-11). `frontend` success (1 min 16 s); `e2e-chromium` success (2 min 58 s). Not infrastructure: all setup steps succeeded. |
| 2 | `frontend-react/src/test/ci-failure-probe.test.ts` (Vitest; commit `a2fe864`, backend probe removed) | [#5 / 41776832921](https://github.com/alexc83/uptrack/actions/runs/41776832921) | `frontend` fails | **As expected.** Run conclusion `failure`; only `frontend` failed: `1 failed \| 571 passed (572)`, the failure being the probe (`src/test/ci-failure-probe.test.ts:6:49 … expected 'D01-B deliberate frontend failure' to be 'expected'`). Typecheck and lint passed; the build step was skipped after the failure. `frontend-vitest-report` artifact uploaded (1 file, ID 13298035064). `backend` and `e2e-chromium` succeeded. |
| 3 (first run) | `frontend-react/e2e/ci-failure-probe.spec.ts` (Playwright; commit `63f2a7f`, Vitest probe removed) | [#6 / 41777298837](https://github.com/alexc83/uptrack/actions/runs/41777298837) | `e2e-chromium` fails | **`e2e-chromium` behaved as expected; the scenario is not clean and will be repeated.** `e2e-chromium`: `1 failed, 146 passed (2.3m)`, the failure being the probe (`e2e/ci-failure-probe.spec.ts:4:1`, `element(s) not found`); the log names its `trace.zip`; `e2e-chromium-report` artifact uploaded (ID 13296849084, 138 files from `playwright-report/` and `test-results/`, 12.8 MB). `backend` succeeded. **`frontend` also failed** (570/571) on an unrelated existing test, `credential-session.test.tsx` (see §9; artifact `frontend-vitest-report`, ID 13296859593), so the required "backend and frontend pass" condition was not met. Repeat after the stabilization in §9 is on the D01-B branch. |

## 9. Second intermittent test exposed by CI: `credential-session.test.tsx` (test setup stabilized; application race NOT fixed)

**Observation.** In scenario 3's run #6 the `frontend` job failed 570/571: `src/features/credentials/credential-session.test.tsx` › "aborts list/detail reads and never paints late A data after logout", at the assertion that the query cache is empty after logout (`expected [ …(2) ] to have a length of +0 but got 2`). The probe was in `e2e/` only, so this was not caused by it. The same failure reproduced locally on an unchanged tree: 1 in 15 file runs and 18 of 900 (2.0%) instrumented in-process repetitions. The test dates from M09 (`399a63b`); D01-B did not change it.

**Hypotheses tested and refuted** (measured, not assumed): the page's 250 ms search debounce (never fired during the ~30 ms test in 600 runs, including the failing ones); React Router's replace-navigation for the `credentialId` deep link (no router events in the window); pending TanStack Query notification batches (none pending at logout in 600 runs); a component render during logout (none in 600 runs). Removing the explicit `cancelQueries()` from `SessionStore.#resetServerState()` was tried locally as an experiment: it removed one separate trigger but did not stop the failure (3 in 200 runs) and was reverted. No production code was changed.

**Confirmed mechanism.** `waitFor()` returns as soon as the detail request starts, while the last mount commit's passive effects may still be pending. If logout runs first, React flushes those effects against the just-cleared cache; TanStack's `observer.setOptions` (run by `useQuery`'s effect) rebuilds both queries and refetches them before the session boundary unmounts the page, leaving two empty cache entries. Correlation over 900 runs: every dirty run had exactly 2 `QueryObserver.setOptions` calls inside the logout window, every clean run had 0.

**Correction (test-only, owner-approved 2026-11-04).** One `await act(async () => {})` after the initial `waitFor` in that test, with an explanatory comment, so pending effects are flushed before the session transition. No fake timers, sleeps or timeout changes; every assertion (empty cache, request aborts, late responses, cross-account checks) is unchanged. Verification (local): 900 instrumented repetitions with the flush: 0 dirty caches and 0 in-window `setOptions` calls; 30/30 consecutive runs of the affected test; `credential-session.test.tsx` 22/22; `session-store.test.ts` 59/59; typecheck, lint, build pass. Fault injection (spies in scratch copies, no production files touched), identical with and without the flush: cache not cleared on logout is detected; in-flight requests not aborted is detected in both the logout and switch cases. Limits: the switch case alone does not detect a missing cache purge (A's data is never cached before the switch; unchanged from the original test), and the cross-account leak detector agreed with the DOM in all 4 runs where the injected leak materialized but the injection produced one in only ~7% of runs, so its sensitivity is only weakly measured.

**The application race is NOT fixed.** Stabilizing the test removes a setup race; it does not change production behaviour. Some logouts can still re-create and refetch session-scoped queries (extra requests sent without credentials, and two leftover empty cache entries until garbage collection). No cross-account data exposure was observed. The test no longer exercises that window, so it will not catch it. This is tracked as [D01-W03](../follow-ups/d01-w03-logout-query-recreation-race.md), with a recommended deterministic regression test and acceptance criteria. No production session-management code was modified in D01-B.

**Also observed.** A third intermittent test, `ce-records-page.test.tsx` › "paginates beyond ten records", is independent of the change above (it also failed on the pristine tree); it is covered in §10.

## 10. Third intermittent test: `ce-records-page.test.tsx` › "paginates beyond ten records" — production defect found and fixed

**Observation.** The test failed intermittently in local runs of the file and of the full suite (about 8% of plain whole-file runs, 8 of 96; 8 of 40 in the instrumented runs; 2 of 4 full-suite runs). It never failed in any GitHub Actions run observed, and it passed 30/30 when run alone (and 600/600 in a stripped-down copy of the scenario), so it only appears inside the full file where timing is slower. Two failure modes: the text "Showing 11–12 of 12 records" never appears after clicking **Next ›** (assertion at line 78), or it appears and the very next assertion sees page 2's button unpressed (line 79). Not related to the credential-session change (§9): it also failed on the pristine tree. The one-second `findByText` default was not the cause: the expected text had been replaced by page 1's, so a longer wait would not have helped.

**Root cause (production defect).** `CERecordsPage` started its 250 ms search-debounce timer on every mount, and when it fired it called `setPage(0)` even though the trimmed search text equalled the search already applied. A **Next ›** click made within 250 ms of mount was then silently undone. `user.click()` takes about 180–230 ms in the full file, so the click lands near the 250 ms mark; in the instrumented runs all 8 failures had the timer firing 261–284 ms after mount, immediately after the click event. A fully controlled clock reproduces it deterministically (click Next at 100 ms, let the clock reach 250 ms: the page returns to page 1; with the timer already consumed before the click the page stays on page 2). Real users could hit it with a cached list and a quick click; no Playwright test covers CE search or pagination.

**Corrections.**
- `fix(ce-records): prevent unnecessary pagination resets` (`21bd796`): `ce-records-page.tsx` now computes the trimmed text first and schedules the debounce only when it differs from the applied search (`search` added to the effect dependencies). A real search change still applies the search and resets the page after 250 ms. Behaviour changes: whitespace-only edits and **Clear Filters** no longer trigger a delayed page reset (the trimmed value is unchanged).
- Two deterministic regression tests (controlled clock for `setTimeout`/`clearTimeout`, restored in `finally`; no sleeps or retries): "keeps the current page when no search change is pending, including whitespace-only edits" fails on the original code at the assertion immediately after the clock passes the debounce and passes with the fix; "returns to the first page once a real search change is applied" passes before and after and fails if the page reset on a real search change is removed (mutation check).
- An interim test-only workaround (`c7465f0`, fake-timer setup in the pagination test, verified 50/50) was made redundant by the page fix and removed in `21bd796`, as a new commit; history was not rewritten. The pagination test is back to its original form.

**Verification (local, Linux container; final state, i.e. the original pagination test without any workaround plus the fix and the two regression tests).** Affected tests (pagination + 2 regression tests), 30 consecutive runs: 30/30. Whole `ce-records-page.test.tsx`, 30 runs (17 tests each): 30/30. Full Vitest suite, 3 runs: 573/573 each (571 + 2 new). Typecheck, ESLint, production build: pass. Earlier supporting runs: the original unmodified test against the fixed page, whole file x40: 40/40 (about a 3% chance at the earlier failure rate if the flake remained); the workaround version, whole file x50: 50/50 and 200/200 instrumented prelude runs.

**Limits.** Real-browser behaviour was not tested. The test's reliability on GitHub-hosted runners is verified only by the CI runs recorded in §6 and below.
