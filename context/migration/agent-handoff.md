# Agent handoff (update at each session boundary)

- Last agent/tool: Claude Code (Sonnet 5.5), 2026-10-31
- Active milestone: none in progress. M01 and S01 are merged and pushed. The dependency assessment and the S02 spec (DRAFT) are committed on `docs/dependency-security-assessment` (not pushed, not merged). M02 not started.
- Current git branch: `docs/dependency-security-assessment` (one documentation-only commit on top of `main` `6fd6f47`; see `git log`). NOT pushed or merged. `main` equals `origin/main` at `6fd6f47`. Nothing in `backend/` or `frontend/` is modified.
- Spec status: M01 and S01 merged; M02 DRAFT; S02 DRAFT (placement approved, implementation not authorized); M03 DRAFT
- Last verification result: backend `mvnw test` 90/90 (47 new cross-user tests + 4 filter unit tests), package OK; frontend 38/38 tests + build OK; runtime API 83 PASS/6 FAIL (out of scope)/3 INFO; browser 126 PASS/9 FAIL (frontend findings, out of scope)/1 NOT RUN; 0 regressions vs M01 (`verification/s01-report.md`)
- Blockers: none; successful certificate upload still NOT RUN
- Next approved action: none (stop and report the dependency assessment)
- Servers: backend and Angular dev server stopped; DB `uptrack_migration_test` and role `uptrack_m01` RETAINED (hold synthetic data); Playwright/scripts live in the scratchpad outside the repo
- Required human approval: push/merge of the documentation branch, M02 start, S02 readiness review and approval to edit `backend/pom.xml`, approval to start local servers for S02 runtime verification, any deployment or contact with the hosted backend, teardown of the test DB/role
- Roadmap: S01 sits between M01 and M02 (done); S02 (backend dependency remediation, Scenario B+ target) sits between M02 and M03 and is DRAFT. Hard gates: S02 merged and verified before M03 begins; no hosted backend redeployment before S02 is verified and merged and the deployment is separately approved. M01–M14 IDs unchanged.
- DEPENDENCY ASSESSMENT (2026-10-31, read-only): see `context/migration/dependency-security-assessment.md`. Do not upgrade, remove or install dependencies, run `npm audit fix`, or edit `pom.xml`/`package.json`/lockfiles without explicit approval (S02 is the approved vehicle for backend dependency changes once it is READY and approved). GitHub Dependabot alerts were NOT accessible (authentication required); the assessment used OSV/GHSA, CISA KEV, EPSS, `npm audit` and Maven Central metadata instead.
- HOSTED BACKEND: suspended by the owner; only the Angular frontend remains deployed. Keep it suspended. The S01 fix is merged but NOT deployed, and its dependencies are still the vulnerable BOM pins: do not redeploy before S02 is verified and merged and the deployment is separately approved. Do not contact, probe, redeploy or restart the hosted backend without separate explicit authorization.
- Evidence: 25 curated screenshots committed; the full 77-file capture is local-only in git-excluded `baseline/screenshots-local/`
- Key facts: do not add AI agent attribution to commit messages (human rule); backend needs `JAVA_HOME` JDK 21 (default JDK is 27); no lint/e2e scripts exist; do not modify `frontend/` or `backend/`

Use this same file for all four AI agents. Do not store private tokens or model secrets here.
