# UpTrack development workflow

[UpTrack Development](https://github.com/users/alexc83/projects/2) is the private internal Project for [alexc83/uptrack](https://github.com/alexc83/uptrack). Issues define scope, acceptance, decisions, blockers and handoff. Project fields define priority and work stage. PRs record implementation, review and verification. Versioned specs/reports retain detailed design and evidence. Chats assist work; accepted conclusions must be recorded in GitHub.

## Fields and views

Status: **Backlog → Ready → In Progress → Review → Done**. Backlog captures work; Ready means scope/acceptance are clear and owner authorization is recorded; In Progress means active work; Review awaits review/verification/acceptance; Done means accepted completion, not deployment. Keep one implementation item active and at most three Ready.

Priority: **P0 — Urgent**, **P1 — High**, **P2 — Normal**, **P3 — Low**. P2 is the triage default; priority is scheduling, not security severity. An urgent item still requires the applicable authorization.

Views: Work Board (status columns, Done hidden), Backlog (table, priority order), Maintenance & Security (labels `maintenance`, `security` or `dependencies`). See [PM01 verification](pm01-verification.md) for actual setup and any pending UI configuration; intended settings are not evidence of activation.

Reuse `bug`, `enhancement`, `documentation`, `dependencies`; add `security`, `maintenance`, `initiative`, `blocked`, `needs-decision` only as needed. Do not duplicate status or priority with labels. A blocked item retains its stage and names the blocker, responsible next action and dependency in a comment.

## Work sequence

1. Search existing issues and PRs, then select or create one canonical issue.
2. Record outcome, scope/exclusions, acceptance and source evidence. Small issues may serve as specs; significant changes require a linked READY spec.
3. Obtain owner authorization; status and labels do not authorize work.
4. Check the working tree and main; create an issue-linked branch, for example `fix/123-certificate-cleanup`.
5. Set In Progress, implement and test under [the testing policy](testing-workflow.md).
6. With owner authorization, open a PR linking the issue and spec. Summarize changes, exact checks, risks, limitations and remaining decisions.
7. Set Review and verify required CI: `backend`, `backend-postgres`, `frontend`, `e2e-chromium`. Firefox/WebKit remain informational. Do not bypass protections.
8. Obtain acceptance and merge authorization. Commit, push, PR creation and branch deletion also require authorization under [AGENTS.md](../AGENTS.md).
9. Merge by merge commit only; verify the issue and Project state. Use closing keywords only when all acceptance criteria will be satisfied. Partial work uses `Related to #N`; keep the issue open.
10. Record unresolved work in linked follow-up issues and leave a handoff with issue/PR, branch, approval/spec status, checks, blockers and next action. If GitHub is unavailable, provide ready-to-post text and state that it was not posted.

## Initiatives and evidence

Use a parent issue with `initiative` for work spanning independent deliverables; attach existing sub-issues, never copy them. Keep implementation steps as checklists when independent scheduling is unnecessary. Add milestones only for a real release or delivery target.

Keep specifications and reports in existing locations when already established. New substantial work can use `context/specs/issue-N-slug.md` and `context/verification/issue-N-report.md`; create these only when needed. Link issue → spec → PR → evidence, with reciprocal links. Record decisions as decision, reason and consequences. Preserve failed checks and NOT RUN/PENDING OWNER limitations; green CI does not imply live acceptance or deployment.

D01-W04 is tracked by [issue #20](https://github.com/alexc83/uptrack/issues/20). Migration M01–M14 and completed M09-W01 remain historical; do not recreate them. Routine Dependabot updates are tracked directly by their PRs; create an issue only for independently scoped investigation or migration.

## Automation policy

Use native Project workflows for auto-add of new open issues/PRs, Backlog on addition, completed issues → Done and merged PRs → Done. Never close issues merely because a card moves to Done. The native Item closed rule is restricted to issues, so closed-unmerged PRs do not become Done. Its editor has no completion-reason filter: after closing duplicate/not-planned issues, preserve their reason, manually reset Project status to Backlog and archive them after automation runs; do not count them as delivered work. Auto-add and Backlog defaults were exercised; close/merge event execution awaits the next legitimate completion, as recorded in [PM01 verification](pm01-verification.md). Do not add a workflow, bot or token without separate approval.

## Security and public roadmap

The repository is public; a private Project does not hide its issues or PRs. Use [private vulnerability reporting](https://github.com/alexc83/uptrack/security/advisories/new) for sensitive findings, following [SECURITY.md](../SECURITY.md). Public tracking contains sanitized scope only; never credentials, confidential exploit details or user data.

The application's public `/roadmap` is curated product communication. Its Now/Next/Later/Completed sections do not mirror internal Project status, priorities or security work. Update it intentionally through reviewed content changes. No automatic publication, dates or delivery promises are implied.

## Weekly review (15 minutes)

Triage new issues and dependency PRs; review blockers and owner decisions; reconcile merged PRs with issues; choose up to three Ready items; close obsolete/duplicate work with reasons; decide whether public roadmap wording needs an update. Record decisions in the affected issues, not a new weekly status document.
