# S02 — Backend dependency remediation

**Status:** DRAFT — creation and roadmap placement approved by the human on 2026-10-31. **Implementation is NOT authorized.** Before coding, this spec must be refreshed (see "Before marking READY") and approved as READY, and `backend/pom.xml` may only be edited after that approval.
**Proposed branch:** `fix/backend-dependency-remediation` (created only after approval)
**Dependency:** S01 merged (done) and M02 merged. **Position:** after M02, before M03. **Revision:** 1 (2026-10-31)
**Owner/agent:** to be assigned.

## Gates (hard)
1. **S02 must be merged and verified before M03 begins** (the React scaffold and every later milestone run against the patched backend).
2. **The hosted backend must not be redeployed (or restarted) until S02 is verified and merged and the human separately approves the deployment.** The hosted backend is currently suspended; keep it suspended throughout S02. S02 does not authorize contacting, probing or deploying it.

## Goal and non-goals
Goal: reduce the known-vulnerable surface of the backend's production classpath by upgrading dependencies in small, individually verified groups, then re-measure. The target is **Scenario B+** from `dependency-security-assessment.md` (a projection of 66 → 2 advisories). **The projection is a hypothesis, not a guaranteed result**: acceptance depends on what is measured at the end (AC8), not on matching the projected numbers.

Non-goals: Spring Boot 4 / Spring Framework 7 (the only fix for the two Spring MVC critical advisories GHSA-j9f9-w8pj-32f8 and GHSA-pc63-qcmh-9cmg; they are unreachable in this app and deferred); any application source change; Angular or React dependency changes (separate decisions); the `jjwt` 0.12.7 → 0.13.0 bump (no advisories; optional, only if the human adds it); test-scope libraries (H2, test starters) unless they block the build; deployment; database/schema changes.

## Existing implementation inspected
- `backend/pom.xml`: parent `spring-boot-starter-parent` 3.5.12; `<properties>` contains only `java.version` 21; starters (data-jpa, security, validation, web), `cloudinary-http5` 2.3.0 (literal version), `postgresql` (version from the BOM), `jjwt-*` 0.12.7, devtools (runtime, optional), H2 and the test starter (test scope); `spring-boot-maven-plugin`.
- Baseline classpath: the 72 libraries packaged in the S01 jar and the advisory data in `dependency-security-assessment.md` (as of 2026-10-31; advisory data and versions drift).
- Tests: 90 backend tests (S01) and the M01/S01 runtime suites (API runner and Playwright browser stages, kept outside the repo in the scratchpad).

## Baseline to capture before any change (Group 0)
Record: `./mvnw -B test` (expected 90 passing), `./mvnw -B -q package -DskipTests`, the packaged library list (`BOOT-INF/lib`), and an OSV/GHSA advisory query for every library at its exact version (plus CISA KEV and EPSS lookups for critical/high). Store the results in `verification/s02-report.md` (and, if the human approves, the query script under `context/migration/`; otherwise keep scripts outside the repo as in M01/S01).

## Upgrade groups (incremental; verify after each; each group individually revertable)
| Group | Change (all in `backend/pom.xml`) | Intended effect (projection) | Compatibility watch items |
|---|---|---|---|
| 1 | Parent `spring-boot-starter-parent` 3.5.12 → 3.5.16 | Brings Spring Framework 6.2.19, Spring Security 6.5.11, Spring Data 2025.0.13, Hibernate 6.6.53, Tomcat 10.1.55, Jackson 2.21.4, PostgreSQL driver 42.7.11, Logback 1.5.34 | Jackson 2.19 → 2.21 (minor bump supported by that Boot version); Hibernate patch jump; security filter chain behavior (the S01 matrix covers it) |
| 2a | Property `tomcat.version` → latest 10.1.x (10.1.61 at assessment time) | Fixes the Tomcat critical/high advisories left after Group 1 (the 3.5.16 BOM manages 10.1.55) | Multipart/upload size behavior (M01 R6.5 baseline: 1.2 MB upload returns 500; any change must be recorded, not silently accepted) |
| 2b | Property `jackson-bom.version` → latest 2.21.x (2.21.8 at assessment time) | Fixes remaining Jackson DoS/high advisories | JSON serialization of dates, `BigDecimal`, nulls; error-body shapes; every S01/M01 response-shape assertion |
| 2c | Property `postgresql.version` → latest 42.7.x (42.7.14 at assessment time) | Fixes the two high driver advisories | Connection/authentication behavior on real PostgreSQL (runtime check, not H2) |
| 3 | `cloudinary-http5` 2.3.0 → 2.6.0 and properties `httpclient5.version` (5.6.4), `httpcore5.version` (5.4.3), `commons-lang3.version` (3.18.0), `log4j2.version` (2.25.5) | Fixes `httpcore5`/`httpcore5-h2` highs and the `httpclient5`/`commons-lang3`/`log4j-api` moderates | Cloudinary API signature changes used by `CertificateUploadServiceImpl` (upload, destroy); `httpcore5` 5.3 → 5.4 and `httpclient5` 5.5 → 5.6 minor bumps; the upload failure path (placeholder credentials) |
Version numbers above are those current on 2026-10-31 and **must be re-checked** at implementation time.

### Per-group verification (required after every group, before starting the next)
1. `./mvnw -B test` on JDK 21: all tests pass, or every difference is listed and approved (no test is deleted, skipped or weakened to make a group pass).
2. `./mvnw -B -q package -DskipTests` succeeds.
3. Packaged library list diff against the Group 0 baseline (which libraries and versions actually changed; confirm each property override took effect and no unexpected library moved).
4. OSV/GHSA re-query of the resulting library list: advisory counts by severity before/after for that group.
5. Record the result (PASS/FAIL/NOT RUN with evidence) in `verification/s02-report.md`.
Proposed commit granularity: one commit per group after human approval (or squashed on request), each with the group's evidence.

### Runtime verification (after Group 3, and earlier if a group fails or changes behavior)
With separate approval to start local servers against the isolated DB `uptrack_migration_test` using only role `uptrack_m01` and synthetic data (no hosted backend): re-run the S01 API runner and the same ten Playwright stages; compare by scenario ID with the S01 results (`verification/s01-runtime-results.md`). Upload success remains NOT RUN unless non-production Cloudinary credentials are supplied.

## Final dependency-tree and advisory assessment (required, after the last group)
1. Dependency tree of the production classpath (`./mvnw dependency:tree` limited to runtime/compile scope; this downloads the Maven dependency plugin into the local repository, not into the project) and the final packaged library list.
2. Fresh advisory query for every library at its resulting version (OSV/GHSA), CISA KEV and EPSS for critical/high, run on the day of the assessment.
3. A table of every remaining advisory with severity, whether a fix exists in the same Boot line, reachability in this code base (verified by source/config review, as in the assessment), and a disposition: fixed, unreachable (evidence), unfixable on this line (reason), or accepted (human approves).
4. A comparison with the Scenario B+ projection, reported honestly, including any difference and its cause.
Output: updated `dependency-security-assessment.md` section (or an S02 addendum) and `verification/s02-report.md`.

## Stop rules and escalation
- A group that fails after 2–3 grounded fixes: stop, revert that group, report. No random retries.
- Application source changes are out of scope. If a compatibility problem requires a source change, stop and ask; do not edit source under this milestone without separate approval.
- Never weaken tests or accept unexplained behavior changes. Every API or response-shape difference is recorded as a deviation and needs approval.
- Do not run `npm audit fix` or touch `frontend/`.

## Acceptance criteria (Given / When / Then)
1. Given Group 0, when complete, then the baseline test count, jar library list and advisory counts are recorded before any edit.
2. Given each upgrade group, when applied, then the group's tests, package build, library diff and advisory re-query are recorded before the next group starts, and a failing group is reverted or escalated (not carried forward).
3. Given the final `pom.xml` diff, then it changes only dependency/parent/property declarations required by the groups (no application source, no frontend, no lockfile, no schema).
4. Given `./mvnw -B test` on the final state, then every pre-existing test passes (90 at the S01 baseline) or each difference is listed and approved.
5. Given the packaged jar, then the library list shows each intended property override in effect and lists every library whose version changed.
6. Given the runtime suites on the isolated DB, then there are 0 regressions against the S01 results (API 83 PASS / 6 out-of-scope FAIL / 3 INFO; browser 126 PASS / 9 out-of-scope FAIL / 1 NOT RUN / 4 INFO), or each difference is explained and approved.
7. Given the upload endpoints, then validation and failure paths behave as in S01 (R6.1, R6.2, R6.4, R6.6, R6.8) and any change to R6.3/R6.5/R6.9 behavior is recorded; success path remains NOT RUN without safe credentials.
8. Given the final advisory assessment, then **the measured** counts are reported by severity, and every remaining critical or high advisory has a documented disposition (fixed / unreachable with evidence / unfixable on this line / accepted by the human). The projected 2 remaining advisories is compared against, not assumed.
9. Given the finished milestone, then `verification/s02-report.md` distinguishes PASS, FAIL and NOT RUN, lists known limitations, and records that the hosted backend was not contacted or redeployed.
10. Given the gates, then S02 is merged before M03 starts and no hosted backend deployment happened or is implied by S02.
11. Given all committed files, then no secrets, tokens or passwords appear and no commit carries AI attribution.

## Before marking READY (after M02 merges)
- Re-run the advisory query for the current and the target versions (the data drifts; new advisories may change the target versions or the severity picture).
- Re-check the latest Spring Boot 3.5.x on Maven Central and the Spring Boot 3.5 line's support status (not verified in the assessment).
- Review the Cloudinary 2.6.0 changes against `CertificateUploadServiceImpl` (upload and destroy usage) and the `httpclient5` 5.6 / `httpcore5` 5.4 release notes.
- Decide whether to include the `jjwt` 0.13.0 bump (not recommended without an advisory).
- Confirm with the human how commits are grouped, and obtain approval to edit `backend/pom.xml` and to start local servers for runtime verification.

## Scope limits / risk / rollback
- Risk: Jackson 2.19 → 2.21 and Hibernate 6.6.44 → 6.6.53 behavior differences; mitigated by the 90 tests and the runtime suites; the least-tested area is real PostgreSQL behavior and real Cloudinary calls.
- Risk: BOM property overrides leave the classpath internally inconsistent (for example `httpcore5` ahead of what the Boot BOM tested); mitigated by the library diff and runtime checks, and by reverting a group.
- Risk: advisory data changes between assessment and implementation; mitigated by re-querying (Group 0 and the final assessment).
- Rollback: each group is a small `pom.xml` change; revert the group commit/branch. No schema or data migration.

## Implementation notes and approved deviations
None yet.

## Completion report
`context/migration/verification/s02-report.md`
