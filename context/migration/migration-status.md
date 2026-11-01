# Migration status

- Current: M01 VERIFIED and merged to `main` (`19f3053`, pushed). S01 IMPLEMENTED, VERIFIED AND COMMITTED LOCALLY on `fix/backend-authorization` (two commits; not pushed, not merged, not deployed). M02 not started.
- Next milestone: push/merge approval for S01, then M02
- Active branch: `fix/backend-authorization` (S01 committed locally; not pushed)
- Baseline: build/test RAN 2026-10-31 (frontend 38 tests, backend 39 tests pass); API runtime RAN (55 PASS/18 FAIL/4 INFO) and browser runtime RAN (125 PASS/10 FAIL/1 NOT RUN/4 INFO); security findings S1-S4 + F13 confirmed; successful upload NOT RUN
- Last approved milestone: M01 (merged and pushed 2026-10-31); S01 results await review
- Hosted backend: suspended by the owner; keep suspended; the S01 fix is not deployed; any deployment or contact needs separate approval

| Milestone | Spec | Branch | Tests | Review | Commit/PR | Status |
|---|---|---|---|---|---|---|
| M01 | READY | chore/react-migration-planning (merged to main) | FE build + 38 tests, BE 39 tests, API runtime, browser runtime RAN; upload success NOT RUN (agreed) | Approved by human | `19f3053` (merged, pushed) | Merged |
| S01 | READY (design approved; implemented) | fix/backend-authorization | BE 90 tests, FE 38 tests + build, API runtime (83 PASS/6 FAIL out of scope), browser runtime (126 PASS/9 FAIL out of scope) RAN; upload success NOT RUN | Approved by human | two local commits on `fix/backend-authorization` (see git log); not pushed | Verified |
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
