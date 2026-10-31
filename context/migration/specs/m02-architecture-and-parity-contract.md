# M02 — Architecture and parity contract

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `chore/react-architecture`  
**Dependency:** Previous milestone approved and merged

## Objective
Choose React folder layout, auth boundary, API proxy strategy, routing, data ownership, accessibility, theme tokens, testing and parity policy based on M01.

## Source references to inspect
- `context/migration/feature-inventory.md`
- `context/migration/architecture.md`
- `frontend/src/app/models`

## In scope
Choose React folder layout, auth boundary, API proxy strategy, routing, data ownership, accessibility, theme tokens, testing and parity policy based on M01.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Architecture decision record; route matrix; component and state ownership map; scoped dependency list.

## Initial acceptance criteria
1. No speculative backend refactor; known behaviors are mapped to React routes and state patterns; decisions are documented.
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
`context/migration/verification/m02-report.md`
