# S03 verification report — dependency security remediation (Angular focus)

Status: **ACCEPTED by the owner (2026-11-03) — integrated via authorized fast-forward merge and normal push; see acceptance record below.** No alert was dismissed; no deployment, database change, React dependency change or M10 work is implied.
Agent / session: Mistral Vibe / 2026-11-03
Date / branch / base: 2026-11-03 / `chore/s03-dependency-remediation` / created from `main` = `origin/main` = `052db4a1718c4af1a665f242704be192f60d3030` (verified synchronized before branching; two unrelated untracked files preserved untouched)
Scope authorization: S03 task brief — inspect/remediate Dependabot alerts, Angular (`frontend/`) first; React (`frontend-react/`) and backend reported only, no changes; no `npm audit fix --force`, no alert dismissals, no `node_modules` edits, no framework-major upgrades.

## 1. GitHub Dependabot alert inventory (export of 2026-11-02, `/private/tmp/uptrack-security/`)

The JSON export contains **120 alerts, all `state: "open"`** (the "120" headline is the actual open count; no dismissed/closed alerts are present in the export). No alert lacks a patched version (`first_patched_version` is set for every entry).

| Manifest | Open alerts | Critical | High | Medium | Low | Runtime (production) scope | Dev scope |
|---|---|---|---|---|---|---|---|
| `frontend/package-lock.json` (legacy Angular) | 114 | 2 | 40 | 61 | 11 | 18 (11 high, 7 medium — all `@angular/*` direct) | 96 |
| `frontend-react/package-lock.json` (React) | 6 | 2 | 0 | 4 | 0 | 0 (all development) | 6 |
| `backend/` (Maven) | 0 in this export | — | — | — | — | Dependabot npm export does not cover Maven; backend was remediated under S02 (merged `cb74890`, `6e0ba0d`) | — |
| Other manifests | 0 | — | — | — | — | — | — |

Severity-by-scope detail for `frontend/`: critical 2 (both dev: `proxy-addr`, `piscina`), high 40 (29 dev + 11 runtime), medium 61 (54 dev + 7 runtime), low 11 (dev). Runtime alerts are all direct `@angular/*` dependencies at locked 21.2.13; only the `>= 21.0.0-next.0, < 21.2.15/21.2.19/21.2.24` ranges actually cover the locked 21.2.13 — the many `>= 22.0.0` ranges in the export target Angular 22 and do not affect the locked version.

`frontend-react/` 6 alerts (all dev): `tinypool` ×2 critical (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr), `vitest` medium (GHSA-82fw-gwwq-j7x9, direct), `@vitest/mocker` ×2 medium (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8), `minimatch` medium (GHSA-g3hv-75wg-m249). **Reported only — no React changes authorized or made.** Local `npm audit` there: full 16 (2 critical / 14 moderate, all dev), `npm audit --omit=dev` **0** — production tree is already clean.

## 2. Changes performed (Angular `frontend/` only)

Changed files: `frontend/package.json`, `frontend/package-lock.json`. No source files touched.

Direct dependency upgrades (all inside the existing semver major; package.json minimums raised to the patched versions):

| Package | Before (locked) | After (locked) | package.json range |
|---|---|---|---|
| `@angular/common`, `compiler`, `core`, `forms`, `platform-browser`, `router` | 21.2.13 | **21.2.26** | `^21.2.13` → `^21.2.26` |
| `@angular/compiler-cli` (dev) | 21.2.13 | **21.2.26** | `^21.2.13` → `^21.2.26` |
| `@angular/build` (dev) | 21.2.11 | **21.2.29** | `^21.2.3` → `^21.2.26` |
| `@angular/cli` (dev) | 21.2.11 | **21.2.29** | `^21.2.11` → `^21.2.26` |
| `primeng` | 21.1.3 | **21.1.10** | `^21.1.3` → `^21.1.10` |
| `vitest` (dev) | 4.1.0 | **4.1.12** | `^4.0.8` → `^4.1.12` |

Resolution notes (significant decisions):
- **No framework-major upgrade.** Angular 21.2.26 is the latest `v21-lts` patch (dist-tag `v21-lts`); all 21.x-applicable runtime advisories (fixed in 21.2.15–21.2.25) are covered. Advisories whose ranges start at `>= 22.0.0` require Angular 22 — deliberately **not** done; documented in §5.
- `npm install pkg@ver` repeatedly hit ERESOLVE because the stale lockfile/`node_modules` pinned exact-peer `@angular/*` 21.2.13 entries against the new 21.2.26 peers. Resolved by moving the old lockfile and `node_modules` aside (reversible `mv` to `/tmp/s03-evidence/`, nothing deleted) and running a fresh `npm install` from the edited `package.json`. This re-resolved the whole tree **within the unchanged semver ranges**: 222 packages changed version, 9 added, 5 removed — no range was widened beyond its existing major, so no new major was introduced anywhere. `--force`/`--legacy-peer-deps` were not used.
- **No npm overrides were added.** The remaining advisories (§5) sit inside `@angular/cli`'s bundled pacote/npm-registry stack; forcing patched majors there (e.g. minimatch 11 under glob 13) could not be demonstrated compatible, so per scope rules they were left and documented instead.
- Lockfile-only in-range bumps of notable transitive packages: vite 7.3.2→7.3.7, undici 7.24.4→7.30.1, hono 4.12.18→4.13.16, `@hono/node-server` 1.19.14→2.1.6, `@modelcontextprotocol/sdk` 1.26.0→1.32.1, piscina 5.1.4→5.3.2, tar 7.5.12→7.5.22, qs 6.15.0→6.17.1, brace-expansion 5.0.6→5.0.12, fast-uri 3.1.2→3.1.9, postcss 8.5.14→8.5.32, nanoid 3.3.11→3.3.20, proxy-addr 2.0.7→2.0.8, esbuild 0.27.3→0.28.1, `@vitest/mocker` 4.1.0→4.1.12, sigstore 4.1.0→4.1.1, prettier 3.8.1→3.9.10, tslib 2.8.1→2.9.1, minimatch 10.2.4→10.2.6 (still < 11.0.1, see §5).

## 3. Audit comparison (npm audit, `frontend/`, before → after)

| Metric | Before | After |
|---|---|---|
| `npm audit --json` (full) | **51** total: 3 critical, 22 high, 24 moderate, 2 low (40 vulnerable packages) | **16** total: 0 critical, 0 high, 16 moderate, 0 low (16 packages) |
| `npm audit --omit=dev --json` (production) | **6**: 4 high, 2 moderate (`@angular/common`, `compiler`, `core`, `router`, `forms`, `platform-browser`) | **0** |
| Vulnerable packages resolved | — | **35** (all `@angular/*`, `@angular/build`, `@angular/cli`, vitest, vite, undici, hono, `@hono/node-server`, `@modelcontextprotocol/sdk`, piscina, tar, qs, brace-expansion, fast-uri, postcss, nanoid, proxy-addr, esbuild, `@vitest/mocker`, sigstore family, immutable, ip-address, browserslist, source-map-js, body-parser, zod, `@babel/core`, baseline-browser-mapping, node-gyp) |
| Newly introduced vulnerable packages | — | **0** |
| Advisory instances resolved | — | 165 (npm-audit counting; one sigstore-family instance re-counted at lower severity, no new package) |

Dependabot re-evaluation against the new lockfile (semver check of every one of the 114 open frontend alerts against installed versions): **113 of 114 no longer applicable; 1 remains** (`minimatch` < 11.0.1, still 10.2.6 installed — see §5). GitHub's live alert count may lag and may not match these numbers exactly.

## 4. Verification commands and outcomes (`frontend/`, 2026-11-03)

| Command | Result |
|---|---|
| `CI=true npm test` (`ng test`, `@angular/build:unit-test` + vitest 4.1.12) | **PASS** — 13 test files, **38/38 tests passed**, exit 0 |
| `npm run build` (`ng build`, production AOT, strictTemplates) | **PASS** — exit 0; only the 4 pre-existing SCSS budget *warnings* (unchanged source files) |
| Typecheck | Covered by `ng build` (AOT + strict TS, exit 0); no separate `typecheck` script exists in `frontend/package.json` |
| Lint | No eslint config/script in `frontend/`; `npx prettier --check "src/**/*.{ts,html,scss}"` reports **49 files with style warnings — identical count with the pre-change prettier 3.8.1 binary**, i.e. pre-existing on main, not introduced by S03 (no source files changed) |
| `npm audit --json` / `--omit=dev --json` before/after | Recorded in §3 (raw JSON in session scratchpad `/tmp/s03-evidence/`) |
| `frontend-react` checks | **NOT RUN by design** — no React changes authorized; read-only `npm audit` baseline recorded only |
| Backend checks | **NOT RUN** — no backend changes; no Maven alerts in the export |
| Full React Playwright suite | **NOT RUN** — explicitly out of scope |

## 5. Remaining risks and blockers

1. **16 moderate dev-only advisories remain in `frontend/`**, all rooted in `@angular/cli@21.2.29`'s bundled npm-registry stack (pacote 21.5.1 → sigstore/tuf/cacache/glob/minimatch/make-fetch-happen/npm-registry-fetch/npm-packlist/ignore-walk/@npmcli/*). npm's advisory DB gives the only version fix as `@angular/cli@22.2.5`, i.e. a **major Angular 22 upgrade — out of scope** ("avoid unnecessary framework-major upgrades"); pacote's own range (`>=5.0.0`) has no patched version. No override was applied because compatibility inside pacote's internals cannot be demonstrated (e.g. minimatch 11 is incompatible with the pinned glob 13). These packages are build/dev-only, never shipped to browsers, and `frontend/` retires at M14. **Blocker for full local zero: requires Angular 22 decision or owner-approved overrides.**
2. **1 Dependabot alert remains applicable in `frontend/`**: `minimatch` (medium, dev, transitive, GHSA-g3hv-75wg-m249, fixed 11.0.1) — same blocker as above (installed 10.2.6, parent glob 13 requires `^10`).
3. **`frontend-react/` 6 open Dependabot alerts (2 critical tinypool, 4 medium) — all dev-only**, reported not fixed per scope ("do not upgrade React merely because an alert exists"). Production audit there is already 0. Recommended follow-up: owner-approved vitest 3.x→4.1.12+ bump on the React side (its dev tree), separate from this milestone.
4. **Backend**: no alerts in this npm-only export; S02 (merged) already remediated the Maven tree. A Maven dependency-submission/OSV step would improve GitHub visibility (noted in the 2026-10-31 assessment).
5. GitHub Dependabot totals update asynchronously after merge and count differently from `npm audit`; do not treat either number as exact until re-scanned post-merge.

## 6. Recommendations

- Owner decision (post-M14 or separate security milestone): whether to pursue Angular 22 / React vitest 4 / overrides for the remaining dev-tree advisories, or accept them as dev-only residual risk for a frontend that retires at cutover.
- Re-run GitHub Dependabot scan after S03 merges to confirm the frontend alert count drops from 114 toward 1.
- Consider enabling Maven dependency submission for `backend/` so Dependabot/OSV covers transitive Java libraries.

## 7. Acceptance record (owner, 2026-11-03)

The owner accepted the S03 results and authorized commit, fast-forward merge, push and merged-branch cleanup. Accepted evidence:

- Initial GitHub Dependabot alerts: **114 Angular (`frontend/`), 6 React (`frontend-react/`)**, 0 backend/Maven in the export (all 120 export entries open).
- Angular `npm audit` (full): **51 → 16** vulnerable packages (3C/22H/24M/2L → 0C/0H/16M/0L).
- Angular production audit (`npm audit --omit=dev`): **6 → 0**.
- Dependabot re-evaluation: **113/114 Angular alerts predicted no longer applicable** after the lockfile change; GitHub-side confirmation remains pending until Dependabot re-scans post-merge (alert totals update asynchronously and may not match npm audit).
- Angular tests: `ng test` **38/38 passed** (13 files). Production build (`ng build`): **passed** (exit 0; only pre-existing SCSS budget warnings).
- **No Angular application-code changes** (only `frontend/package.json` / `frontend/package-lock.json`).
- **No framework-major upgrades and no npm overrides** (Angular stays on 21.x LTS, 21.2.26).

Accepted residual risk (not "all 120 alerts resolved"):

- **16 moderate development-only npm findings** remain in `frontend/`, all inside `@angular/cli`'s bundled pacote/npm-registry stack; dev-only, never shipped, frontend retires at M14.
- **1 Angular Dependabot alert predicted to remain** (`minimatch` < 11.0.1, GHSA-g3hv-75wg-m249) — fix requires minimatch 11, incompatible with the pinned glob 13 without unproven overrides.
- **Angular 22 migration explicitly deferred** — the only published fix path for the remaining pacote-stack advisories (`@angular/cli@22.2.5`) is a framework-major upgrade, out of S03 scope.
- **React development-dependency remediation deferred to a separate task** — `frontend-react/` has 6 open dev-only alerts (2 critical `tinypool`); its production audit is already 0; no React changes were made or authorized here.

## 8. Changed-file inventory

- `frontend/package.json` — 10 range minimums raised (table in §2)
- `frontend/package-lock.json` — regenerated in-range resolution (222 version changes, 9 added, 5 removed)
- `context/migration/verification/s03-report.md` — this report
- `context/migration/agent-handoff.md` — S03 marked in implementation review; M10 not started
- `context/migration/migration-status.md` — S03 tracker row added (In progress)

Untracked and preserved untouched: `conversation-2026-11-02-064616.txt`, `frontend-react/src/test/render-with-providers 2.tsx`.
