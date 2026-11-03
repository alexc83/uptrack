# M10 — CE records and certificate workflows

**Status:** IMPLEMENTED on `feature/react-ce-records` per the owner brief of 2026-11-03 ("Begin M10 implementation now"); pending owner acceptance. Evidence: `../verification/m10-report.md`.  
**Branch:** `feature/react-ce-records`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild CE list/table/mobile cards, filters, pagination, forms, credential associations, upload/replace/remove/view certificate behavior.

## Source references to inspect
- `frontend/src/app/features/ce-records`
- `frontend/src/app/services/ce-record.service.ts`
- `frontend/src/app/services/upload.service.ts`
- `backend/src/main/java/com/ccruce/backend/controller/UploadController.java`

## In scope
Rebuild CE list/table/mobile cards, filters, pagination, forms, credential associations, upload/replace/remove/view certificate behavior.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
CE page and tested upload/mutation flows.

## Initial acceptance criteria
1. CRUD, pagination, linked credential, upload failure, file type/size handling, replace/delete and mobile layout verified.
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
`context/migration/verification/m10-report.md`
