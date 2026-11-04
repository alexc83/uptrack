# D01 — Continuous Integration Foundation

Metadata
- Owner: alexc83. Agent (D01-A): Claude Code (cloud session).
- Status: **READY** — architecture and milestone plan approved in principle by the owner (D01 approval brief, 2026-11-04). **D01-A authorized and implemented (documentation only). D01-B, D01-C, D01-D and D01-E each require separate authorization before implementation.**
- Branch (D01-A): `claude/uptrack-d01-ci-audit-utzis9`, created from `main` = `7fabdbb` (merge of P01 PR #25).
- Dependencies: P01 merged (`7fabdbb`); S05H merged (`a7b0f34`); M14 cutover on `main` (`2561919`, `9022d73`).
- Revision: r1, 2026-11-04.
- Baseline evidence: [`verification/d01-a-ci-baseline.md`](../verification/d01-a-ci-baseline.md).

Notation: **[V]** = verified by command output, repository inspection or read-only GitHub API in the D01 audit; **[O]** = verified by the owner and reported in the approval brief (not independently re-checked by the agent); **[A]** = assumption / not verifiable from the repository; **[P]** = proposed future change (not implemented).

## 1. Goal and non-goals

**Goal.** Give UpTrack independent, reproducible, secure automated verification on GitHub-hosted runners so development can continue through cloud coding agents (Claude Code Cloud, Codex, others) without the owner's local machine running tests. A green pipeline must mean the checks actually ran and passed.

**Non-goals (all of D01).**
- No continuous deployment, no change to Render, Vercel or Neon configuration or integrations, no production database access.
- No Kubernetes, no cloud-provider migration, no paid runners or services.
- No schema-migration tooling (Flyway/Liquibase) — tracked as [D01-W01](../follow-ups/d01-w01-schema-migrations.md).
- No live React → Spring Boot → PostgreSQL CI suite — tracked as [D01-W02](../follow-ups/d01-w02-live-stack-integration-ci.md).
- No change to the testing responsibility split in `context/testing-workflow.md` beyond documenting CI; Edge/macOS visual goldens remain owner-approved only.
- No GitHub branch-protection/ruleset change without explicit owner authorization (D01-E only recommends).

## 2. Existing implementation inspected

### 2.1 Backend (`backend/`)
- [V] `pom.xml`: Spring Boot parent **3.5.16**, `java.version` **21**; dependencies `spring-boot-starter-{web,security,validation,data-jpa}`, PostgreSQL driver (runtime), jjwt 0.13.0, Cloudinary `cloudinary-http5` 2.5.0, PDFBox 3.0.8, TwelveMonkeys WebP; test: `spring-boot-starter-test` (JUnit 5, Mockito, MockMvc, AssertJ) and **H2 2.3.232**. No JaCoCo, no Testcontainers, no Flyway/Liquibase, no explicit surefire/failsafe configuration (Surefire **3.5.6** from the Boot BOM).
- [V] Maven wrapper 3.3.4 (`only-script`) → Maven **3.9.14** (`.mvn/wrapper/maven-wrapper.properties`).
- [V] `src/main/resources/application.yml`: all production values come from environment variables (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `AUTH_JWT_SECRET`, `AUTH_JWT_EXPIRATION_SECONDS`, `CLOUDINARY_*`, optional `TRUSTED_PROXIES`, `ALLOWED_ORIGIN_PATTERNS`, `MAX_*`); `spring.jpa.hibernate.ddl-auto: update`; PostgreSQL driver.
- [V] `src/test/resources/application-test.yml`: H2 in-memory `jdbc:h2:mem:uptrack-test;MODE=MySQL`, `H2Dialect`, `ddl-auto: create-drop`, synthetic JWT secret and placeholder Cloudinary values, relaxed rate limits for shared fixtures (dedicated limiter tests use production limits).
- [V] Every Spring test is `@SpringBootTest` + `@ActiveProfiles("test")`. `MultipartHttpIntegrationTest` (line 20) overrides the URL to `jdbc:h2:mem:multipart-http;MODE=PostgreSQL` and runs on a random port; `TrustedProxyRateLimitIntegrationTest` overrides limiter/proxy properties.
- [V] Cloudinary is mocked in tests (`UploadControllerIntegrationTest`, `MultipartHttpIntegrationTest`, `SecurityRemediationIntegrationTest`, `CertificateUploadConcurrencyTest`). No test performs network I/O to an external service.
- [V] Test inventory (22 classes, 165 executed tests): 11 controller integration classes (Auth, Credential, CERecord, Dashboard, User, Upload, Multipart HTTP, CrossUserAuthorization **47**, SecurityRemediation 24, TrustedProxyRateLimit 4, plus the abstract base), security unit tests (JwtAuthenticationFilter, RequestRateLimiter, ClientIpResolver, RequestSizeLimitFilter, LoginWorkFactor, MvcAdvisoryGuardrail), `CertificateFileValidatorTest`, `CertificateUploadConcurrencyTest`, `AuthPropertiesTest`, `SecurityConfigurationTest`, `BackendApplicationTests`. No `@Disabled`/`@Tag` tests.

### 2.2 Frontend (`frontend-react/`)
- [V] Resolved versions (lockfile v3): React **19.3.1**, TypeScript **5.7.3**, Vite **7.3.7**, Vitest **4.1.12** (jsdom), Testing Library (react/dom/user-event/jest-dom), `@playwright/test` **1.64.1**, ESLint 9 + typescript-eslint + react/react-hooks/jsx-a11y. No `engines` field and no `.nvmrc`; Node **22.23.4** works.
- [V] Scripts: `typecheck` (`tsc -b --noEmit`), `lint` (`eslint .`), `test` (`vitest run`), `build` (`tsc -b && vite build`), `e2e*`, `verify:local`. No coverage script and no coverage provider dependency.
- [V] `vitest.config.ts`: jsdom, `src/test/setup.ts`, excludes `e2e/**` and `e2e-live/**`. 41 test files.
- [V] `playwright.config.ts`: `testDir: ./e2e`, `workers: 1`, `retries: 0`, `forbidOnly: !!CI`, `reporter: 'list'`, `trace: 'on-first-retry'` (with 0 retries, traces are never recorded), `webServer: npm run dev` on 5173 (`reuseExistingServer: !CI`). Projects `msedge`, `chrome`, `firefox`, `webkit`; `E2E_CHROMIUM_FALLBACK=1` swaps msedge+chrome for bundled `chromium`; `visual-edge` is registered only on macOS without the fallback.
- [V] E2E specs mock the API with a **default-deny** `/api` route (`e2e/helpers.ts`); no backend is required. `e2e/local-server.ts` starts a loopback HTTP server for multipart/redirect specs.
- [V] `playwright.live.config.ts` + `e2e-live/` (M13): live acceptance against a disposable loopback backend (default `http://localhost:18081`, refuses non-loopback and port 8080), Edge channel only; not part of `npm run e2e`.

### 2.3 Infrastructure
- [V] `backend/Dockerfile`: two-stage `maven:3.9.9-eclipse-temurin-21` build (`./mvnw clean package -DskipTests`) → `eclipse-temurin:21-jre`, `EXPOSE 8080`. No Compose file.
- [V] `.github/` contains only `dependabot.yml` (npm `/frontend-react`, Maven `/backend`, weekly, 3 open PRs each). **No workflow files.** No `github-actions` Dependabot ecosystem.
- [V] GitHub Actions (read-only API): two dynamic workflows — **Dependabot Updates** and **CodeQL default setup**. On PR #25 head `77e8f4a`, check runs were `Analyze (java-kotlin)`, `Analyze (javascript-typescript)`, `CodeQL` — all success.
- [V] Vercel GitHub integration is active: PR #25 head carries a `Vercel` commit status "Deployment has completed" and a `Vercel Preview Comments` check run (preview deployments run per PR, independently of GitHub Actions).
- [V] Repository is **public**; `main` reports `protected: true` via the branches API. The protection rules/rulesets themselves were not readable and are **unknown** [A].
- [V] No Render, Vercel or Neon configuration file is committed; no `.env` is tracked (only `frontend-react/.env.example`).
- [O] Production database: **Neon PostgreSQL 17.11** (owner ran `SELECT version();` in the Neon SQL Editor). This is the verified production database baseline.
- [A] Render builds the backend from `backend/Dockerfile` and may auto-deploy pushes to `main`; the tracker records the hosted backend as suspended. No Render status appeared on PR #25. Must be verified manually in the Render dashboard.
- [A] Vercel production auto-deploys pushes to `main` (typical for the Git integration). Must be verified manually in the Vercel dashboard.

## 3. Baseline behaviors (summary; full evidence in the baseline report)

| Scenario | Command | Observed | Evidence |
|---|---|---|---|
| Backend compile + test + package (H2) | `./mvnw -B -ntp verify` | 165/165 pass, 0 skipped, JAR built; 1m15s | [V] baseline §2.1 |
| Backend suite on PostgreSQL **16** (env overrides) | see baseline §2.2 | 164/165; the 1 error is the hard-coded H2 URL in `MultipartHttpIntegrationTest` meeting the forced PostgreSQL driver (harness conflict, not a code defect); 35s | [V] |
| Backend suite on PostgreSQL **17** | — | **NOT RUN** (production major; D01-C) | — |
| Frontend typecheck / lint / build | `npm run typecheck|lint|build` | pass / pass / pass (679 kB main-chunk warning) | [V] |
| Frontend unit | `npx vitest run` | 571/571, 41 files; 31s | [V] |
| Mocked E2E, bundled Chromium | `CI=1 E2E_CHROMIUM_FALLBACK=1 playwright test --project=chromium` | 146/146 (after pointing at the container's preinstalled Chromium); 3.0 min | [V] |
| Firefox / WebKit / Edge / Chrome / visual-edge / live suite | — | NOT RUN in the audit | — |
| Backend coverage (JaCoCo 0.8.13 via CLI) | baseline §3 | **93.1% line / 77.0% branch** | [V] |
| Frontend coverage (`@vitest/coverage-v8` 4.1.12, `--no-save`) | baseline §3 | **96.8% line / 87.5% branch** | [V] |

## 4. Testing gaps (classified)

Critical
- G1 — No CI: nothing runs on pull requests (addressed by D01-B).
- G2 — The automated backend suite never runs on PostgreSQL; production runs PostgreSQL 17.11 [O] while tests use H2 in MySQL mode (addressed by D01-C).

Important
- G3 — `GlobalExceptionHandler`: HTTP 403, 409 (data-integrity conflict), 503 + `Retry-After`, and generic 500 (no stack trace / implementation detail leakage) paths are not exercised (D01-D).
- G4 — `CertificateUploadServiceImpl` upload I/O failure and Cloudinary cleanup failure paths (47.5% branch) (D01-D).
- G5 — `UserServiceImpl` account-changed 409 paths and the unauthenticated guard (D01-D).
- G6 — Frontend `use-settings.ts` (43.8% branch) and `use-certificate-upload.ts` (57.1% branch) error/edge paths (D01-D).
- G7 — Mocked E2E cannot detect frontend/backend contract drift (D01-W02).
- G8 — `ddl-auto: update` with no migrations; CI cannot validate schema evolution against Neon (D01-W01).

Optional
- G9 — No coverage reporting in the build (D01-D adds reporting, no thresholds).
- G10 — Drawer-component branch coverage; main bundle 679 kB.
- G11 — [A] `LocalDate.now()` in `DashboardServiceImpl`/`CredentialServiceImpl` uses the JVM default zone; date-boundary tests could be sensitive near midnight. Not observed; investigate only if CI shows date-related flakes.

## 5. Proposed CI architecture [P]

### 5.1 Workflow `ci.yml` (D01-B, extended by D01-C/D)
- Triggers: `pull_request` (branches: `main`), `push` (branches: `main`), `workflow_dispatch`. No path filters initially. **Never** `pull_request_target`, `workflow_run` with PR code, or self-hosted runners.
- `permissions: contents: read` at workflow level; jobs add nothing unless a specific need is documented.
- `concurrency: { group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}, cancel-in-progress: true }` — but pushes to `main` should not cancel each other (`cancel-in-progress: ${{ github.event_name == 'pull_request' }}`).
- Runner: `ubuntu-latest` (standard GitHub-hosted). `timeout-minutes` on every job.
- Jobs (independent, parallel):
  1. **backend** — `actions/setup-java` (Temurin 21, `cache: maven`); `./mvnw -B -ntp verify` in `backend/`; upload `backend/target/surefire-reports/` on failure (short retention).
  2. **frontend** — `actions/setup-node` (Node 22, `cache: npm`, `cache-dependency-path: frontend-react/package-lock.json`); `npm ci`, `npm run typecheck`, `npm run lint`, `npx vitest run` (with a JUnit reporter on the command line), `npm run build`.
  3. **e2e-chromium** — Node 22 + `npm ci`; `npx playwright install --with-deps chromium` (version from the lockfile, avoiding the browser-build mismatch seen in the audit); `CI=1 E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium` with CI-only reporters (`list`, `html`, `junit`) and failure traces/screenshots; upload `playwright-report/` and `test-results/` on failure. `visual-edge` is never registered on Linux, so goldens are never touched.
  4. **backend-postgres** (D01-C) — see §5.2.
- Reporting: step summaries plus artifacts; artifact `retention-days` kept short (e.g. 7–14). No third-party test-report actions initially (avoids extra trust and `checks: write`).

### 5.2 PostgreSQL 17 integration-test design (D01-C)
- GitHub Actions **service container** `postgres:17` (official image; major-version match with Neon 17.11 [O]; minor pinning not required unless a compatibility issue appears), health-checked with `pg_isready`, port mapped to the runner.
- Disposable, workflow-local credentials defined inline (e.g. user/db `uptrack_ci`); these are not secrets and never reused anywhere. No Neon credentials, no repository/environment secrets.
- A dedicated test profile (e.g. `application-ci-postgres.yml` under `src/test/resources`, activated in addition to `test`) supplying the PostgreSQL URL/driver/dialect via environment variables; H2 remains the default.
- Narrow test-configuration correction approved in principle: make `MultipartHttpIntegrationTest`'s datasource URL overridable by that profile while preserving its H2 behaviour by default. No test excluded or weakened; no application behaviour changed for CI.
- Both H2 and PostgreSQL jobs are kept until actual CI runtimes and results have been collected; then evaluate whether full duplication remains worthwhile.
- Testcontainers is not introduced unless implementation demonstrates a clear advantage (it adds a dependency and a Docker requirement locally).
- Document every H2-vs-PostgreSQL behavioural difference discovered.

### 5.3 Browser testing strategy
- Every PR: mocked functional suite on Playwright bundled **Chromium** (`e2e-chromium`). Reports must say "Chromium (bundled)", never Edge/Chrome.
- `browsers.yml` (D01-E): Firefox and WebKit, `schedule` (nightly) + `workflow_dispatch`, not required for PRs initially.
- Edge/Chrome branded builds and `visual-edge` (Edge/macOS goldens) remain owner-run per `testing-workflow.md`; CI never runs `--update-snapshots`.
- **Owner decisions for D01-E (recorded 2026-11-04; not implemented in D01-C):**
  - *Every pull request:* keep running the Chromium (bundled) functional E2E suite.
  - *Nightly browser compatibility:* add Firefox and WebKit functional E2E on a schedule; do not re-run Chromium there (no duplicated coverage).
  - *Microsoft Edge:* functional testing is optional, added only if a specific compatibility need arises. The existing macOS Edge `visual-edge` baselines are preserved and remain owner-approved only.
  - *Manual runs:* developers can trigger the broader browser matrix on demand (`workflow_dispatch`) when working on browser-sensitive functionality.
  - Existing Playwright configurations and visual baselines are not modified by D01-C.
- Live suite (`e2e-live/`) is out of D01 (D01-W02).

### 5.4 Workflow security requirements
- Least privilege: `contents: read` default; no `write` scopes, no `id-token`, no deployment permissions.
- Every action (official and third-party) pinned to a full 40-character commit SHA with a version comment; only GitHub-owned actions (`actions/checkout`, `actions/setup-java`, `actions/setup-node`, `actions/upload-artifact`) planned. SHAs are resolved from the upstream tags at D01-B implementation time, not invented.
- Dependabot `github-actions` ecosystem (directory `/`) added in D01-B to keep pins current.
- `actions/checkout` with `persist-credentials: false`.
- No secrets referenced by any CI workflow; fork PRs therefore behave identically and safely. Nothing echoes environment values; artifacts contain only test reports.
- All databases/services are job-local and destroyed with the runner.
- CodeQL default setup is preserved unchanged; no duplicate CodeQL workflow is added.

### 5.5 Runtime and runner usage (estimates until measured) [A]
| Job | Estimated wall time |
|---|---|
| backend (H2) | ~2.5 min |
| backend-postgres | ~2.5 min |
| frontend | ~2 min |
| e2e-chromium | ~5 min |
| browsers.yml nightly (Firefox + WebKit) | ~10 runner-min |

Per PR push: ~5 min wall time, ~12 runner-minutes. Public repository: standard GitHub-hosted runners have no per-minute charge (subject to GitHub usage policies). If the repository became private, GitHub Free's 2,000 min/month would allow roughly 150 PR runs. **Actual runtimes must be recorded after D01-B/C.** Plus existing CodeQL (~1 min per PR, observed on PR #25).

## 6. Milestones and acceptance criteria

### D01-A — Specification, baseline, documentation (authorized; implemented)
Scope: this spec; `verification/d01-a-ci-baseline.md`; follow-ups D01-W01/W02; stale counts in `testing-workflow.md`; tracker/handoff/master-plan/current-feature updates supported by git history. No code, tests, workflows or deployment changes.
1. Given the audit, when the spec is read, then every finding is labelled [V]/[O]/[A]/[P].
2. Given `git diff --stat`, then only `context/**` Markdown files changed.
3. Given the tracker, then P01, M14, S04, S04.1 and S05H statuses match `git merge-base --is-ancestor` evidence.

### D01-B — Initial GitHub Actions CI (approved in principle; not authorized)
Files: `.github/workflows/ci.yml`, `.github/dependabot.yml` (add `github-actions`). Optionally a CI section in `testing-workflow.md`.
1. Given a PR to `main`, when it is opened or updated, then `backend`, `frontend` and `e2e-chromium` run in parallel on `ubuntu-latest` and each reports a distinct check.
2. Given a push to `main` or a manual dispatch, then the same jobs run.
3. Given an unchanged tree, then backend 165/165, frontend unit 571/571 (or the then-current count), typecheck/lint/build pass, Chromium E2E 146/146 (or then-current) — all green.
4. Given a deliberately failing backend test, frontend test and E2E assertion on a throwaway branch/PR (never merged), then the corresponding job fails and its report artifact is downloadable.
5. Given the workflow file, then `permissions` is `contents: read`, no `pull_request_target`, every `uses:` is a full SHA, `persist-credentials: false`, and no `secrets.*` reference exists.
6. Given two rapid pushes to one PR, then the first run is cancelled.
7. Given the run, then no step contacts Neon, Render, Vercel or Cloudinary.
8. Actual job durations are recorded in the D01-B report.
Verification: actionlint (if available) or careful review; `git diff`; observed GitHub Actions runs (links in report).

### D01-C — PostgreSQL 17 parity (approved in principle; not authorized)
Files: `.github/workflows/ci.yml` (`backend-postgres`), `backend/src/test/resources/application-ci-postgres.yml` (or equivalent), `MultipartHttpIntegrationTest.java` (URL overridable only).
1. Given the `backend-postgres` job, then it uses `postgres:17` with disposable inline credentials and no secrets.
2. Given the PostgreSQL profile, then all 165 tests (or the then-current count) execute and pass on PostgreSQL 17, with 0 excluded.
3. Given the default `./mvnw test` (no profile), then H2 behaviour and counts are unchanged.
4. Given any H2-vs-PostgreSQL difference, then it is documented in the D01-C report.
5. After ≥10 CI runs, a recommendation on keeping both jobs is recorded.

### D01-D — Important test gaps and coverage reporting (approved in principle; not authorized)
1. Backend tests cover G3 (403/409/503 + `Retry-After`/500 with no stack trace or class names in the body), G4, G5, using existing MockMvc/Mockito patterns.
2. Frontend tests cover G6 and relevant loading/empty/error states with existing Testing Library patterns.
3. JaCoCo (backend) and `@vitest/coverage-v8` (frontend, dependency addition approved within D01-D) produce reports as CI artifacts/summaries; **no thresholds enforced**.
4. Coverage is compared with the D01-A baseline (93.1/77.0 backend, 96.8/87.5 frontend); threshold proposals are made only after review.
5. No test is skipped, deleted or weakened; no assertion-free tests.

### D01-E — Browser matrix, documentation, branch protection (approved in principle; not authorized)
1. `browsers.yml` runs Firefox + WebKit (not Chromium again) nightly and on dispatch, so developers can trigger the broader matrix manually; Edge functional is optional on demand; not a required PR check; `contents: read`; failures produce artifacts.
2. `testing-workflow.md` gains a CI section: triggers, what each job checks, interpreting failures, downloading artifacts, reproducing locally, CI-vs-production differences, measured times and cost.
3. A ruleset/branch-protection recommendation lists required checks (e.g. `backend`, `backend-postgres`, `frontend`, `e2e-chromium`), accounting for CodeQL and Dependabot, plus the interaction with Vercel/Render auto-deploy. No setting is changed without authorization.
4. Visual baselines unchanged.

## 7. Verification commands
- Backend: `cd backend && ./mvnw -B -ntp verify`.
- Frontend: `cd frontend-react && npm ci && npm run typecheck && npm run lint && npx vitest run && npm run build`.
- Chromium E2E: `npx playwright install --with-deps chromium && CI=1 E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium`.
- Coverage (measurement only, no repo change): `./mvnw -B -ntp org.jacoco:jacoco-maven-plugin:0.8.13:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.13:report`; `npm i --no-save @vitest/coverage-v8@4.1.12 && npx vitest run --coverage`.

## 8. Risks, dependencies and rollback
- R1 — **Deployments are not gated by CI.** Vercel previews run per PR [V]; production deploys on `main` are likely automatic [A]. Until required checks are configured (D01-E, owner action), a red CI does not stop a deploy. `main` is already protected [V] but its rules are unknown.
- R2 — Playwright browser/version drift: the audit container's preinstalled Chromium did not match `@playwright/test` 1.64.1; CI must install browsers from the lockfile version.
- R3 — E2E flakiness: historical one-off flakes (M07/M08) are resolved; one Chromium run here passed 146/146. Any CI flake must be investigated and documented, never retried away silently (`retries: 0` stays).
- R4 — H2/PostgreSQL divergence: PostgreSQL 16 run was clean apart from the harness conflict; PostgreSQL 17 not yet run.
- R5 — Action supply chain: mitigated by SHA pinning, GitHub-owned actions only, Dependabot updates.
- R6 — Doubling backend runtime with two DB jobs; reassess after measurement.
- R7 — Documentation drift: the tracker had stale statuses before D01-A; D01 reports must record actual run links and counts.
- Rollback: every D01 milestone is a separate, revertible commit/PR. Deleting or reverting `.github/workflows/*.yml` fully removes CI; no application, deployment or data state depends on it.

## 9. Decisions recorded
- Owner, 2026-11-04: D01-A–E plan approved in principle; D01-A authorized only.
- PostgreSQL CI target: `postgres:17` (production Neon 17.11 [O]).
- Service container over Testcontainers unless proven otherwise.
- Chromium E2E on every PR; Firefox/WebKit nightly + manual, not required initially.
- Owner, 2026-11-04 (browser coverage for D01-E): Chromium every PR; Firefox + WebKit nightly and manual (no duplicated Chromium); Edge functional optional on demand; macOS Edge visual baselines preserved. See §5.3.
- Coverage: report first, no thresholds initially.
- Schema migrations and live-stack CI tracked as D01-W01 / D01-W02, outside D01.

## 10. Completion report reference
- D01-A: [`verification/d01-a-ci-baseline.md`](../verification/d01-a-ci-baseline.md).
- D01-B–E: `verification/d01-b-report.md` … `d01-e-report.md` (to be created).
