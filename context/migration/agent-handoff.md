# Agent handoff (update at each session boundary)

- Last agent/tool: Antigravity (Gemini), 2026-11-01 (took over from Mistral Vibe and Claude Code; M02 merged into `main` at `3b2b718`; S02 plan and branch approved)
- Active milestone: S02 (backend dependency remediation), Scenario B+ target. S02 implementation and runtime verification completed. M01, S01, and M02 are merged and pushed.
- Current git branch: `fix/backend-dependency-remediation` (created from `main` at `3b2b718`).
- Spec status: M01, S01, and M02 merged; **S02 VERIFIED** (all 90 tests pass, package built, API/browser runtime 0 regressions, advisories 66 → 2); M03–M14 DRAFT
- Last verification result: backend `mvnw test` 90/90 pass, package built; runtime API 83 PASS / 6 FAIL (out of scope) / 3 INFO (0 regressions); browser 131 PASS / 21 FAIL / 1 NOT RUN / 4 INFO (0 regressions, identical to S01); advisories reduced 66 → 2 (`verification/s02-report.md`)
- Blockers: none; successful certificate upload still NOT RUN (no production Cloudinary credentials)
- Next approved action: human reviews S02 verification report, approves commit and merge of `fix/backend-dependency-remediation` to `main`. After S02 is merged, advance to M03.
- Servers: backend and Angular dev server stopped; DB `uptrack_migration_test` and role `uptrack_m01` RETAINED (hold synthetic data); Playwright/scripts live in the scratchpad outside the repo
- Required human approval: commit/push/merge of `fix/backend-dependency-remediation`, any deployment or contact with the hosted backend, teardown of the test DB/role, start of M03
- Roadmap: S01 sits between M01 and M02 (done); S02 (backend dependency remediation, Scenario B+ target) sits between M02 and M03 (in progress). Hard gates: S02 merged and verified before M03 begins; no hosted backend redeployment before S02 is verified and merged and the deployment is separately approved. M01–M14 IDs unchanged.
- DEPENDENCY ASSESSMENT: see `context/migration/dependency-security-assessment.md`. S02 is the approved vehicle for backend dependency changes. Cloudinary corrected to 2.5.0.
- HOSTED BACKEND: suspended by the owner; only the Angular frontend remains deployed. Keep it suspended. The S01 fix is merged but NOT deployed. Do not contact, probe, redeploy or restart the hosted backend without separate explicit authorization.
- Evidence: 25 curated screenshots committed; the full 77-file capture is local-only in git-excluded `baseline/screenshots-local/`
- Key facts: do not add AI agent attribution to commit messages (human rule); backend needs `JAVA_HOME` JDK 21 (default JDK is 27); no lint/e2e scripts exist; do not modify `frontend/` or backend application code.

Use this same file for all four AI agents. Do not store private tokens or model secrets here.
