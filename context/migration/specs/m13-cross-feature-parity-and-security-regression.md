# M13 — Cross-feature parity and security regression

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `chore/react-parity`  
**Dependency:** Previous milestone approved and merged

## Objective
Verify all routes, cross-feature refresh, error paths, permissions, keyboard/responsive behavior and critical workflows with Playwright. Resolve regressions within scope.

## Source references to inspect
- `context/migration/feature-inventory.md`
- `context/migration/verification`
- `frontend/src/app/app.routes.ts`

## In scope
Verify all routes, cross-feature refresh, error paths, permissions, keyboard/responsive behavior and critical workflows with Playwright. Resolve regressions within scope.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Signed-off parity matrix; screenshots; regression test evidence; defect list.

## Initial acceptance criteria
1. Every baseline scenario is pass or explicitly approved exception; no unresolved critical auth, data loss, or upload regressions.
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
`context/migration/verification/m13-report.md`
