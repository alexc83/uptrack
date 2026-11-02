# M06 — Authentication and route guards

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-auth`  
**Dependency:** Previous milestone approved and merged

## Objective
Recreate public/private navigation, login/register, session bootstrap, logout, unauthorized handling and profile identity. Preserve backend security model; review token storage risks without changing it silently.

## Source references to inspect
- `frontend/src/app/core/auth`
- `frontend/src/app/features/landing-page`
- `backend/src/main/java/com/ccruce/backend/controller/AuthController.java`

## In scope
Recreate public/private navigation, login/register, session bootstrap, logout, unauthorized handling and profile identity. Preserve backend security model; review token storage risks without changing it silently.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Login/register dialogs, auth provider, route guards and tests.

## Initial acceptance criteria
1. Login, register, logout, refresh, expired token, deep-link, unauthorized and no-flash behavior verified.
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
`context/migration/verification/m06-report.md`

## Mandatory compatibility gate recorded by M04 — 2026-11-01

Before implementing authentication forms, verify that the installed RHF resolver and Zod 4 return field errors for invalid input and parsed values for valid input, including async resolver use. M04 reproduced a failure: @hookform/resolvers 3.10.0 expects ZodError.errors while installed Zod 4.6.7 exposes issues; invalid input rejects with ZodError instead of returning field errors. See `verification/m04-report.md` for reproduction. A dependency update requires separate human approval; do not downgrade Zod, add an ad hoc resolver workaround, or assume compatibility from the M03 report. This is a prerequisite, not approval to start M06.
