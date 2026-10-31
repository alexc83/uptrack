# M05 — Typed HTTP and server-state foundation

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-api-layer`  
**Dependency:** Previous milestone approved and merged

## Objective
Create centralized fetch client, response/error parsing, typed DTOs, query client, keys and API modules without fake production endpoints.

## Source references to inspect
- `frontend/src/app/core/api`
- `frontend/src/app/services`
- `frontend/src/app/models`
- `backend/src/main/java/com/ccruce/backend/dto`

## In scope
Create centralized fetch client, response/error parsing, typed DTOs, query client, keys and API modules without fake production endpoints.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
API layer and unit tests for error handling, headers, query params, cancellation and invalidation contracts.

## Initial acceptance criteria
1. Endpoint paths and response types are cross-checked with backend; mock network tests pass; no token logged.
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
`context/migration/verification/m05-report.md`
