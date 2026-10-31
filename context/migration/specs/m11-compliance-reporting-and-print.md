# M11 — Compliance reporting and print

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-ce-report`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild per-credential CE report, progress summary, sortable/ordered details as implemented, printable multipage output and certificate indicators.

## Source references to inspect
- `frontend/src/app/features/ce-report`
- `backend/src/main/java/com/ccruce/backend/dto/response/CEReportResponseDto.java`

## In scope
Rebuild per-credential CE report, progress summary, sortable/ordered details as implemented, printable multipage output and certificate indicators.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Report route and print CSS/browser evidence.

## Initial acceptance criteria
1. Direct link and auth protection work; print and multipage readability verified; totals match API.
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
`context/migration/verification/m11-report.md`
