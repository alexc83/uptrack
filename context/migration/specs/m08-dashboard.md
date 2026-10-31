# M08 — Dashboard

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-dashboard`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild live dashboard metrics, credential expirations, CE attention, recent activity and drawers with loading/empty/error states.

## Source references to inspect
- `frontend/src/app/features/dashboard`
- `frontend/src/app/services/dashboard.service.ts`
- `backend/src/main/java/com/ccruce/backend/controller/DashboardController.java`

## In scope
Rebuild live dashboard metrics, credential expirations, CE attention, recent activity and drawers with loading/empty/error states.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Live dashboard page and tested query/use cases.

## Initial acceptance criteria
1. Values reflect API, navigation works, drawers correct, loading/empty/error states tested at two viewport sizes.
2. All relevant tests are executed or explicitly marked NOT RUN with reasons.
3. Browser or runtime evidence is recorded where relevant.
4. Completion report and status tracker are updated before commit approval.

## Before marking READY
- Read every relevant source file and discover related dependencies and tests.
- Record exact routes, payloads, response/error codes, state transitions and visual variants.
- Expand criteria into testable Given/When/Then statements, including failures, empty and responsive states.
- List commands to verify and dependencies to install; do not invent results.
- Ask for approval of the finished spec before implementation.

## Completion report
`context/migration/verification/m08-report.md`
