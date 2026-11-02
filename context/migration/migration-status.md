# Migration status

- Current: M01, S01, M02, S02, M03 and M04 are merged and pushed. At the M04 merge point, after explicit human authorization, `main` and live `origin/main` were verified at `b47bd4226c83015139bf9e5a54cd4ad170f06bbd` (ahead/behind 0/0).
- Active milestone: none. M04 is complete; its READY spec, implementation and verification results were approved. M05 remains DRAFT / Not started and has not been authorized.
- Next action: await further human instructions. The documentation-only merge-status correction was approved for commit and push. Do not begin M05, deploy or delete branches without separate authorization.
- Working branch: `main`. The approved documentation correction was prepared on `chore/m04-merge-status` from merged `main` at `b47bd42`; its commit follows the M04 merge point without changing application code. Both correction and original feature branches are retained.
- Baseline: build/test RAN 2026-11-01 (backend 90 tests pass, package built); API runtime RAN (83 PASS/6 FAIL/3 INFO) and browser runtime RAN (131 PASS/21 FAIL/1 NOT RUN/4 INFO); 0 regressions vs S01; successful upload NOT RUN (placeholder Cloudinary credentials)
- Last completed milestone: M04 — merged and pushed as `9440d21` (React) and `b47bd42` (verification/documentation).
- Hosted backend: suspended by the owner; keep suspended; the S01 fix is not deployed; any deployment or contact needs separate approval
- Dependency security assessment (read-only, 2026-10-31): `dependency-security-assessment.md`. Backend 66 advisories (8 C / 24 H / 27 M / 7 L) from the Spring Boot 3.5.12 BOM pins, none in CISA KEV, no critical advisory reachable in UpTrack's code; patch-level fix path (Scenario B+: Boot 3.5.16 plus property overrides and Cloudinary 2.5.0) would leave 2, both unfixable on Spring Framework 6.2 and unreachable. Angular production: 6 flagged packages (4 H / 2 M), unreachable (no SSR). Dev/build tree: 45 packages, not shipped. Gate: do not redeploy the backend before S02 (dependency remediation) is verified and merged. No manifest or lockfile was changed prior to S02.

| Milestone | Spec | Branch | Tests | Review | Commit/PR | Status |
|---|---|---|---|---|---|---|
| M01 | READY | chore/react-migration-planning (merged to main) | FE build + 38 tests, BE 39 tests, API runtime, browser runtime RAN; upload success NOT RUN (agreed) | Approved by human | `19f3053` (merged, pushed) | Merged |
| S01 | READY (design approved; implemented) | fix/backend-authorization (merged to main) | BE 90 tests, FE 38 tests + build, API runtime (83 PASS/6 FAIL out of scope), browser runtime (126 PASS/9 FAIL out of scope) RAN; upload success NOT RUN | Approved by human | `39ceddf`, `6fd6f47` (merged, pushed) | Merged |
| M02 | READY (approved 2026-10-31) | chore/react-architecture (merged to main) | Docs-only: no runtime tests apply; read-only cross-checks recorded in `verification/m02-report.md` | Approved by human (architecture decisions 1–8) | `3b2b718` (merged, pushed) | Merged |
| S02 | READY (implemented, verified) | fix/backend-dependency-remediation (merged to main) | BE 90 tests, package OK, API 83 PASS / 6 FAIL, browser 131 PASS / 21 FAIL / 1 NOT RUN (0 regressions) | Approved by human (implementation) | `cb74890`, `6e0ba0d` (merged, pushed) | Merged |
| M03 | READY (implemented, verified) | feature/react-foundation (merged to main) | Historical M03: typecheck/lint/unit 2/build/E2E 3 passed | Approved by human | `eb7948b`, `9e297f8` (merged, pushed) | Merged |
| M04 | READY (implemented, verified) | feature/react-app-shell (merged to main; retained) | typecheck/lint, unit 32, build, E2E 34 (8 visual comparisons), production audit 0; full audit 16 deferred dev findings | Implementation/results and merge/push approved | `9440d21`, `b47bd42` (merged, pushed) | Merged |
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

The M04 verification report is preserved as the pre-merge evidence/approval record. This tracker records the subsequent authorized merge and push; no historical verification result has been rewritten.
