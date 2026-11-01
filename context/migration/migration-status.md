# Migration status

- Current: M01 and S01 are VERIFIED, merged and pushed. The dependency security assessment and the S02 DRAFT spec are merged into `main` (commit `ee72760`, which also merged `docs/dependency-security-assessment`; the branch is now fully merged and retained). `main` = `origin/main` at `ee72760`. The S01 fix is NOT deployed. **M02 spec is READY** on branch `chore/react-architecture` (created from `ee72760`; documentation only, uncommitted until human approval).
- Next milestone: M02 (documentation/architecture) completion, then S02 (backend dependency remediation; must be merged and verified before M03 and before any hosted backend redeployment).
- Active branch: `chore/react-architecture` (M02 documentation; branched from `main` at `ee72760`). `main`, `fix/backend-authorization`, `chore/react-migration-planning` and `docs/dependency-security-assessment` are retained (the last two fully merged).
- Baseline: build/test RAN 2026-10-31 (frontend 38 tests, backend 39 tests pass); API runtime RAN (55 PASS/18 FAIL/4 INFO) and browser runtime RAN (125 PASS/10 FAIL/1 NOT RUN/4 INFO); security findings S1-S4 + F13 confirmed; successful upload NOT RUN
- Last approved milestone: S01 (merged and pushed 2026-10-31)
- Hosted backend: suspended by the owner; keep suspended; the S01 fix is not deployed; any deployment or contact needs separate approval
- Dependency security assessment (read-only, 2026-10-31): `dependency-security-assessment.md`. Backend 66 advisories (8 C / 24 H / 27 M / 7 L) from the Spring Boot 3.5.12 BOM pins, none in CISA KEV, no critical advisory reachable in UpTrack's code; patch-level fix path (Boot 3.5.16 plus property overrides and Cloudinary 2.6.0) would leave 2, both unfixable on Spring Framework 6.2 and unreachable. Angular production: 6 flagged packages (4 H / 2 M), unreachable (no SSR). Dev/build tree: 45 packages, not shipped. Gate: do not redeploy the backend before S02 (dependency remediation) is verified and merged. No manifest or lockfile was changed.

| Milestone | Spec | Branch | Tests | Review | Commit/PR | Status |
|---|---|---|---|---|---|---|
| M01 | READY | chore/react-migration-planning (merged to main) | FE build + 38 tests, BE 39 tests, API runtime, browser runtime RAN; upload success NOT RUN (agreed) | Approved by human | `19f3053` (merged, pushed) | Merged |
| S01 | READY (design approved; implemented) | fix/backend-authorization (merged to main) | BE 90 tests, FE 38 tests + build, API runtime (83 PASS/6 FAIL out of scope), browser runtime (126 PASS/9 FAIL out of scope) RAN; upload success NOT RUN | Approved by human | `39ceddf`, `6fd6f47` (merged, pushed) | Merged |
| M02 | READY (approved 2026-10-31) | chore/react-architecture (from `ee72760`) | Docs-only: no runtime tests apply; read-only cross-checks recorded in `verification/m02-report.md` | Approved by human (architecture decisions 1–8) | pending commit approval | Spec ready |
| S02 | DRAFT (placement approved 2026-10-31; implementation not authorized) | fix/backend-dependency-remediation (not created) | Not run | Pending | — | Not started |
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

Note: S01 (between M01 and M02) and S02 (between M02 and M03) are ID-preserving insertions; M01–M14 are not renumbered.

Allowed status values: Not started, Spec ready, In progress, Blocked, Verified, Merged. Never mark Verified when essential tests are Not run.
