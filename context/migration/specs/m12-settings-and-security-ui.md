# M12 — Settings and security UI

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-settings`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild profile editing, validation, email conflicts, password change form and error feedback.

## Source references to inspect
- `frontend/src/app/features/settings`
- `frontend/src/app/services/user-profile.service.ts`
- `backend/src/main/java/com/ccruce/backend/controller/UserController.java`

## In scope
Rebuild profile editing, validation, email conflicts, password change form and error feedback.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Authenticated settings page with tests.

## Initial acceptance criteria
1. Profile save and password update flows verified, including wrong current password, session state and invalid input.
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
`context/migration/verification/m12-report.md`
