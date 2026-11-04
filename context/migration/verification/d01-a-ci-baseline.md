# D01-A verification report — CI testing baseline

Status: **D01-A documentation complete — awaiting owner review; not committed/pushed.**
Agent / session: Claude Code (cloud session), D01 audit + D01-A.
Date / branch / base: 2026-11-04 / `claude/uptrack-d01-ci-audit-utzis9` / `main` = `7fabdbb7eba13e0063a181b466ba8dc6715fe80f` (merge of P01 PR #25). All measurements below were taken on this commit with a clean working tree.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md).

Scope: read-only audit and baseline measurement. No application code, test, workflow, dependency manifest, lockfile, deployment or GitHub setting was changed. Coverage tooling was invoked from the command line / installed with `--no-save` only (see §5).

## 1. Environment

| Item | Value |
|---|---|
| Host | Claude Code cloud container, Linux 6.18 (Ubuntu 24.04 userland), not a GitHub runner |
| Java | OpenJDK 21.0.12.1 (Ubuntu build); project uses the Maven wrapper → Maven 3.9.14 |
| Node / npm | v22.23.4 / 10.9.9 |
| PostgreSQL (local, temporary) | 16.15 (Ubuntu package) — **not** the production major |
| Browsers | preinstalled Playwright Chromium build 1243 at `/opt/pw-browsers`; Firefox/WebKit not installed |
| Docker | client present, daemon not running (Testcontainers could not have run here) |
| Network | outbound via agent proxy; Maven Central and npm registry reachable |

Production database baseline: **Neon PostgreSQL 17.11**, verified by the owner with `SELECT version();` in the Neon SQL Editor (2026-11-04). Not independently re-checked by the agent; Neon was never contacted.

## 2. Backend

### 2.1 Default suite (H2)
Command: `cd backend && ./mvnw -B -ntp verify` → **exit 0**, `BUILD SUCCESS`, 1m15s wall (Maven reported 1:11).

**Tests run: 165, Failures: 0, Errors: 0, Skipped: 0.** Executable JAR `target/backend-0.0.1-SNAPSHOT.jar` (≈66 MB) built.

| Class | Tests | Time |
|---|---|---|
| CrossUserAuthorizationIntegrationTest | 47 | 12.5 s |
| SecurityRemediationIntegrationTest | 24 | 2.6 s |
| CredentialControllerIntegrationTest | 12 | 1.9 s |
| ClientIpResolverTest | 12 | 0.10 s |
| CertificateFileValidatorTest | 11 | 1.4 s |
| RequestRateLimiterTest | 11 | 0.16 s |
| CERecordControllerIntegrationTest | 8 | 1.7 s |
| UserControllerIntegrationTest | 7 | 1.2 s |
| UploadControllerIntegrationTest | 6 | 1.1 s |
| RequestSizeLimitFilterTest | 6 | 0.04 s |
| JwtAuthenticationFilterTest | 4 | 0.02 s |
| TrustedProxyRateLimitIntegrationTest | 4 | 1.8 s |
| AuthControllerIntegrationTest | 3 | 0.35 s |
| AuthPropertiesTest | 2 | 0.64 s |
| DashboardControllerIntegrationTest | 2 | 3.2 s |
| BackendApplicationTests, SecurityConfigurationTest, MultipartHttpIntegrationTest, CertificateUploadConcurrencyTest, MvcAdvisoryGuardrailTest, LoginWorkFactorTest | 1 each | — |

Environment dependencies: none beyond JDK 21 and Maven Central. No database server, network service, secret or environment variable is required; `application-test.yml` supplies synthetic values.

### 2.2 PostgreSQL feasibility run (diagnostic only)
A disposable local PostgreSQL **16.15** database (`uptrack_ci_test`, non-superuser role `uptrack_ci`, throwaway password) was created, used once, then dropped together with the role, and the server was stopped.

Command: `SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/uptrack_ci_test SPRING_DATASOURCE_USERNAME=uptrack_ci SPRING_DATASOURCE_PASSWORD=<throwaway> SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect ./mvnw -B -ntp test` → exit 1, 35 s.

Result: **164/165 passed, 1 error, 0 failures.** The error: `MultipartHttpIntegrationTest` failed to load its context because the test hard-codes `spring.datasource.url=jdbc:h2:mem:multipart-http;MODE=PostgreSQL` (line 20) while the environment forced the PostgreSQL driver class. Classification: **harness/configuration conflict, not an application defect.** Hibernate logged HHH90000025 (explicit `PostgreSQLDialect` unnecessary).

Not proven: behaviour on PostgreSQL **17** (production major) — **NOT RUN**; deferred to D01-C with `postgres:17`.

### 2.3 Coverage (JaCoCo 0.8.13, invoked from the CLI; `pom.xml` unchanged)
Command: `./mvnw -B -ntp -q org.jacoco:jacoco-maven-plugin:0.8.13:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.13:report` → exit 0, 49 s.

**Total: 93.1% line, 77.0% branch, 92.6% instruction.**

| Package | Line | Branch |
|---|---|---|
| controller | 100% | 100% |
| config | 100% | 90.0% |
| dto (request/response), enums | 100% | 100% |
| validation | 97.4% | 75.6% |
| security | 94.0% | 83.8% |
| service.impl | 93.7% | 69.9% |
| entity | 84.7% | 50.0% |
| exception | 80.0% | 100% |

Weakest classes and uncovered behaviour:
- `CertificateUploadServiceImpl` 71.2% line / 47.5% branch — upload `IOException` path (L80–82), cleanup early return and `destroy` call with provider `IOException`/`RuntimeException` failures (L92–109).
- `GlobalExceptionHandler` 70.6% line — 403 handler (L52), 413 `UploadTooLargeException` (L104), 503 `UploadBusyException` with `Retry-After: 5` (L109–112), 409 data-integrity conflict (L118), generic 500 handler and its logging (L125–127).
- `UserServiceImpl` 64.3% branch — account-changed 409 on profile update (L44) and password change (L62); unauthenticated guard (L87).
- `RequestSizeLimitFilter.BoundedServletInputStream` 68.4% line; entity classes (getters/equality branches) 72–95%.

## 3. Frontend

All commands from `frontend-react/`.

| Command | Exit | Time | Result |
|---|---|---|---|
| `npm ci --no-audit --no-fund` | 0 | 13 s | installed from lockfile v3 |
| `npm run typecheck` | 0 | 13 s | pass |
| `npm run lint` | 0 | 6 s | pass, no warnings printed |
| `npx vitest run` | 0 | 31 s | **571/571 tests, 41/41 files**, 0 skipped |
| `npm run build` | 0 | 11 s | pass; warning: `index-*.js` 678.81 kB (213.73 kB gzip) > 500 kB |

### 3.1 Mocked Playwright E2E (bundled Chromium)
- First attempt: `CI=1 E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium` → **146 failed** in 71 s, every one with `browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1248/...`. Classification: **missing infrastructure** — `@playwright/test` 1.64.1 expects browser build 1248; the container ships build 1243. No test code ran.
- Second attempt with a scratchpad-only config (outside the repository) that imported `playwright.config.ts` unchanged, kept only the `chromium` project and set `launchOptions.executablePath` to the preinstalled Chromium: **146/146 passed**, 3.0 min (exit 0). Workers 1, retries 0.
- Caveat: browser build 1243 is not the build pinned by Playwright 1.64.1; CI will install the matching build with `npx playwright install --with-deps chromium`.
- "Chromium (bundled)" engine coverage only. **NOT RUN:** `msedge`, `chrome`, `firefox`, `webkit`, `visual-edge` (not registered on Linux), and the live suite (`playwright.live.config.ts`, `e2e-live/api-live.test.mjs`).
- Environment dependencies: Vite dev server on 5173 (started by Playwright), loopback server from `e2e/local-server.ts`; no backend (default-deny `/api` mocks).

Spec-file inventory (`test(` declarations; parameterised specs expand to the 146 executed tests): api-transport 8, app-shell 5, auth 15, ce-records 3, ce-report 3, credentials 8, dashboard 10, landing 9, roadmap 6, settings 3, shared-ui 2, smoke 3, theme 4, visual 2 (Edge/macOS only).

### 3.2 Coverage (`@vitest/coverage-v8` 4.1.12 installed with `npm i --no-save`; `package.json`/lockfile unchanged)
Command: `npx vitest run --coverage --coverage.include='src/**' --coverage.reporter=text-summary --coverage.reporter=json-summary --coverage.reportsDirectory=<scratchpad>` → 571/571, exit 0.

**Statements 93.94% (1646/1752), branches 87.5% (1121/1281), functions 93.08% (579/622), lines 96.84% (1321/1364).**

Lowest files (line % / branch %): `src/main.tsx` 0/0 (bootstrap); `app/preview/shared-ui-preview.tsx` 55/50 (dev-only preview); `features/settings/use-settings.ts` 76.9/43.8; `features/ce-records/ce-record-form.tsx` 80.8/81.6; `features/ce-records/use-certificate-upload.ts` 81.6/57.1; `features/credentials/credential-detail-drawer.tsx` 89.5/71.7; `features/ce-records/ce-record-detail-drawer.tsx` 92.3/70.7; `features/ce-records/use-ce-record-mutation.ts` 97.0/70.0.

## 4. Existing CI/CD (read-only GitHub API, 2026-11-04)
- Workflows: `Dependabot Updates` (dynamic) and `CodeQL` default setup (dynamic). No repository workflow files.
- PR #25 head `77e8f4a`: check runs `Analyze (java-kotlin)` (52 s), `Analyze (javascript-typescript)` (60 s), `CodeQL`, `Vercel Preview Comments` — all success; commit status `Vercel` "Deployment has completed" (preview deployment).
- No Render status/check observed on PR #25.
- Repository visibility: public. `main`: `protected: true`; rule details not visible to the agent.
- Remote branches present include merged feature branches and Dependabot branches (not modified).

## 5. Deviations and cleanup
- Scratchpad-only Playwright config and coverage outputs live outside the repository; not committed.
- `@vitest/coverage-v8` (+10 transitive packages) exists only in the local, git-ignored `node_modules`; `git status` was clean after installation.
- JaCoCo output was written to git-ignored `backend/target/`.
- Temporary PostgreSQL database and role dropped; service stopped.
- No Neon, Render, Vercel or Cloudinary endpoint was contacted.

## 6. Classification summary

| Item | Classification |
|---|---|
| Backend 165/165 (H2) | PASS — genuine |
| Backend on PostgreSQL 16: 1 error | test-configuration conflict (hard-coded H2 URL) — not a code failure |
| Backend on PostgreSQL 17 | NOT RUN |
| Frontend typecheck/lint/unit/build | PASS — genuine |
| E2E first attempt 146 failures | missing infrastructure (browser build mismatch) |
| E2E Chromium 146/146 | PASS — genuine, with non-pinned browser build caveat |
| Firefox/WebKit/Edge/Chrome/visual/live | NOT RUN (environment/policy) |

Full regression status: this report records an audit baseline at `7fabdbb`. It is not owner verification and not four-browser coverage.
