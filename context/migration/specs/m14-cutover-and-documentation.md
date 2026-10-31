# M14 — Cutover and documentation

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `chore/react-cutover`  
**Dependency:** Previous milestone approved and merged

## Objective
Document local setup, environment variables, run/build/test commands and deployment considerations; only remove Angular on explicit separate approval.

## Source references to inspect
- `README.MD`
- `frontend/README.md`
- `context/migration/verification`

## In scope
Document local setup, environment variables, run/build/test commands and deployment considerations; only remove Angular on explicit separate approval.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Updated docs and validated React startup/cutover plan.

## Initial acceptance criteria
1. React operates independently and docs are accurate; Angular remains unless user expressly authorizes deletion.
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
`context/migration/verification/m14-report.md`
