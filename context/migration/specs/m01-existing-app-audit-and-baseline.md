# M01 — Existing-app audit and baseline

**Status:** READY (approved by human 2026-10-31 with conditions below). API-level and browser runtime baselines executed; successful certificate upload NOT RUN.
**Branch:** `chore/react-migration-planning` (human override: do not create `chore/react-audit`).
**Dependency:** none. **Revision:** 2 (2026-10-31).

## Goal and non-goals
Produce an evidence-backed baseline of the Angular 21 + Spring Boot app so M02–M14 have an accurate parity contract. Non-goals: fixing defects, adding tests, creating `frontend-react/`, changing contracts, upgrading dependencies, any M02 work.

## Approved conditions (from human)
1. Stay on the current branch; create no branch. 2. May run `npm ci`, download Maven dependencies, run builds/tests; no dependency upgrades or application-code changes. 3. Runtime only against disposable PostgreSQL DB `uptrack_migration_test`; exact commands/config must be approved first. 4. Synthetic users/records only, after approval. 5. No production Cloudinary credentials; upload workflows marked untested if no safe environment. 6. Record security/error-handling defects; do not fix; flag for separate remediation. 7. No AI agent attribution in commit messages. 8. Browser automation + screenshots allowed with synthetic data. 9. Review original feature specs and independently verify high-impact findings. No commit/push/merge/branch deletion without explicit approval.

## Existing implementation inspected
Frontend: `app.routes.ts`, `app.config.ts`, `core/{api,auth}`, `services/*`, `layout/shell.*`, all `features/*` (landing, dashboard, credentials, ce-records, drawers, settings, ce-report), `package.json`, `angular.json`, `environments/*`, `proxy.conf.json`, 13 spec files. Backend: `pom.xml`, `application.yml`, `application-test.yml`, all controllers, DTOs, entities, `SecurityConfig`, `JwtAuthenticationFilter`, `GlobalExceptionHandler`, service implementations, 7 test classes. Legacy: `context/features/*.md` (all), `project-overview.md`, `coding-standards.md`, `current-feature.md`, README.MD, seed SQL. Findings in `baseline/`.

## Deliverables
`baseline/{environment,routes,api-matrix,defects,doc-discrepancies,runtime-verification-plan}.md`; expanded `feature-inventory.md`; `verification/m01-report.md`; updated `migration-status.md` and `agent-handoff.md`; runtime evidence: `baseline/runtime-results-api.md`, `baseline/runtime-results-ui.md`, and a curated set of 25 screenshots in `baseline/screenshots/` (full local capture set not committed).

## Acceptance criteria (Given/When/Then) and current status
| ID | Criterion | Status |
|---|---|---|
| AC1 | Given `app.routes.ts`, when inventory is complete, then every route, guard, redirect, query param and fallback is listed with source reference, and the `/app/*` set is exact | **DONE (SOURCE)** `routes.md` |
| AC2 | Given the controllers, then each endpoint has method, path, auth, DTOs with validation, success/error statuses, marked SOURCE vs exercised | **DONE (SOURCE)**; "exercised" column pending runtime `api-matrix.md` |
| AC3 | Given each Angular service, then every HTTP call maps to an endpoint; unused/mismatched flagged | **DONE (SOURCE)** `api-matrix.md` |
| AC4 | Given the build/test commands, each is run or marked NOT RUN with reason, with exit code and counts | **DONE** frontend build/test, backend test/package RAN; lint/e2e do not exist |
| AC5 | Given a running stack and synthetic users, auth, credential, CE, dashboard, report, settings flows are exercised and recorded PASS/FAIL/NOT RUN | **DONE**: API 55 PASS/18 FAIL/4 INFO (`runtime-results-api.md`); browser 125 PASS/10 FAIL/1 NOT RUN/4 INFO (`runtime-results-ui.md`) |
| AC6 | Given the app, loading/empty/error/success states, light/dark, 375/768/1280 px, keyboard/dialog dismissal are checked | **DONE** (Edge headless; empty/error/success states, themes, 3 widths, keyboard spot checks; loading skeleton not specifically asserted; screenshots captured, visual fidelity not judged) |
| AC7 | Each risk in `defects.md` is reproduced or marked not reproduced/not tested | **DONE**: S1–S4, S6, S7, B1, B3, F1, F6, F7, F8 confirmed at runtime; new F11–F15 added; items not reproduced are marked (e.g. `DELETE /users/{id}` cross-user NOT RUN) |
| AC8 | Upload flows: failure path exercised if possible; success path NOT RUN unless safe credentials exist | **PARTIAL (as agreed)**: API and UI failure/validation paths RAN; success, replace and remove-after-upload NOT RUN |
| AC9 | `git diff --stat` shows changes only under `context/migration/`; `frontend/`, `backend/`, DB unchanged | **DONE** at time of writing (verify again before commit) |
| AC10 | No secrets, tokens, real PHI or seed passwords in any file | **DONE** (no values recorded) |
| AC11 | Every doc/source discrepancy recorded in `doc-discrepancies.md`, none silently resolved | **DONE** |
| AC12 | Report distinguishes source findings, test-verified behavior, and runtime-verified behavior | **DONE** (evidence-level labels) |

## Commands to verify (executed so far)
`npm ci`, `npm run build`, `npm test -- --watch=false` in `frontend/`; `JAVA_HOME=<jdk21> ./mvnw -B test` and `./mvnw -B -q package -DskipTests` in `backend/`. Results in `baseline/environment.md`.

## Completion report
`context/migration/verification/m01-report.md`
