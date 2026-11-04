# D01-E verification report — cross-browser CI workflow and branch-protection recommendations

Status: **BROWSER WORKFLOW MERGED AND VERIFIED; BRANCH PROTECTION APPLIED AND VERIFIED (2026-11-04).** [PR #39](https://github.com/alexc83/uptrack/pull/39) merged as `325e839`; manual dispatch `all`, `firefox` and `webkit` passed; ruleset `26574227` is active and enforcement was verified with disposable PRs #40 and #41 (§7.0). **Outstanding (do not treat as validated):** a genuine scheduled run, the failure-only artifact path, rendered job summaries, per-test counts of the dispatch runs and stability across runs (§6). The D01-E closeout documentation is on branch `chore/d01-e-final-closeout` (draft PR, not merged).
Agent / session: Claude Code (cloud session).
Date / branch / base: 2026-11-04 / `chore/d01-e-browser-matrix` / `origin/main` = `01aefd0e80c1c12ea3418c4ca480e43e32c9bf36` (merge of D01-D closeout [PR #38](https://github.com/alexc83/uptrack/pull/38)), ahead/behind 0/0 before changes.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md) §5.3, §6 (D01-E). Authorization: owner D01-E audit approval, workflow implementation brief, commit/push/draft-PR authorization and this documentation brief (2026-11-04).

Notation: **[V]** verified from GitHub Actions logs/API or read-only GitHub API in this session; **[L]** local only; **[A]** assumption / not verified.

## 1. Objectives and acceptance criteria

Spec §6 D01-E:

| # | Criterion | Status |
|---|---|---|
| 1 | `browsers.yml` runs Firefox + WebKit (not Chromium) nightly and on dispatch; not a required PR check; `contents: read`; failures produce artifacts | **Merged (PR #39, `325e839`); partly verified.** Both browsers passed on the PR run and manual dispatch `all`, `firefox`, `webkit` all concluded success on `main` [V]. The nightly schedule has **not yet run** and the failure-artifact path was **never exercised** (§6). |
| 2 | `testing-workflow.md` gains a CI section | **Done** in this documentation commit (CI workflows and browser matrix). |
| 3 | Ruleset/branch-protection recommendation | **Recommendation documented (§7); subsequently applied and verified with owner authorization (§7.0): ruleset `26574227` active.** `Protect main` unchanged. |
| 4 | Visual baselines unchanged | **Met** — no snapshot, `visual-edge` or `playwright.config.ts` change [V]. |

Owner decisions applied (2026-11-04): Chromium (bundled) stays on every PR; Firefox and WebKit nightly and on demand without re-running Chromium; Edge functional **deferred**; the macOS Edge `visual-edge` baselines untouched and never regenerated in CI; Firefox/WebKit informational, not required.

## 2. Implementation

One file added: [`.github/workflows/browsers.yml`](../../../.github/workflows/browsers.yml) (+136), commit `dc6803310e22b51bbeb62e53011bf120c8b6e1e3` (`ci: add nightly Firefox and WebKit E2E workflow`, authored and committed as `alexc83`, no AI trailers). `.github/workflows/ci.yml`, `playwright.config.ts`, application code, snapshots and Dependabot configuration are unchanged [V].

- **Triggers:** `schedule: '17 5 * * *'` (**05:17 UTC** daily, both browsers); `workflow_dispatch` input `browser` = `all` (default: Firefox and WebKit) | `firefox` | `webkit`; `pull_request` to `main` **only** when `.github/workflows/browsers.yml` changes (self-validation). Unrelated PRs never run it.
- **Matrix:** one job per browser (`e2e-firefox`, `e2e-webkit`), `fail-fast: false`. The matrix is `fromJSON(...)`: schedule, pull request and `all` run both; `firefox`/`webkit` run that one browser only (logic simulated locally [L]; on GitHub only the pull-request path, i.e. both browsers, has run [V]).
- **Run:** Ubuntu, Node 22, `npm ci`, `npx playwright install --with-deps <browser>` (only that job's browser), `npx playwright test --list --project=<browser>` (count shown in the log), then the existing `npm run e2e:<browser> -- --reporter=list,html,junit --trace=retain-on-failure`. `workers: 1`, `retries: 0`, the default-deny `/api` mocks and session isolation are the unchanged config. No `E2E_CHROMIUM_FALLBACK`, so Chromium cannot run; `visual-edge` is registered only on macOS; no `--update-snapshots`.
- **Reporting:** JUnit parsed into the job summary (browser, passed, failed, skipped, total, duration); the summary step never changes the job result.
- **Artifacts:** `e2e-<browser>-junit` on every non-cancelled run, **14 days**; `e2e-<browser>-report` (HTML report and traces) on failure only, **7 days**.
- **Security:** `permissions: contents: read`, `persist-credentials: false`, no secrets, no third-party services, all actions pinned to full 40-character SHAs (the same `checkout`, `setup-node`, `upload-artifact` pins as `ci.yml`); `concurrency` group per event/ref, scheduled runs never cancelled.

## 3. Local validation [L]

actionlint v1.7.7 clean; YAML parses; `playwright test --list` = **146 tests in 13 files** for `firefox` and for `webkit` (292 together; no visual, chromium, msedge or chrome entries); no unpinned `uses:`; `ci.yml` byte-identical to `origin/main`; `git diff --check` clean; the summary script produced the expected table for a synthetic JUnit file and a notice for a missing file. Firefox and WebKit could not be installed in the authoring sandbox, so nothing browser-related ran locally.

## 4. GitHub Actions results [V]

**Browsers** run [#1 / 41827213935](https://github.com/alexc83/uptrack/actions/runs/41827213935) (`pull_request`, head `dc68033`): **success**, 5 min 27 s end to end.

| Job | Browser install | Tests | Job duration |
|---|---|---|---|
| `e2e-firefox` | 17 s | **146 passed (3.9 min)** | 4 min 29 s |
| `e2e-webkit` | 62 s | **146 passed (4.1 min)** | 5 min 24 s |

- Exactly two jobs ran, independently and in parallel. Every executed test is tagged `[firefox]` or `[webkit]`, numbered 1–146; no Chromium, Edge, Chrome or visual test ran. (The `Total: 146 tests` line from the list step is outside the log tail that could be read; the 1–146 numbering is.)
- Not a Playwright finding: the log shows Vite `http proxy error: /api/auth/me ECONNREFUSED` lines, identical to the Chromium job (mocked `/api`, no backend by design).
- Compared with Chromium (2.7–2.9 min of test time in `ci.yml` runs): Firefox about 1.4×, WebKit about 1.5×.
- No failure, so no failure classification was needed. The suite had not previously run on Linux Firefox/WebKit; the last cross-browser run was the owner's macOS run at 108 tests, so ~38 tests had never run on these engines before.

**Existing CI** run [#31 / 41827213889](https://github.com/alexc83/uptrack/actions/runs/41827213889) on the same head: `backend` 57 s, `backend-postgres` 1 min 00 s, `frontend` 1 min 28 s, `e2e-chromium` 3 min 17 s — all success (counts as in D01-D: 193 / 193 / 596 / 146; this run's count lines were not re-read). **CodeQL** (`CodeQL`, `Analyze (actions)`, `Analyze (java-kotlin)`, `Analyze (javascript-typescript)`) and **Vercel** (`Vercel` status "Deployment has completed", `Vercel Preview Comments`) succeeded.

**Artifacts (API):** `e2e-firefox-junit` 4,323 bytes and `e2e-webkit-junit` 4,310 bytes, each `expires_at` = created + 14 days (2026-11-18). No `-report` artifacts, as designed. The upload steps' logs show `retention-days: 14`.

**Predecessor evidence recorded here:** D01-D closeout PR #38 merged as `01aefd0e80c1c12ea3418c4ca480e43e32c9bf36`; its post-merge CI run [41824105763](https://github.com/alexc83/uptrack/actions/runs/41824105763) passed all four jobs — backend (H2) 193 and 56 s, backend-postgres 193 on PostgreSQL 17.11 and 1 min 02 s (JDBC assertion `product=PostgreSQL version=17.11 … major=17`), frontend 1 min 29 s (the 596 count was confirmed on the PR-head run, not re-read post-merge), e2e-chromium 146 and 3 min 16 s; total about 3 min 20 s; both coverage artifacts produced (14-day expiry); the CodeQL "Push on main" run succeeded; post-merge Vercel was not checked.

## 5. Unchanged safeguards

Chromium PR job and reporting (`ci.yml`), `playwright.config.ts`, `visual.spec.ts` and the eight `*-msedge-darwin.png` baselines, application and backend code, dependencies, Dependabot configuration, `Protect main` (26409215) and all other GitHub settings were unchanged by the implementation; the only later GitHub change is the new ruleset 26574227 (§7.0) [V]. The macOS Edge visual regression is still owner-run only; Linux screenshots are never compared with the macOS baselines.

## 6. Remaining unverified behaviour (do not treat as validated)

Verified since the first version of this report [V]: manual dispatch of `all` ([41843219891](https://github.com/alexc83/uptrack/actions/runs/41843219891)), `firefox` ([41844291127](https://github.com/alexc83/uptrack/actions/runs/41844291127)) and `webkit` ([41845230443](https://github.com/alexc83/uptrack/actions/runs/41845230443)) on `main` at `325e839`; every job concluded `success`, and the single-browser dispatches ran only that job (job durations about 4.1 / 5.5 min for `all`, 4.9 min Firefox alone, 4.5 min WebKit alone). Only job conclusions were read in the closeout session; the 146-per-browser counts come from the PR run 41827213935.

- **Scheduled execution** (05:17 UTC): **no run with `event=schedule` exists** (`gh run list --workflow=browsers.yml --event schedule` is empty, checked 2026-11-04 ~23:18 UTC). The workflow reached `main` (~14:00 UTC) after that day's slot, so the first possible run is 2026-11-05 05:17 UTC; GitHub may delay scheduled runs and may disable them after 60 days without repository activity [A]. Do not claim it passed until observed.
- **Failure-only artifact upload** (`e2e-<browser>-report`, 7 days) and the failure path of the summary step: not exercised, because no browser run has failed.
- **Rendered job-summary tables:** not independently inspected.
- **Stability across multiple runs:** four passing runs of the same commit lineage; no flake evidence either way, but no sustained sample.
- **Older Dependabot PRs** whose last CI run predates the new rules may lack results for the four required checks and may need a rebase or re-run to become mergeable [A]; Dependabot configuration was not changed.
- Contents of the JUnit artifacts; Edge functional testing (deferred); real Safari and VoiceOver (outstanding since the M-series; Playwright WebKit is an engine proxy).

## 7. Branch-protection and required-check findings (pre-change audit, then applied outcome)

### 7.0 Applied outcome (2026-11-04, owner-authorized; supersedes the recommendations below) [V]

Executed from a local Claude Code CLI session (`gh` authenticated as `alexc83`, scopes `repo`, `read:org`; the cloud session had been blocked from the Rulesets API). Branch `chore/d01-e-branch-protection` (local, from `origin/main`, never committed to) was used to start the work; the closeout lives on `chore/d01-e-final-closeout`.

**Ruleset `26574227` "Require CI and pull requests on main"** — created `disabled` (2026-11-04 17:08 −06:00), read back, then set `active`:
- Target branch, include `~DEFAULT_BRANCH` (`main`), no excludes; `bypass_actors: []`, `current_user_can_bypass: never` → **no standing administrator bypass**.
- `pull_request`: `required_approving_review_count: 0`, `allowed_merge_methods: ["merge"]` (merge commits only), no code-owner, last-push or thread-resolution requirement, stale-review dismissal off. GitHub added `require_extra_approval_for_unattributed_changes: true` as a server default; it was explicitly set to `false` while the ruleset was still disabled, so the read-back matches the approved plan.
- `required_status_checks`: `backend`, `backend-postgres`, `frontend`, `e2e-chromium`, each with `integration_id` 15368 (GitHub Actions); `strict_required_status_checks_policy: false` (**branches need not be up to date with `main`**); `do_not_enforce_on_create: false`.
- Not required: Firefox/WebKit (`Browsers`), CodeQL, Vercel. No linear-history rule. Repository-level merge methods (merge, squash, rebase) are unchanged; the ruleset restricts pull-request merges to merge commits.
- The rules endpoint for `main` lists `deletion` and `non_fast_forward` (ruleset 26409215) and `pull_request` and `required_status_checks` (ruleset 26574227).

**Ruleset `26409215` "Protect main"** — unchanged: active, `deletion` + `non_fast_forward`, no bypass actors, `updated_at` `2026-11-02T20:08:48.919-06:00` before and after.

**Enforcement verification with disposable PRs** (branches `test/d01-e-ruleset-fail` and `test/d01-e-ruleset-pass` from `origin/main`; commits authored as `alexc83`, no AI trailers):

| Scenario | PR | Result |
|---|---|---|
| Required checks pending | #40 and #41 | `gh pr merge --merge` refused: "base branch policy prohibits the merge"; `mergeStateStatus: BLOCKED` |
| One required check failed (`frontend`; `backend`, `backend-postgres`, `e2e-chromium` passed; deliberate failing test `frontend-react/src/test/zz-ruleset-failure.test.ts`) | #40, run 41931386340 | Still `BLOCKED`, merge refused; **closed unmerged** |
| All four required checks passed | #41, run 41931391906 | `mergeStateStatus: CLEAN`; **merged as `5d121ae`** (commit `4c38786` added `context/migration/ruleset-validation-marker.md`) |

The marker file is removed by the closeout branch; the test branches were **not deleted** (owner cleanup decision). The `--admin` merge option was not used and is unavailable (`current_user_can_bypass: never`).

### 7.1 Pre-change audit (historical; read-only, written before the ruleset existed)


**Verified current configuration [V, read-only GitHub API]:** classic branch protection on `main`: none (404). One active **ruleset**, "Protect main" (id 26409215, target default branch, enforcement active, no bypass actors, `current_user_can_bypass: never`) with only two rules: `deletion` and `non_fast_forward`. There is **no required status check** and **no pull-request requirement**. Repository merge methods: merge commit, squash and rebase all allowed; auto-merge off; delete-branch-on-merge off. This replaces the earlier "rules unknown" statement (spec R1).

**Check names reported on pull requests [V]:** `backend`, `backend-postgres`, `frontend`, `e2e-chromium` (job names equal job keys; CI has no path filters, so every PR reports all four), plus `CodeQL`, `Analyze (actions)`, `Analyze (java-kotlin)`, `Analyze (javascript-typescript)`, the `Vercel Preview Comments` check run and a `Vercel` commit status. The new Browsers jobs run only on PRs that touch `browsers.yml`, so they must **not** be required.

**Recommendations as written before the change (items 1–2 and the bypass decision were applied as §7.0; the rest remain open):**
1. Add a `required_status_checks` rule to "Protect main" requiring exactly `backend`, `backend-postgres`, `frontend` and `e2e-chromium`. Leave "branches must be up to date" off initially (re-runs on a docs-heavy flow). Keep Firefox/WebKit informational.
2. Add a `pull_request` rule with 0 required approvals (sole owner) and `allowed_merge_methods: ["merge"]`, matching the merge-commit practice. Do **not** require linear history (it forbids merge commits).
3. **Administrator bypass:** the ruleset currently has no bypass. Once the four checks are required, a broken CI could block even a fix for CI itself. Consider a repository-admin bypass limited to "pull request" mode; this is a trade-off between strictness and recoverability and needs an owner decision.
4. CodeQL: prefer a `code_scanning` rule later rather than requiring the `Analyze (…)` contexts. Do not require the Vercel checks.
5. Dependabot already runs the same CI on its PRs; failing ones (e.g. the Spring Boot 4.1.2 PR #29, which failed CI) simply could not merge. `@vitest/coverage-v8` is pinned to Vitest 4.1.12, so a lone Vitest bump PR fails `npm ci`; a Dependabot group for the two would help (a separate configuration change, not made).
6. Required checks gate merges, not deployments. Vercel production deploys from `main` after merge [A]; no Render status was ever observed. Gating deploys is a Vercel/Render setting outside D01.
7. A ruleset "evaluate" (dry-run) mode may be unavailable on a free public repository [A].

**Governance discrepancy preserved (no change made):** `AGENTS.md` ("Git branch lifecycle") says to prefer `git merge --ff-only`, while the D01 pull requests were integrated with GitHub merge commits. This needs a future governance decision; `AGENTS.md` was not edited.

## 8. Open items

D01-W01 (production schema migrations), D01-W02 (live-stack integration CI), D01-W03 (logout query recreation race, **unresolved**) and D01-W04 (Cloudinary certificate lifecycle, documented, **not implemented**) are unchanged. Optional cleanup needing owner authorization (nothing deleted): merged branches `chore/d01-d-test-quality`, `chore/d01-d-closeout`, `chore/d01-c-postgres-ci`, and the closed-unmerged `test/d01-b-ci-failure-validation`.

## 9. Next steps (each needs owner authorization)

1. Review and merge the closeout draft PR (`chore/d01-e-final-closeout`).
2. Observe the first genuine scheduled Browsers run (earliest 2026-11-05 05:17 UTC) and record its result; view the rendered job summaries once.
3. Optional: exercise the failure-only artifact path deliberately (not done; it would need a disposable failing browser test).
4. Optional cleanup (nothing deleted): `test/d01-e-ruleset-fail`, `test/d01-e-ruleset-pass`, local `chore/d01-e-branch-protection`, `chore/d01-d-test-quality`, `chore/d01-d-closeout`, `chore/d01-c-postgres-ci`, closed-unmerged `test/d01-b-ci-failure-validation`.
5. Dependabot: consider rebasing or re-running older PRs; consider a Vitest + `@vitest/coverage-v8` group (separate change; not made). CodeQL `code_scanning` rule remains a later decision.
6. D01-W01 – D01-W04 remain open.
