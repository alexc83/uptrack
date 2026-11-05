# PM01 implementation verification

Status: **CONFIGURED — repository changes awaiting owner review; event-verification limits recorded below.** The owner authorized finalization commits, push and a draft PR from `chore/pm01-project-management`. Merge remains unauthorized. The initial setup snapshot below predates that draft PR; final CI evidence and proposed triage belong in its review record, not this historical snapshot.

## Verified baseline and safeguards

Local HEAD, origin/main and live remote main matched `630c6e8100333a02d135435c568bcd53af774d37` before work; working tree was clean. CLI account `alexc83` has Projects access. Existing account project #1 is closed and untitled; preserved untouched. Both rulesets were inspected active: `Protect main` (26409215) and `Require CI and pull requests on main` (26574227), with no bypass actors, merge commits only and required `backend`, `backend-postgres`, `frontend`, `e2e-chromium`. No protection changes were made.

## Project configuration

[UpTrack Development](https://github.com/users/alexc83/projects/2) is private, account-owned and linked to `alexc83/uptrack`. Repository association is verified; default repository `alexc83/uptrack` was selected and saved in the signed-in UI. Private visibility was also confirmed in settings.

Status: Backlog, Ready, In Progress, Review, Done.
Priority: P0 — Urgent, P1 — High, P2 — Normal, P3 — Low.
Title, Status, Priority, Labels and Linked pull requests were configured as visible fields on all three views.

All 20 initial items were explicitly set to Backlog / P2 — Normal as a neutral triage baseline; this is not implementation approval or a security severity assessment.

| View | Verified layout and filter | Verification |
|---|---|---|
| Work Board | Board; `-status:Done` | UI explicitly shows Column by: Status and status columns (the API omits this default) |
| Backlog | Table; `status:Backlog` | Priority ascending saved as shared default; API readback `ASC` on Priority |
| Maintenance & Security | Table; `label:maintenance,security,dependencies` | UI confirmed 14 matching items and expected visible fields |

## Imported and reconciled work

Existing issues: #19, #20, #21, #22, #23, #24.
Existing Dependabot PRs: #9, #13, #29, #30, #31, #32, #33.
No duplicate Project content IDs/numbers; 20 total items = 13 issues + 7 PRs.

- [#43: D01-W01: Plan explicit database schema migrations](https://github.com/alexc83/uptrack/issues/43)
- [#44: D01-W02: Evaluate isolated live-stack integration CI](https://github.com/alexc83/uptrack/issues/44)
- [#45: D01-W03: Resolve logout query recreation race](https://github.com/alexc83/uptrack/issues/45)
- [#46: Plan the public Help Center](https://github.com/alexc83/uptrack/issues/46)
- [#47: Explore installable PWA support](https://github.com/alexc83/uptrack/issues/47)
- [#48: Refresh public roadmap status after P01 completion](https://github.com/alexc83/uptrack/issues/48)
- [#49: D01-E: Complete remaining browser-workflow verification](https://github.com/alexc83/uptrack/issues/49)

The seven issues above were newly created after auditing the full issue list and existing planning documents. D01-W04 points to existing #20, whose original evidence was retained and supplemented with a reconciliation pointer; no second lifecycle issue was created. M09-W01 and completed migration milestones were not reopened or reimported. #49 was created only after querying Browsers runs with `event=schedule` and confirming `total_count: 0`.

Added only five missing labels: `security`, `maintenance`, `initiative`, `blocked`, `needs-decision`. Reused existing bug/enhancement/documentation/dependencies labels. Added security to #23/#24 and maintenance to #20 without replacing original labels.

## Native automation evidence and limits

Configured in the signed-in GitHub UI; enabled states independently read back via GraphQL:

| Workflow | Final state and action |
|---|---|
| Auto-add sub-issues to project | Enabled (GitHub default retained) |
| Auto-add to project | Enabled for `alexc83/uptrack`, filter `is:issue,pr is:open` |
| Auto-close issue | Disabled — required safeguard verified |
| Item added to project | Enabled for issues/PRs → Backlog |
| Item closed | Enabled for issues only → Done; unmerged PRs excluded |
| Pull request linked to issue | Disabled |
| Pull request merged | Enabled → Done |

**Live behavior verified:** removed only the Project membership of existing #49, updated its body with a tracking-verification note, then observed native auto-add restore membership and native Item added assign Backlog without any manual re-add or status assignment. Restored P2 priority. Temporarily set its Project status to Done, confirmed the issue remained open, then restored Backlog. Final 20 items are unique and Backlog/P2; no test issue or PR was created, closed or merged.

**Limits:** auto-add was exercised on an updated existing issue; a newly created issue/PR event and merged-PR/closed-issue transitions were not exercised. UI trigger/action settings and API enabled states are verified; these are not claims of event execution. There is no completed open issue suitable for closure testing, and PM01 does not authorize a test PR merge. Validate these event paths on the next legitimate completed issue and authorized PR merge. No failing or pending CI was bypassed.

The native Item closed editor exposes issue/PR types, but no completion-reason filter. Completed issues map to Done automatically. For duplicate/not-planned issues, preserve the closure reason, then manually reset the Project status to Backlog and archive the item after the close automation; do not count it as delivery. Closed-unmerged PRs do not trigger this rule. Auto-close issue remains disabled, so card movement cannot close issues.

The initial browser access limitation was resolved by the owner's in-app GitHub sign-in. All three views were visually inspected. No Actions workflow, bot, token, application code, dependency, production infrastructure or CI configuration was added. The public product roadmap content is unchanged. At the initial setup checkpoint, no repository changes had been committed, pushed or submitted as a PR. Subsequent owner authorization permits those finalization steps; it does not authorize merge.

## Repository preparation and validation

Four issue forms plus configuration and one PR template are prepared locally. Sensitive reports use [GitHub private vulnerability reporting](https://github.com/alexc83/uptrack/security/advisories/new); `GET /repos/alexc83/uptrack/private-vulnerability-reporting` returned `enabled: true` after enabling it for the approved private reporting path. [Security policy](../SECURITY.md) is prepared locally.

[AGENTS.md](../AGENTS.md) remains canonical; [CLAUDE.md](../CLAUDE.md) is a thin adapter. [Development workflow](development-workflow.md) defines issue-first work, evidence links, authorization, weekly review and separation from the public roadmap. The conflicting workflow in `ai-interaction.md` was replaced with a pointer. Historical trackers retain their contents with a prominent historical notice, and D01-W01–W04 evidence files now link to their canonical issues.

Validation: YAML parsed for all five issue-template/config files; issue form names/descriptions and unique field IDs checked. `git diff --check` passed. New/changed local Markdown links: 15 checked, zero broken. External GitHub references were validated against repository/Project/issue identities and the enabled reporting endpoint; signed-in Project views, private visibility and default repository were visually checked. Application tests were not run: no application, dependency or CI changes were made. CI was not run at the initial uncommitted checkpoint; the finalization draft PR is the authoritative record for subsequent CI and CodeQL results.

## Exact local files prepared

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/maintenance_task.yml`
- `.github/ISSUE_TEMPLATE/security_hardening.yml`
- `.github/pull_request_template.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SECURITY.md`
- `context/ai-interaction.md`
- `context/current-feature.md`
- `context/development-workflow.md`
- `context/migration/agent-handoff.md`
- `context/migration/follow-ups/d01-w01-schema-migrations.md`
- `context/migration/follow-ups/d01-w02-live-stack-integration-ci.md`
- `context/migration/follow-ups/d01-w03-logout-query-recreation-race.md`
- `context/migration/follow-ups/d01-w04-cloudinary-certificate-lifecycle.md`
- `context/migration/master-plan.md`
- `context/migration/migration-status.md`
- `context/pm01-verification.md`
