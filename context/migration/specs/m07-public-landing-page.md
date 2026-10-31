# M07 — Public landing page

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-landing`  
**Dependency:** Previous milestone approved and merged

## Objective
Rebuild marketing landing sections, theme toggle, screenshot previews, responsive layout and entry to sign-in/sign-up.

## Source references to inspect
- `frontend/src/app/features/landing-page`
- `context/screenshots/landing-page-1.png`
- `context/screenshots/landing-page-2.png`
- `context/screenshots/login-modal.png`

## In scope
Rebuild marketing landing sections, theme toggle, screenshot previews, responsive layout and entry to sign-in/sign-up.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Public responsive landing route.

## Initial acceptance criteria
1. Public navigation and responsive behavior match reference; auth flows reuse M06; no hard-coded demo secrets.
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
`context/migration/verification/m07-report.md`
