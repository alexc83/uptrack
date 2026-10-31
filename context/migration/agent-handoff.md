# Agent handoff (update at each session boundary)

- Last agent/tool: Claude Code (Sonnet 5.5), 2026-10-31
- Active milestone: none in progress. M01 verified (awaiting merge approval); next is S01 (needs go-ahead to implement), then M02
- Current git branch: `chore/react-migration-planning` (base `9769237`; the M01 documentation commit sits on top of it — see `git log`; not pushed, not merged)
- Spec status: M01 READY/verified; S01 DRAFT with design decisions approved; M02 DRAFT
- Last verification result: FE build/38 tests, BE 39 tests, package exit 0; API runtime 55 PASS/18 FAIL/4 INFO; browser (Playwright+Edge) 125 PASS/10 FAIL/1 NOT RUN/4 INFO (`baseline/runtime-results-{api,ui}.md`)
- Blockers: none for M01 review; successful certificate upload NOT RUN (no safe credentials)
- Next approved action: none (stop after M01 documentation commit and report)
- Servers: backend and Angular dev server stopped; DB `uptrack_migration_test` and role `uptrack_m01` RETAINED (teardown only with separate approval); Playwright lives in the scratchpad outside the repo
- Required human approval: merge of M01 work; push; S01 implementation go-ahead (and branch creation); teardown of DB `uptrack_migration_test` / role `uptrack_m01` when no longer needed; any contact with the hosted backend; M02 start
- Approved 2026-10-31: roadmap Option A — S01 inserted between M01 and M02 with no renumbering; S01 design decisions 1–7 in `specs/s01-backend-security-remediation.md` (remove `/users` collection and `/users/{id}`, 404 for cross-user access, credential and CE listings scoped to caller, 404 for CE record on another user's credential, generic consistent 401 and public endpoints unaffected by stale tokens, update insecure-behavior tests, add two-user regression tests). **These are decisions, not authorization to implement.**
- **URGENT FLAG:** the production API base in `environment.production.ts` points at an externally hosted backend that may run the vulnerable code (S1–S3). Not contacted or tested in M01. Do NOT probe, deploy to, or modify it without separate explicit human authorization.
- Evidence: 25 curated screenshots committed; the full 77-file capture is local-only in git-excluded `baseline/screenshots-local/`
- Key facts: do not add AI agent attribution to commit messages (human rule); backend needs `JAVA_HOME` JDK 21 (default JDK is 27); no lint/e2e scripts exist; do not modify `frontend/` or `backend/`

Use this same file for all four AI agents. Do not store private tokens or model secrets here.
