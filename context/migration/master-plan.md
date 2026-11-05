> **Historical tracking record (PM01).** Retained as migration evidence; dated/current/pending claims below describe earlier checkpoints and may be superseded. Active work, decisions and handoffs now live in [GitHub Issues](https://github.com/alexc83/uptrack/issues) and [UpTrack Development](https://github.com/users/alexc83/projects/2). Do not append active progress here.

# UpTrack React Migration — Master Plan

Current: **D01 — Continuous Integration Foundation** ([spec](specs/d01-ci-foundation.md), READY): **D01-A, D01-B and D01-C are complete and merged; D01-D is complete and merged ([PR #37](https://github.com/alexc83/uptrack/pull/37), merge `db42d68`; post-merge CI run [41822488477](https://github.com/alexc83/uptrack/actions/runs/41822488477) passed — 193 backend on H2 and PostgreSQL 17.11, 596 frontend, 146 Chromium; coverage reporting added, no thresholds; [report](verification/d01-d-report.md))** (PR #26 `2588d05`; PR #27 `4795fda`; closeout PR #34 `1469f27`; PR #35 `e1ff2e8`, whose post-merge CI run [41813299826](https://github.com/alexc83/uptrack/actions/runs/41813299826) passed all four jobs — backend 167 on H2, backend-postgres 167 on PostgreSQL 17.11, frontend 573, Chromium 146; [report](verification/d01-c-report.md)). **D01-E: the Firefox/WebKit browser workflow is merged ([PR #39](https://github.com/alexc83/uptrack/pull/39), `325e839`; manual dispatch `all`, `firefox`, `webkit` passed) and branch protection is applied and verified — ruleset `26574227` (pull requests, 0 approvals, merge commits only, required `backend`, `backend-postgres`, `frontend`, `e2e-chromium`, no standing bypass, not strict); `Protect main` unchanged; disposable PR #40 blocked and closed, PR #41 merged as `5d121ae` ([report](verification/d01-e-report.md) §7.0). Outstanding: first genuine scheduled Browsers run (earliest 2026-11-05 05:17 UTC), failure-artifact path, rendered summaries, closeout PR merge; D01-W01–W04 open.** New follow-up: [D01-W04 Cloudinary certificate lifecycle](follow-ups/d01-w04-cloudinary-certificate-lifecycle.md). Current state: `migration-status.md` and `agent-handoff.md`. (Earlier "Current" text: "D01-A and D01-B are complete and merged ... D01-C through D01-E remain pending", and before that "D01-C implemented and verified on draft PR #35, pending merge"; both are superseded.) (Superseded earlier status: "D01-A authorized 2026-11-04, D01-B–E approved in principle only", verified on `main` = `7fabdbb`, where M01–M14, S01–S05H and P01 (public roadmap, PR #25) were already merged; see the tracker reconciliation note in `migration-status.md`.) Follow-ups outside D01: [D01-W01 schema migrations](follow-ups/d01-w01-schema-migrations.md), [D01-W02 live-stack CI](follow-ups/d01-w02-live-stack-integration-ci.md), [D01-W03 logout query recreation race](follow-ups/d01-w03-logout-query-recreation-race.md) (unresolved). The paragraphs below are historical.

(Historical) Current security insertion: **S05R** is implemented and locally verified on `fix/s05r-security-remediation` from `75d6eec` (merged S05 PR #15). The owner's implementation brief authorizes these backend/frontend security changes and draft-PR preparation. See [spec](specs/s05r-application-security-remediation.md) and [verification/rollout matrix](verification/s05r-security-remediation.md). No hosted deployment, main merge or Cloudinary privacy migration is authorized. The prior migration chronology below is retained.

Status: M01–M13 and S01/S02/S03 are merged on `main` (M13 CONDITIONALLY READY, Gate D passed — see `verification/m13-report.md`). **M14 cutover is in progress on `feature/react-cutover`**: React (`frontend-react/`) is the canonical frontend in all documentation, environment examples and Dependabot scope; the legacy Angular `frontend/` is preserved as a historical reference (deletion requires separate approval and is out of scope). Hosted backend remains suspended; no deployment or cutover to production authorized.

## Objective
Replace the existing Angular 21 + PrimeNG UI with a sibling React + TypeScript + Flowbite React + Tailwind CSS 4 frontend while preserving all user-visible behavior and existing Spring Boot APIs. This is an AI-agent refactoring experiment, not a portfolio rewrite.

## Verified repository context
- Angular routes: `/`, `/dashboard`, `/credentials`, `/ce-records`, `/settings`, `/credentials/:credentialId/ce-report`, plus `/app/*` redirects.
- Backend: Spring Boot 3.5.x / Java 21, JWT, JPA, Cloudinary integration.
- **Actual database config is PostgreSQL** (`backend/src/main/resources/application.yml` uses `org.postgresql.Driver`), although README and root AGENTS/CLAUDE files mention MySQL. Verify environment in M01; do not change database.
- `frontend/` remains intact, `backend/` remains intact. New `frontend-react/` created in M03.
- Existing `context/features/` and `context/screenshots/` remain historical source material.

## Principles
1. Same behavior, not necessarily same internal component hierarchy.
2. No backend API/DB/security modifications without separate human authorization. S01 authorization remediation and S02 dependency remediation are merged; any further backend change needs separate approval.
3. Never delete existing Angular implementation during migration.
4. One active milestone/branch at a time; explicitly approved commit/merge/delete.
5. Check measured behavior against Angular and backend, not merely screenshots or agent assertions.
6. Fail transparently: pass/fail/not-run for every verification; preserve failures.
7. Plan all steps now; complete detailed spec for the next step only after dependency review.

## Branch workflow

Canonical policy: [AGENTS.md — Git branch lifecycle](../../AGENTS.md#git-branch-lifecycle-canonical). Main is the stable integration branch until M14; integration does not authorize production cutover.

## Milestones
- **M01** Existing-app audit and baseline — `chore/react-audit` (human override: work done on `chore/react-migration-planning`); prerequisite: none. Verified 2026-10-31.
- **S01** Backend security remediation (inserted between M01 and M02; ID-preserving, no renumbering) — `fix/backend-authorization`; prerequisite: M01 merged. Spec `specs/s01-backend-security-remediation.md` (implemented, verified, merged to `main` and pushed 2026-10-31 (`39ceddf`, `6fd6f47`); not deployed; evidence in `verification/s01-report.md`).
- **M02** Architecture and parity contract — `chore/react-architecture`; prerequisite: S01 merged (so the contract describes the fixed API).
- **S02** Backend dependency remediation (inserted between M02 and M03; ID-preserving, no renumbering; M01–M14 and S01 unchanged) — branch `fix/backend-dependency-remediation`; prerequisite: M02 merged. Spec `specs/s02-backend-dependency-remediation.md` (READY; implemented, verified and merged: `cb74890`, `6e0ba0d`). Target is Scenario B+ of `dependency-security-assessment.md`, done in incremental groups with verification after each group and a final dependency-tree/advisory assessment; the projected advisory count is not a guaranteed result.
- **M03** React/Flowbite foundation — `feature/react-foundation`; prerequisite: S02 merged and verified (React work must run against the patched backend).
- **M04** Theme, shared UI and app shell — `feature/react-app-shell`; implemented, verified, merged and pushed (`9440d21`, `b47bd42`); feature branch retained.
- **M05** Typed HTTP and server-state foundation — `feature/react-api-layer`; prerequisite: prior milestone merged.
- **M06** Authentication and route guards — `feature/react-auth`; prerequisite: prior milestone merged.
- **M07** Public landing page — `feature/react-landing`; prerequisite: prior milestone merged.
- **M08** Dashboard — `feature/react-dashboard` (M08 only: human-approved exception, implemented on harness branch `claude/m08-dashboard-planning-u4ieuq`, reviewed on `m08-review`, merged to main); prerequisite: prior milestone merged.
- **M09** Credential CRUD — `feature/react-credential-crud` (owner-approved branch); prerequisite: prior milestone merged.
- **M10** CE records and certificate workflows — `feature/react-ce-records`; prerequisite: prior milestone merged.
- **M11** Compliance reporting and print — `feature/react-ce-report`; prerequisite: prior milestone merged.
- **M12** Settings and security UI — `feature/react-settings`; prerequisite: prior milestone merged.
- **M13** Cross-feature parity and security regression — `chore/react-parity`; prerequisite: prior milestone merged.
- **M14** Cutover and documentation — `feature/react-cutover` (owner brief of 2026-11-03 names this branch; spec outline said `chore/react-cutover`); prerequisite: Gate D (M13) passed. React is canonical; Angular `frontend/` retained as historical reference.

## Gates
- Gate A after M02: inventory and architecture approved, and S01 merged and verified (S01 must be merged before M02 is marked READY).
- S02 gate: S02 must be merged and verified before M03 begins, and the hosted backend must not be redeployed until S02 is verified and merged and the deployment is separately approved.
- Mandatory M06 form gate: verify RHF resolver/Zod 4 valid and invalid inputs before authentication form implementation. The installed resolver 3.10.0 rejects Zod 4 validation errors instead of returning field errors; any dependency update requires separate approval (M04 report).
- Gate B after M06: foundations, authentication and route behavior tested.
- Gate C after M12: all feature areas implemented.
- Gate D after M13: parity evidence accepted.
- M14 may cut over only after Gate D and with S01 and S02 verified; deletion of Angular is out of scope by default.

## Definition of done for each implementation milestone
- Current milestone spec has concrete source paths, scope and acceptance criteria.
- Change is limited to approved scope; no secrets or credentials committed.
- `npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build` when defined by M03; relevant backend tests if modified.
- Relevant browser flow and responsive check performed; document blocked/not-run honestly.
- `context/migration/verification/Mxx-report.md` documents evidence, differences, files and issues.
- Human approves commit, merge and branch deletion separately; log hash/status after actions.

## Specification approach
M01–M09 and S01/S02 are accepted; M09 live-write evidence is deferred by explicit owner decision, tracked in `follow-ups/m09-w01-postgresql-crud-acceptance.md`. M10–M14 remain DRAFT outlines. Before each milestone, AI performs read-only source inspection and expands that spec to READY with endpoint contracts, behavior matrix, tests and exact acceptance criteria. Human approves READY before code changes. Never rewrite acceptance criteria merely to match generated code; request a change decision.

## Source-of-truth precedence
Direct user request > `AGENTS.md` project workflow > approved active spec > `context/migration/architecture.md` > actual source code/config for observed behavior > README/legacy docs. When these disagree, document the discrepancy; do not guess.
