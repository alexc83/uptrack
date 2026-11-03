# M14 — Cutover and documentation

**Status:** Implemented per owner brief of 2026-11-03 (spec was a DRAFT outline; the brief authorized the cutover scope below, including local commits on the feature branch, with no push/merge/deploy).  
**Branch:** `feature/react-cutover` (owner brief; the outline's `chore/react-cutover` name was superseded)  
**Dependency:** M13 merged on `main` (verified `main` = `origin/main` = `3351209`, ahead/behind 0/0, before branching)

## Objective
Document local setup, environment variables, run/build/test commands and deployment considerations; only remove Angular on explicit separate approval.

## Source references to inspect
- `README.MD`
- `frontend/README.md`
- `context/migration/verification`

## In scope
Document local setup, environment variables, run/build/test commands and deployment considerations; only remove Angular on explicit separate approval. Executed as: make `frontend-react/` the documented canonical frontend (root README, START-HERE, context docs, `frontend-react/.env.example`, `frontend-react/README.md`); confirm Dependabot/CI scope already targets React (`/.github/dependabot.yml` tracks `/frontend-react` and `/backend`; no GitHub Actions workflows exist); record cutover configuration notes (Vite proxy, CORS, SPA fallback, dev-only `/preview`); verification report `verification/m14-report.md`.

## Out of scope
- Unrelated UI or business-feature additions.
- Backend contract/database changes without separate authorization.
- Deleting or editing the Angular frontend (apart from a specifically authorized isolated fix). **Angular `frontend/` is therefore preserved untouched as a historical reference.**
- Deployment, DNS, hosted-backend changes, branch protection changes, push/merge.

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
