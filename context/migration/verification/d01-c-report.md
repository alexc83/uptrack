# D01-C verification report — PostgreSQL 17 backend integration tests

Status: **IMPLEMENTED AND VERIFIED ON PR #35 — owner-approved 2026-11-04; draft PR open, NOT merged.** Do not read this as "merged": D01-C lands on `main` only when the owner authorizes the merge of [PR #35](https://github.com/alexc83/uptrack/pull/35).
Agent / session: Claude Code (cloud session).
Date / branch / base: 2026-11-04 / `chore/d01-c-postgres-ci` / `origin/main` = `1469f270d112325e3e9052b6f94b4a60cdf3a5d3` (merge of D01-B closeout PR #34), ahead/behind 0/0 before changes.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md) §5.2, §6 (D01-C). Authorization: owner D01-C implementation brief and approvals of 2026-11-04 (Option A for the profile design; commits, push and draft PR; final documentation brief).

Notation: **[V]** verified from command output, GitHub Actions logs or the GitHub API in this session; **[L]** local container evidence only; **[U]** not verified / unknown.

## 1. Objectives and acceptance criteria

Add a fourth, independent GitHub Actions job, `backend-postgres`, that runs the Spring Boot backend test suite against a disposable **PostgreSQL 17** service container, without touching the H2 `backend` job, production Neon, or any production configuration.

| Criterion (owner brief / spec §6 D01-C) | Result |
|---|---|
| All existing backend tests pass on PostgreSQL 17 (165, or the legitimately changed count) | **MET [V]** — 167/167 on PostgreSQL 17.11. 167 = the 165 existing tests + 2 new datasource assertions (§4) |
| No test excluded, weakened or silently skipped | **MET [V]** — `Skipped: 0`; no `@Disabled`/exclusion added; no existing assertion changed |
| The existing H2 job remains green | **MET [V]** — `backend` 167/167, JAR built |
| The new job runs independently on GitHub Actions | **MET [V]** — run #20, four parallel jobs |
| Frontend and Chromium E2E jobs remain green | **MET [V]** — 573 and 146 tests |
| CI uses no production credentials or services | **MET [V]** — see §8 |
| Implementation and results documented | This report |
| Postgres actually used, not H2 (owner requirement) | **MET [V]** — JDBC metadata assertions, §5 |

## 2. Implementation summary and exact files changed

PR #35 contains exactly six files in three commits (all authored and committed as `alexc83`, no AI trailers), plus this documentation commit.

| Commit | File | Change |
|---|---|---|
| `b6fcf29` `test(d01): make multipart datasource overridable and add ci-postgres profile` | `backend/src/test/resources/application-test.yml` | H2 document unchanged; a second YAML document, active only under `spring.config.activate.on-profile: ci-postgres`, sets the PostgreSQL URL/user/password (from `CI_POSTGRES_*`, defaulting to a localhost disposable database), driver `org.postgresql.Driver`, dialect `PostgreSQLDialect`, `uptrack.test.expected-database-product: PostgreSQL` and `uptrack.test.multipart-datasource-url` |
| | `backend/src/test/java/com/ccruce/backend/controller/MultipartHttpIntegrationTest.java` | Datasource URL is now `${uptrack.test.multipart-datasource-url:<original H2 URL>}` (H2 stays the default); new test `multipartContextUsesTheExpectedDatabase`. No existing assertion changed |
| | `backend/src/test/java/com/ccruce/backend/TestDatabaseAssertions.java` (new) | Asserts product name, matching `jdbc:<product>:` URL prefix and optional server major version from the context's own `DataSource` metadata |
| | `backend/src/test/java/com/ccruce/backend/TestDatabaseConfigurationTest.java` (new) | Runs that assertion for the shared test context |
| `4aa9326` `ci(d01): add backend-postgres job on PostgreSQL 17` | `.github/workflows/ci.yml` | New job `backend-postgres`; header comment updated. Jobs `backend`, `frontend`, `e2e-chromium`, triggers, permissions and concurrency are unchanged |
| `1acb369` `docs(d01): record D01-E browser coverage decisions` | `context/migration/specs/d01-ci-foundation.md` | Owner browser-coverage decisions for D01-E (planning only) |

No `pom.xml`, `application.yml`, production code, dependency, Dependabot, Playwright configuration or visual baseline changed.

**`backend-postgres` job:** `postgres:17` service container; disposable inline credentials (`uptrack_ci` / `uptrack_ci_disposable`, a throwaway value, not a secret); health check `pg_isready` (5 s interval, 12 retries); Temurin 21 and the Maven wrapper; `SPRING_PROFILES_INCLUDE=ci-postgres`; `UPTRACK_TEST_EXPECTED_DATABASE_PRODUCT=PostgreSQL` and `UPTRACK_TEST_EXPECTED_DATABASE_MAJOR_VERSION=17` set directly in the job environment; a `psql` step that prints the server version; `./mvnw -B -ntp test` (packaging is already covered by the H2 job); failure-only Surefire artifact (`backend-postgres-surefire-reports`, 7 days); `timeout-minutes: 15`. Existing SHA-pinned `actions/checkout`, `actions/setup-java` and `actions/upload-artifact` only; no new action.

### Configuration design finding (why Option A)
The initially proposed design — a separate `application-ci-postgres.yml` activated with `SPRING_PROFILES_INCLUDE` — **does not work** [L, §6]. `@ActiveProfiles("test")` pins the profile list, so `SPRING_PROFILES_ACTIVE` is ignored; an *included* profile is ordered **before** `test`, so `application-test.yml`'s H2 values override the PostgreSQL ones (observed: profiles `[ci-postgres, test]` yet `product=H2`; the multipart context then failed with a PostgreSQL URL and the H2 driver). Putting the PostgreSQL overrides in a later document of `application-test.yml` fixes the precedence. A second finding: `multipart-datasource-url: ${spring.datasource.url}` is a circular placeholder inside the multipart context, so the profile defines the URL independently (`${CI_POSTGRES_URL:…}`). Inline `@SpringBootTest(properties=…)` outranks both profiles and environment variables, which is why the multipart URL needed a placeholder at all.

## 3. PostgreSQL 17.11 confirmation [V]

From the `backend-postgres` job log (job [126512194389](https://github.com/alexc83/uptrack/actions/runs/41811675630/job/126512194389)):
- `psql … SELECT version();` → `PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit`.
- This is the same version as the owner-verified production Neon PostgreSQL 17.11. The `postgres:17` tag is a floating tag (not digest-pinned, by owner decision); it resolved to 17.11 for this run, and a future run may resolve to a newer 17.x minor.

## 4. Test results

| Run | Environment | Result |
|---|---|---|
| `backend` (CI) | H2 2.3.232, `./mvnw -B -ntp verify` | **167/167**, 0 failures, 0 errors, 0 skipped; JAR built and repackaged; `BUILD SUCCESS` (Maven 38.6 s) [V] |
| **`backend-postgres` (CI)** | **PostgreSQL 17.11**, `./mvnw -B -ntp test` | **167/167**, 0 failures, 0 errors, 0 skipped; `BUILD SUCCESS`; test step 42 s [V] |
| `frontend` (CI) | Node 22 | typecheck, lint, production build pass; Vitest **573 passed (573), 41 files passed (41)**, 26.5 s [V] |
| `e2e-chromium` (CI) | bundled Chromium, mocked `/api` | **146 passed** (2.7 min) [V] |
| Local H2 `verify` | container | 167/167 [L] |
| Local PostgreSQL **16.15** (not 17) | container, the CI environment with expected major 16 | 167/167 in 35 s [L] — harness validation only, **not** PostgreSQL 17 parity; PostgreSQL 17 parity rests only on the GitHub Actions run above |

167 = 165 pre-existing tests (including all 47 cross-user authorization cases and the 24 `SecurityRemediation` cases) + 2 new datasource assertions. In total the run executed 167 + 167 + 573 + 146 = 1053 test executions (the earlier 884 figure counted the backend once and had no PostgreSQL job).

Spec criterion 5 (a recommendation on keeping both backend jobs after ≥10 CI runs) is **not** satisfied yet: this report rests on a single run. Both jobs are kept.

## 5. JDBC datasource evidence [V]

Both assertions ran and passed in each backend job (log lines from the job output):

- `backend-postgres`, shared context and multipart context (two identical lines): `Test datasource: product=PostgreSQL version=17.11 (Debian 17.11-1.pgdg13+2) major=17 url=jdbc:postgresql://localhost:5432/uptrack_ci profiles=[ci-postgres, test]`.
- `backend` (H2), for comparison: `product=H2 version=2.3.232 … url=jdbc:h2:mem:uptrack-test profiles=[test]` and `… url=jdbc:h2:mem:multipart-http profiles=[test]`.

The PostgreSQL job requires product `PostgreSQL` and major version `17` through its own environment variables, independent of the profile, so a missing profile or a wrong server version fails the job. Negative controls run locally [L]: expectations set but profile absent → both checks fail (`expected: <PostgreSQL> but was: <H2>`); expected major 17 against the local 16 server → both fail (`expected: <17> but was: <16>`); server not running → context failures with connection refused (never a silent H2 fallback).

## 6. Profile activation and precedence (verified locally, [L])

| Setup | Shared context | Multipart context |
|---|---|---|
| Nothing set | H2, profiles `[test]` | H2 `multipart-http` |
| `SPRING_PROFILES_ACTIVE=ci-postgres` | ignored → H2, `[test]` | H2 |
| `SPRING_PROFILES_INCLUDE=ci-postgres` with a separate profile file | **H2** despite `[ci-postgres, test]` | context failure (PostgreSQL URL, H2 driver) |
| **Final**: `ci-postgres` as an `on-profile` document in `application-test.yml`, `SPRING_PROFILES_INCLUDE=ci-postgres` | PostgreSQL | PostgreSQL |
| Alternative considered: environment variables only, no profile | PostgreSQL | PostgreSQL (not chosen: configuration would live only in the workflow) |

## 7. GitHub Actions run [V]

[CI run #20 / 41811675630](https://github.com/alexc83/uptrack/actions/runs/41811675630), event `pull_request`, head `1acb3699c27d2a09fd78d184c51ef25135413399`, `success`, 3 min 32 s end to end (10:04:03–10:07:35 UTC).

| Job | Result | Runtime |
|---|---|---|
| `backend` | success | 50 s |
| `backend-postgres` | success | 60 s (container init 12 s, tests 42 s) |
| `frontend` | success | 57 s |
| `e2e-chromium` | success | 3 min 29 s |

The jobs run in parallel; the wall time is bounded by `e2e-chromium`. The artifact steps were skipped (no failure). This report was written after this run; the documentation-only commit that adds it triggers a further run whose result is recorded on PR #35, not here.

## 8. CodeQL, Vercel and security review

| Check (head `1acb369`) | Result |
|---|---|
| `CodeQL`, `Analyze (java-kotlin)`, `Analyze (javascript-typescript)`, `Analyze (actions)` | all **success** [V] (check runs on PR #35) |
| Vercel commit status `Vercel` | **success**, "Deployment has completed" [V] |
| `Vercel Preview Comments` check | **success** [V] |
| The Vercel deployment itself (preview contents) | **[U]** — only the status was read; the dashboard/preview was not opened |

Security and scope: [V] top-level `permissions: contents: read` with no job overrides; no `secrets.*`, no `pull_request_target`; the only credentials are the throwaway values local to the job's service container (not reachable outside the runner); every `uses:` pinned to the existing full commit SHAs; no production variable (`DB_*`, `AUTH_JWT_*`, `CLOUDINARY_*`) or service (Neon, Render, Vercel, Cloudinary) is referenced; actionlint 1.7.12 reported 0 errors locally [L] (shellcheck unavailable, so `run:` scripts were not linted). `POSTGRES_USER` is a superuser inside the disposable container (accepted; nothing persists).

**No production infrastructure was modified.** Neon was never contacted; no Render or Vercel configuration, branch protection, repository setting or deployment was changed; `application.yml` and all production code are untouched.

## 9. H2-versus-PostgreSQL compatibility findings

- **Application behaviour:** none. All 167 tests pass on H2 and on PostgreSQL 17.11 with no code or assertion changes; the code under test has no native SQL, uses UUID keys assigned in Java, `@Enumerated(STRING)`, `LocalDate`/`Instant`/`BigDecimal` columns and two JPQL `@Modifying` updates. The earlier PostgreSQL 16 experiment's single failure (`MultipartHttpIntegrationTest`) was the hard-coded H2 URL meeting the forced PostgreSQL driver — a test-configuration conflict, not an application defect.
- **Dialect warning:** 6 × `HHH90000025` ("PostgreSQLDialect does not need to be specified explicitly") on PostgreSQL. Harmless, but the explicit dialect must stay or the `H2Dialect` from the base document would apply.
- **Test-configuration differences:** the `test` profile uses H2 `MODE=MySQL`; the multipart test used H2 `MODE=PostgreSQL`. Neither emulation is PostgreSQL; the new job removes the reliance on emulation for the whole suite.
- **Shared database:** all test contexts share one PostgreSQL database with `ddl-auto: create-drop` per context. No lock or ordering problem appeared in this run [V]; repeated runs have not been observed.

## 10. Existing warnings and limitations

1. **The Neon production schema was not validated.** The CI job tests against a **Hibernate-generated disposable schema** (`ddl-auto: create-drop`). Production has evolved through `ddl-auto: update` and has no migration tooling, so this job proves the entities and queries work on PostgreSQL 17, not that the real Neon schema matches. That remains with [D01-W01](../follow-ups/d01-w01-schema-migrations.md).
2. **Single run.** Results come from one CI run (plus one local PostgreSQL 16 run). Flakiness on PostgreSQL has not been measured.
3. **Floating image tag** `postgres:17` (owner decision; Dependabot does not track service images). A new minor could change behaviour; the job prints the version and requires major 17.
4. Unchanged frontend build warnings (main chunk 679 kB, two `zod` Rollup annotation notices), as in the D01-B report.
5. **Commit signatures.** The three commits carry an SSH signature header made with this container's signing key (`commit.gpgsign` is true in the container's global git configuration). Whether GitHub displays them as Verified could not be read: the GitHub MCP tools return no verification field, the unauthenticated API request returned HTTP 403, and the pull-request commits page showed no badge text. Treat the status as **unknown**; check the PR's Commits tab. Because the key is not associated with the owner's GitHub account, the signatures may show as "Unverified". History is not altered.
6. Open items unchanged: [D01-W03](../follow-ups/d01-w03-logout-query-recreation-race.md) (logout query recreation race) is **unresolved**; [D01-W01](../follow-ups/d01-w01-schema-migrations.md) and [D01-W02](../follow-ups/d01-w02-live-stack-integration-ci.md) remain open; remote branch `test/d01-b-ci-failure-validation` still awaits manual deletion in GitHub.
7. D01-D, D01-E and any branch-protection change are **not** started; `backend-postgres` is not a required check yet (to be reviewed in D01-E).

## 11. Local container notes [L]

A disposable local PostgreSQL 16.15 database and role (`uptrack_ci`) were created for harness validation and dropped afterwards; the cluster was stopped. No pre-existing database was touched. actionlint 1.7.12 was downloaded to the scratchpad (checksum verified) and removed.
