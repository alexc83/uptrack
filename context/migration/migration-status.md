# Migration status

- Current: M01, S01, M02, and S02 are VERIFIED, merged and pushed (`main` = `origin/main` at `6e0ba0d`). M03 (React/Flowbite foundation) is VERIFIED on branch `feature/react-foundation` (typecheck, lint, unit tests, build, and standalone Playwright E2E pass; 0 high/critical production advisories). Awaiting human review before commit/merge.
- Next milestone: M03 commit and merge to `main`, then M04 (Theme, shared UI and app shell).
- Active branch: `feature/react-foundation` (branched from `main` at `6e0ba0d`).
- Baseline: build/test RAN 2026-11-01 (backend 90 tests pass, package built); API runtime RAN (83 PASS/6 FAIL/3 INFO) and browser runtime RAN (131 PASS/21 FAIL/1 NOT RUN/4 INFO); 0 regressions vs S01; successful upload NOT RUN (placeholder Cloudinary credentials)
- Last approved milestone: S02 (merged and pushed 2026-11-01)
- Hosted backend: suspended by the owner; keep suspended; the S01 fix is not deployed; any deployment or contact needs separate approval
- Dependency security assessment (read-only, 2026-10-31): `dependency-security-assessment.md`. Backend 66 advisories (8 C / 24 H / 27 M / 7 L) from the Spring Boot 3.5.12 BOM pins, none in CISA KEV, no critical advisory reachable in UpTrack's code; patch-level fix path (Scenario B+: Boot 3.5.16 plus property overrides and Cloudinary 2.5.0) would leave 2, both unfixable on Spring Framework 6.2 and unreachable. Angular production: 6 flagged packages (4 H / 2 M), unreachable (no SSR). Dev/build tree: 45 packages, not shipped. Gate: do not redeploy the backend before S02 (dependency remediation) is verified and merged. No manifest or lockfile was changed prior to S02.

| Milestone | Spec | Branch | Tests | Review | Commit/PR | Status |
|---|---|---|---|---|---|---|
| M01 | READY | chore/react-migration-planning (merged to main) | FE build + 38 tests, BE 39 tests, API runtime, browser runtime RAN; upload success NOT RUN (agreed) | Approved by human | `19f3053` (merged, pushed) | Merged |
| S01 | READY (design approved; implemented) | fix/backend-authorization (merged to main) | BE 90 tests, FE 38 tests + build, API runtime (83 PASS/6 FAIL out of scope), browser runtime (126 PASS/9 FAIL out of scope) RAN; upload success NOT RUN | Approved by human | `39ceddf`, `6fd6f47` (merged, pushed) | Merged |
| M02 | READY (approved 2026-10-31) | chore/react-architecture (merged to main) | Docs-only: no runtime tests apply; read-only cross-checks recorded in `verification/m02-report.md` | Approved by human (architecture decisions 1–8) | `3b2b718` (merged, pushed) | Merged |
| S02 | READY (implemented, verified) | fix/backend-dependency-remediation (merged to main) | BE 90 tests, package OK, API 83 PASS / 6 FAIL, browser 131 PASS / 21 FAIL / 1 NOT RUN (0 regressions) | Approved by human (implementation) | `cb74890`, `6e0ba0d` (merged, pushed) | Merged |
| M03 | READY (implemented, verified) | feature/react-foundation | typecheck, lint, vitest (2 passed), build OK, Playwright E2E (3 passed) RAN | Approved by human (scaffold plan) | pending review | Verified |
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
