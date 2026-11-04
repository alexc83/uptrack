# D01-B verification report — initial GitHub Actions CI

Status: **IMPLEMENTED — local validation PASS; awaiting owner review before commit/push. GitHub Actions execution NOT YET RUN.**
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

## 6. GitHub validation (pending authorization)
1. Push `chore/d01-b-ci-workflow`; open a draft PR to `main`.
2. Confirm `CI / backend`, `CI / frontend`, `CI / e2e-chromium` appear as separate checks and pass (165 / 571 / 146), alongside unchanged CodeQL and Vercel checks; record durations.
3. Afterwards, a separate disposable branch + draft PR with one deliberately failing test per job (never merged; deleted afterwards) to confirm red checks and downloadable artifacts.
