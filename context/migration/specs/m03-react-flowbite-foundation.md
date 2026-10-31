# M03 — React/Flowbite foundation

**Status:** DRAFT OUTLINE — not approved for coding.  
**Branch:** `feature/react-foundation`  
**Dependency:** Previous milestone approved and merged

## Objective
Create sibling frontend-react with strict TS, Vite, React, Flowbite React, Tailwind v4, lint/build/test scripts and minimal smoke tests.

## Source references to inspect
- `frontend/package.json`
- `frontend/src/main.ts`
- `frontend/src/styles.scss`

## In scope
Create sibling frontend-react with strict TS, Vite, React, Flowbite React, Tailwind v4, lint/build/test scripts and minimal smoke tests.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix).

## Deliverable
Buildable frontend-react folder, pinned dependencies, npm lockfile, README and green smoke tests.

## Initial acceptance criteria
1. Clean install, typecheck, lint, test and production build pass; Angular files untouched.
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
`context/migration/verification/m03-report.md`
