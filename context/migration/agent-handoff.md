# Agent handoff (update at each session boundary)

- Last agent/tool: Claude Code (Sonnet 5.5), 2026-10-31
- Active milestone: S01 (implemented, verified, committed locally; awaiting push/merge approval). M02 not started.
- Current git branch: `fix/backend-authorization` (created from `main` at `19f3053`; `main` and `origin/main` both at `19f3053`). S01 is committed locally in two commits (backend code and tests; documentation) — see `git log`. NOT pushed, merged or deployed.
- Spec status: M01 merged; S01 implemented (design approved 2026-10-31); M02 DRAFT
- Last verification result: backend `mvnw test` 90/90 (47 new cross-user tests + 4 filter unit tests), package OK; frontend 38/38 tests + build OK; runtime API 83 PASS/6 FAIL (out of scope)/3 INFO; browser 126 PASS/9 FAIL (frontend findings, out of scope)/1 NOT RUN; 0 regressions vs M01 (`verification/s01-report.md`)
- Blockers: none; successful certificate upload still NOT RUN
- Next approved action: none (stop and report)
- Servers: backend and Angular dev server stopped; DB `uptrack_migration_test` and role `uptrack_m01` RETAINED (hold synthetic data); Playwright/scripts live in the scratchpad outside the repo
- Required human approval: push and merge of S01, any deployment of the backend, teardown of the test DB/role, M02 start
- Approved 2026-10-31: roadmap Option A (S01 between M01 and M02, no renumbering) and S01 design decisions 1–7 (see `specs/s01-backend-security-remediation.md`); implementation plan approved with extra requirements (narrow JWT exception catch, ownership from the authenticated user, broader two-user matrix, generic 404/405 for removed endpoints, no response-shape changes)
- HOSTED BACKEND: suspended by the owner; only the Angular frontend remains deployed. Keep it suspended. The S01 fix is NOT deployed; do not contact, probe, redeploy or restart the hosted backend without separate explicit authorization.
- Evidence: 25 curated screenshots committed; the full 77-file capture is local-only in git-excluded `baseline/screenshots-local/`
- Key facts: do not add AI agent attribution to commit messages (human rule); backend needs `JAVA_HOME` JDK 21 (default JDK is 27); no lint/e2e scripts exist; do not modify `frontend/` or `backend/`

Use this same file for all four AI agents. Do not store private tokens or model secrets here.
