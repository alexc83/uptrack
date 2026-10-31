# Migration status

- Current: M01 VERIFIED (documentation and evidence committed on `chore/react-migration-planning`; not merged). S01 inserted (design approved, implementation NOT authorized, not started). M02 not started.
- Next milestone: S01 (needs human go-ahead to implement), then M02
- Active branch: chore/react-migration-planning (human override; no M01 branch)
- Baseline: build/test RAN 2026-10-31 (frontend 38 tests, backend 39 tests pass); API runtime RAN (55 PASS/18 FAIL/4 INFO) and browser runtime RAN (125 PASS/10 FAIL/1 NOT RUN/4 INFO); security findings S1-S4 + F13 confirmed; successful upload NOT RUN
- Last approved milestone: M01 verification results approved by the human 2026-10-31 (merge approval not yet requested)
- **Flagged urgent risk:** externally hosted backend (see `environment.production.ts`) may expose M01 findings S1–S3; not contacted or tested; any interaction needs separate authorization

| Milestone | Spec | Branch | Tests | Review | Commit/PR | Status |
|---|---|---|---|---|---|---|
| M01 | READY | chore/react-migration-planning | FE build + 38 tests, BE 39 tests, API runtime, browser runtime RAN; upload success NOT RUN (agreed) | Approved by human | docs commit on current branch (see git log) | Verified |
| S01 | DRAFT (design approved 2026-10-31) | fix/backend-security-remediation (not created) | Not run | Pending | — | Not started |
| M02 | DRAFT | — | Not run | Pending | — | Not started |
| M03 | DRAFT | — | Not run | Pending | — | Not started |
| M04 | DRAFT | — | Not run | Pending | — | Not started |
| M05 | DRAFT | — | Not run | Pending | — | Not started |
| M06 | DRAFT | — | Not run | Pending | — | Not started |
| M07 | DRAFT | — | Not run | Pending | — | Not started |
| M08 | DRAFT | — | Not run | Pending | — | Not started |
| M09 | DRAFT | — | Not run | Pending | — | Not started |
| M10 | DRAFT | — | Not run | Pending | — | Not started |
| M11 | DRAFT | — | Not run | Pending | — | Not started |
| M12 | DRAFT | — | Not run | Pending | — | Not started |
| M13 | DRAFT | — | Not run | Pending | — | Not started |
| M14 | DRAFT | — | Not run | Pending | — | Not started |

Note: S01 is an ID-preserving insertion between M01 and M02; M01–M14 are not renumbered.

Allowed status values: Not started, Spec ready, In progress, Blocked, Verified, Merged. Never mark Verified when essential tests are Not run.
