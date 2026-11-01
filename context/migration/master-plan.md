# UpTrack React Migration — Master Plan

Status: PLANNED. M01 audit and baseline completed 2026-10-31 (documentation only); no application files have been migrated. S01 (backend security remediation) inserted before M02. **Flagged risk (updated):** the externally hosted backend referenced by `frontend/src/environments/environment.production.ts` has been suspended by the owner (only the Angular frontend remains deployed); keep it suspended until a fixed backend (S01) is approved for deployment. It was never contacted or tested.

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
2. No backend API/DB/security modifications without separate human authorization. S01 is the one planned backend change (security remediation); its design is approved but its implementation still requires a separate go-ahead.
3. Never delete existing Angular implementation during migration.
4. One active milestone/branch at a time; explicitly approved commit/merge/delete.
5. Check measured behavior against Angular and backend, not merely screenshots or agent assertions.
6. Fail transparently: pass/fail/not-run for every verification; preserve failures.
7. Plan all steps now; complete detailed spec for the next step only after dependency review.

## Milestones
- **M01** Existing-app audit and baseline — `chore/react-audit` (human override: work done on `chore/react-migration-planning`); prerequisite: none. Verified 2026-10-31.
- **S01** Backend security remediation (inserted between M01 and M02; ID-preserving, no renumbering) — `fix/backend-authorization`; prerequisite: M01 merged. Spec `specs/s01-backend-security-remediation.md` (implemented, verified and committed locally on `fix/backend-authorization` 2026-10-31; not pushed/merged/deployed; evidence in `verification/s01-report.md`).
- **M02** Architecture and parity contract — `chore/react-architecture`; prerequisite: S01 merged (so the contract describes the fixed API).
- **M03** React/Flowbite foundation — `feature/react-foundation`; prerequisite: prior milestone merged.
- **M04** Theme, shared UI and app shell — `feature/react-app-shell`; prerequisite: prior milestone merged.
- **M05** Typed HTTP and server-state foundation — `feature/react-api-layer`; prerequisite: prior milestone merged.
- **M06** Authentication and route guards — `feature/react-auth`; prerequisite: prior milestone merged.
- **M07** Public landing page — `feature/react-landing`; prerequisite: prior milestone merged.
- **M08** Dashboard — `feature/react-dashboard`; prerequisite: prior milestone merged.
- **M09** Credential CRUD — `feature/react-credentials`; prerequisite: prior milestone merged.
- **M10** CE records and certificate workflows — `feature/react-ce-records`; prerequisite: prior milestone merged.
- **M11** Compliance reporting and print — `feature/react-ce-report`; prerequisite: prior milestone merged.
- **M12** Settings and security UI — `feature/react-settings`; prerequisite: prior milestone merged.
- **M13** Cross-feature parity and security regression — `chore/react-parity`; prerequisite: prior milestone merged.
- **M14** Cutover and documentation — `chore/react-cutover`; prerequisite: prior milestone merged.

## Gates
- Gate A after M02: inventory and architecture approved, and S01 merged and verified (S01 must be merged before M02 is marked READY).
- Gate B after M06: foundations, authentication and route behavior tested.
- Gate C after M12: all feature areas implemented.
- Gate D after M13: parity evidence accepted.
- M14 may cut over only after Gate D and with S01 verified; deletion of Angular is out of scope by default.

## Definition of done for each implementation milestone
- Current milestone spec has concrete source paths, scope and acceptance criteria.
- Change is limited to approved scope; no secrets or credentials committed.
- `npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build` when defined by M03; relevant backend tests if modified.
- Relevant browser flow and responsive check performed; document blocked/not-run honestly.
- `context/migration/verification/Mxx-report.md` documents evidence, differences, files and issues.
- Human approves commit, merge and branch deletion separately; log hash/status after actions.

## Specification approach
All 14 specs exist as **DRAFT OUTLINES**. Before each milestone, AI performs read-only source inspection and expands that spec to READY with endpoint contracts, behavior matrix, tests and exact acceptance criteria. Human approves READY before code changes. Never rewrite acceptance criteria merely to match generated code; request a change decision.

## Source-of-truth precedence
Direct user request > `AGENTS.md` project workflow > approved active spec > `context/migration/architecture.md` > actual source code/config for observed behavior > README/legacy docs. When these disagree, document the discrepancy; do not guess.
