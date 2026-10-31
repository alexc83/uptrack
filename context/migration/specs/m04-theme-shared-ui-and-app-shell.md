# M04 — Theme, shared UI and app shell

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-app-shell`  
**Dependency:** Previous milestone approved and merged

## Objective
Create responsive navigation, layout, light/dark theme, basic buttons/modal/drawer/table conventions and accessible shared shell.

## Source references to inspect
- `frontend/src/app/layout`
- `context/screenshots/light-mode-dashboard-1.png`
- `context/screenshots/dark-mode-dashboard-1.png`
- `context/screenshots/dark-mode-drawer-example.png`

## In scope
Create responsive navigation, layout, light/dark theme, basic buttons/modal/drawer/table conventions and accessible shared shell.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Responsive application shell and shared primitive composition guidelines.

## Initial acceptance criteria
1. Responsive layout works at desktop and mobile; keyboard navigation and theme persistence checked; no business features yet.
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
`context/migration/verification/m04-report.md`
