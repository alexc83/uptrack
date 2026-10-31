# M09 — Credential CRUD

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-credentials`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild credential list, search, status/type filters, details drawer, create/edit/delete forms, validation and report links.

## Source references to inspect
- `frontend/src/app/features/credentials`
- `frontend/src/app/services/credential.service.ts`
- `backend/src/main/java/com/ccruce/backend/controller/CredentialController.java`

## In scope
Rebuild credential list, search, status/type filters, details drawer, create/edit/delete forms, validation and report links.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Credential page, reusable forms and query/mutation tests.

## Initial acceptance criteria
1. All CRUD paths and ownership errors handled; filters, date logic, invalid forms, cancel and refresh behavior verified.
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
`context/migration/verification/m09-report.md`
