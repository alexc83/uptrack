# D01-E verification report — cross-browser CI workflow and branch-protection recommendations

Status: **IMPLEMENTED AND VERIFIED on draft [PR #39](https://github.com/alexc83/uptrack/pull/39), pending merge and post-merge manual validation (2026-11-04).** The browser workflow is **not merged** and D01-E as a whole is **not complete**: scheduled execution, manual dispatch, failure-artifact upload, rendered job summaries and multi-run stability are unverified (§6). Branch-protection changes are recommendations only; no setting was changed.
Agent / session: Claude Code (cloud session).
Date / branch / base: 2026-11-04 / `chore/d01-e-browser-matrix` / `origin/main` = `01aefd0e80c1c12ea3418c4ca480e43e32c9bf36` (merge of D01-D closeout [PR #38](https://github.com/alexc83/uptrack/pull/38)), ahead/behind 0/0 before changes.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md) §5.3, §6 (D01-E). Authorization: owner D01-E audit approval, workflow implementation brief, commit/push/draft-PR authorization and this documentation brief (2026-11-04).

Notation: **[V]** verified from GitHub Actions logs/API or read-only GitHub API in this session; **[L]** local only; **[A]** assumption / not verified.

## 1. Objectives and acceptance criteria

Spec §6 D01-E:

| # | Criterion | Status |
|---|---|---|
| 1 | `browsers.yml` runs Firefox + WebKit (not Chromium) nightly and on dispatch; not a required PR check; `contents: read`; failures produce artifacts | **Implemented; partly verified.** Both browsers passed on the PR run [V]. Nightly schedule, manual dispatch and the failure-artifact path are **not yet exercised** (§6). |
| 2 | `testing-workflow.md` gains a CI section | **Done** in this documentation commit (CI workflows and browser matrix). |
| 3 | Ruleset/branch-protection recommendation, no setting changed | **Done as documentation** (§7). **Nothing was changed.** |
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

Chromium PR job and reporting (`ci.yml`), `playwright.config.ts`, `visual.spec.ts` and the eight `*-msedge-darwin.png` baselines, application and backend code, dependencies, Dependabot configuration, the repository ruleset and all other GitHub settings are unchanged [V]. The macOS Edge visual regression is still owner-run only; Linux screenshots are never compared with the macOS baselines.

## 6. Remaining unverified behaviour (do not treat as validated)

- **Scheduled execution** (05:17 UTC): has not run. Schedules run only from the default branch, and GitHub may disable scheduled workflows after 60 days without repository activity [A].
- **Manual dispatch** (`all`, `firefox`, `webkit`), including that a single-browser dispatch schedules only that job: not run; it needs the workflow on `main` [A].
- **Failure-only artifact upload** (`e2e-<browser>-report`, 7 days) and the failure path of the summary step: not exercised, because nothing failed.
- **Rendered job-summary tables:** the summary step succeeded, but step summaries are not exposed by the API and could not be viewed; the tables must be checked on the run page.
- **Stability across multiple runs:** one run only; no flake evidence either way.
- Contents of the JUnit artifacts (artifact storage host blocked from the sandbox); Edge functional testing (deferred); real Safari and VoiceOver (outstanding since M-series; Playwright WebKit is an engine proxy).

## 7. Branch-protection and required-check findings (read-only; nothing changed)

**Verified current configuration [V, read-only GitHub API]:** classic branch protection on `main`: none (404). One active **ruleset**, "Protect main" (id 26409215, target default branch, enforcement active, no bypass actors, `current_user_can_bypass: never`) with only two rules: `deletion` and `non_fast_forward`. There is **no required status check** and **no pull-request requirement**. Repository merge methods: merge commit, squash and rebase all allowed; auto-merge off; delete-branch-on-merge off. This replaces the earlier "rules unknown" statement (spec R1).

**Check names reported on pull requests [V]:** `backend`, `backend-postgres`, `frontend`, `e2e-chromium` (job names equal job keys; CI has no path filters, so every PR reports all four), plus `CodeQL`, `Analyze (actions)`, `Analyze (java-kotlin)`, `Analyze (javascript-typescript)`, the `Vercel Preview Comments` check run and a `Vercel` commit status. The new Browsers jobs run only on PRs that touch `browsers.yml`, so they must **not** be required.

**Recommendations — decisions pending owner authorization; none applied:**
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

Merge PR #39; run `workflow_dispatch` (`all`, then one browser) and observe the first scheduled run; view the rendered summaries; then decide the ruleset changes in §7 and record D01-E completion.
