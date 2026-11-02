# UpTrack React Migration — Master Plan

Status: M01, S01, M02, S02, M03, M04, M05, M06 and M07 are merged and pushed (`8e9df82`, `efc5011`; main and origin/main at `efc5011072d21fd9a025aa295274a7b12414fb11`). Verification and limitations are recorded in `verification/m07-report.md`. M08 is implemented and awaiting review on the approved one-time branch exception `claude/m08-dashboard-planning-u4ieuq` (uncommitted; see `verification/m08-report.md`). The externally hosted backend remains suspended and must not be contacted or deployed without separate authorization.

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
- **M08** Dashboard — `feature/react-dashboard` (M08 only: human-approved exception, implemented on harness branch `claude/m08-dashboard-planning-u4ieuq`); prerequisite: prior milestone merged.
- **M09** Credential CRUD — `feature/react-credentials`; prerequisite: prior milestone merged.
- **M10** CE records and certificate workflows — `feature/react-ce-records`; prerequisite: prior milestone merged.
- **M11** Compliance reporting and print — `feature/react-ce-report`; prerequisite: prior milestone merged.
- **M12** Settings and security UI — `feature/react-settings`; prerequisite: prior milestone merged.
- **M13** Cross-feature parity and security regression — `chore/react-parity`; prerequisite: prior milestone merged.
- **M14** Cutover and documentation — `chore/react-cutover`; prerequisite: prior milestone merged.

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
M01–M07 and S01/S02 are completed and merged. M08–M14 remain DRAFT outlines. Before each milestone, AI performs read-only source inspection and expands that spec to READY with endpoint contracts, behavior matrix, tests and exact acceptance criteria. Human approves READY before code changes. Never rewrite acceptance criteria merely to match generated code; request a change decision.

## Source-of-truth precedence
Direct user request > `AGENTS.md` project workflow > approved active spec > `context/migration/architecture.md` > actual source code/config for observed behavior > README/legacy docs. When these disagree, document the discrepancy; do not guess.
