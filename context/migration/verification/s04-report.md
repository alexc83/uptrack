# S04 verification report — post-migration dependency security audit & remediation

Status: **IMPLEMENTED — targeted checks PASS; local commits on `fix/s04-dependency-security`; no push/merge (owner approval required)**
Agent / session: Mistral Vibe / S04 session
Date / branch / base: 2026-11-03+ / `fix/s04-dependency-security` / created from `main` = `origin/main` = `9022d73` (verified synchronized via `git fetch` + `git rev-list --left-right --count main...origin/main` = 0/0 before branching; untracked `conversation-2026-11-02-064616.txt` preserved untouched)
Scope: S04 brief — audit GitHub Dependabot alerts + local npm/Maven reports, remediate actionable findings in the canonical `frontend-react/` and re-verify `backend/` state; retired Angular `frontend/` reported only; no `npm audit fix --force`, no overrides, no alert dismissals, no deploy, no push/merge.

## 1. Initial Dependabot inventory (live GitHub API, `gh api repos/alexc83/uptrack/dependabot/alerts --paginate`, 180 entries total)

| State | Count | Detail |
|---|---|---|
| open | **7** | 6 in `frontend-react/package-lock.json` (all development scope), 1 in `frontend/package-lock.json` (retired Angular) |
| fixed | 172 | includes all 114 former Angular alerts resolved by S03 |
| auto_dismissed | 1 | `glob` in `frontend/` |

Open alerts (all 7):

| # | Severity | GHSA / CVE | Package | Locked | Relationship | Scope | Manifest | Patched version |
|---|---|---|---|---|---|---|---|---|
| 181 | medium | GHSA-82fw-gwwq-j7x9 / CVE-2026-84373 | vitest | 3.2.7 | direct | dev | frontend-react | 4.1.11 |
| 180 | medium | GHSA-82fw-gwwq-j7x9 | @vitest/mocker | 3.2.7 | transitive | dev | frontend-react | 4.1.11 |
| 184 | medium | GHSA-qxg6-89mg-rqv8 / CVE-2026-112949 | @vitest/mocker | 3.2.7 | transitive | dev | frontend-react | 4.1.12 |
| 183 | **critical** | GHSA-5gmw-xhrv-c9v3 / CVE-2026-104848 | tinypool | 1.1.1 | transitive (via vitest) | dev | frontend-react | 2.1.1 |
| 182 | **critical** | GHSA-85c8-ppgw-ccpr / CVE-2026-104849 | tinypool | 1.1.1 | transitive (via vitest) | dev | frontend-react | 2.1.2 |
| 185 | medium | GHSA-g3hv-75wg-m249 / CVE-2026-118764 | minimatch | 10.2.6 (nested under `@typescript-eslint/typescript-estree`) | transitive | dev | frontend-react | 11.0.1 |
| 179 | medium | GHSA-g3hv-75wg-m249 | minimatch | 10.2.6 | transitive | dev | frontend/ (retired) | 11.0.1 |

No open Maven/backend alerts exist in Dependabot (its npm/maven manifests cover `/frontend-react` and `/backend`; the backend tree was already remediated under S02 and shows only the two known Spring Framework 6.2 criticals in OSV/GitHub advisories — see §4).

Local `npm audit` in `frontend-react/` before remediation: **16 findings (2 critical, 14 moderate, 0 high/low)** — all development scope; `npm audit --omit=dev`: **0** (production tree clean). `npm outdated` showed available majors (vite 8.3.5, lucide-react 1.67.0, @hookform/resolvers 7.0.2, typescript 7, eslint 10, vitest 5.1.0) — none are security-driven (no open alerts, production audit 0) and were **not** taken.

## 2. Classification and remediation decisions

| Finding | Class | Decision |
|---|---|---|
| tinypool ×2 critical (RCE via prototype-pollution gadget in worker/run options), reachable only through vitest's worker pool on dev/CI machines | **Immediate** (critical, dev/build infrastructure; EPSS ~0.5%) | Fixed: vitest 3.2.7 → **4.1.12**, whose dependency tree no longer contains tinypool at all (verified: no `tinypool` entry in the new lockfile) |
| vitest / @vitest/mocker mediums (path traversal via redirect mock; unauthenticated manual-mock code injection) — require a hostile test/mock input on a dev machine | **Immediate** (same fix) | Fixed by the same vitest 4.1.12 bump (@vitest/mocker 4.1.12 ≥ all patched versions 4.1.11/4.1.12) |
| minimatch medium (globparts amplification DoS, GHSA-g3hv-75wg-m249, EPSS 0.29%) in frontend-react | **Deferred**: sole parent is `@typescript-eslint/typescript-estree` `^10.2.2`; latest 8.72.1 still pins `minimatch ^10.2.2`, so the 11.0.1 fix requires a typescript-eslint/eslint major (v9/eslint 10) — a broad tooling upgrade explicitly out of scope; dev-only, not shipped |
| minimatch medium in `frontend/` (retired Angular app) | **Deferred**: `frontend/` is read-only historical reference post-M14; S03 already documented the same residual |
| vite 7.3.7 / lucide-react 0.475.0 / @hookform/resolvers 5.9.2 / jjwt 0.12.7 Dependabot version-update branches | **Deferred**: version-update PRs, not security alerts; no open advisories against locked versions (npm prod audit 0; GitHub maven advisories for jjwt-api 0.12.7: none). Major upgrades not justified by any advisory |
| Backend (Spring Boot 3.5.16 + S02 overrides) | Verified clean except known residual | No changes; see §4 |

## 3. Changes made

Only two files changed: `frontend-react/package.json`, `frontend-react/package-lock.json`.

- `vitest` devDependency `^3.0.5` → `^4.1.12`; installed with plain `npm install` (no `--force`, no `--legacy-peer-deps`, no overrides added). Vitest 4.1.12 peers are satisfied by the existing tree (vite `^7.3.7` ✓, `@types/node ^22` ✓, node v24 ✓).
- Lockfile result: 13 package versions changed, 2 added (`@standard-schema/spec`, `obug`), 10 removed (incl. `tinypool`); **zero production (`dev != true`) packages changed** — verified by diffing `packages` entries against `HEAD`. `vitest` 4.1.12, `@vitest/mocker` 4.1.12, `@vitest/runner` 4.1.12 locked; tinypool absent.
- No source/config changes; `vitest.config.ts` works unchanged under vitest 4 (`environment: 'jsdom'`, `globals`, `setupFiles` all still supported).

## 4. Backend review (no changes)

- `backend/pom.xml` confirmed at the post-S02 state: Spring Boot parent 3.5.16, `tomcat.version` 10.1.61, `jackson-bom.version` 2.21.8, `postgresql.version` 42.7.14, `httpclient5` 5.6.4, `httpcore5` 5.4.3, `commons-lang3` 3.18.0, `log4j2` 2.25.5, cloudinary-http5 2.5.0, jjwt 0.12.7.
- GitHub global advisory API spot-check (`gh api advisories?ecosystem=maven&affects=…`) for the key packaged libraries at their current versions: tomcat-embed-core 10.1.61, jackson-databind 2.21.8, postgresql 42.7.14, jjwt-api 0.12.7, spring-boot 3.5.16 → **no advisories**; spring-webmvc 6.2.19 → only the two known criticals (GHSA-j9f9-w8pj-32f8, GHSA-pc63-qcmh-9cmg) that are fixed solely in Spring Framework 7 (Spring Boot 4) and are unreachable in UpTrack's pure-JSON REST app (no XsltView, no SSE view fragments) — deferred as before, documented in the S02 report.
- No Maven tests run (no backend file changed; last full run 90/90 in S02).

## 5. Verification results (`frontend-react/`, after remediation)

| Command | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test -- --run` | **556/556 passed**, 40 files, 5.67 s (identical count to M14 baseline) |
| `npm run build` | PASS, exit 0; only the pre-existing >500 kB chunk warning |
| `npx playwright test --project=msedge e2e/smoke.spec.ts` | **3/3 passed** (run although only a dev dependency changed, as extra assurance) |
| `npm audit --json` | **13 findings: 0 critical, 0 high, 13 moderate, 0 low** (was 16: 2C/14M) — all remaining are the dev-only eslint/typescript-eslint/minimatch chain |
| `npm audit --omit=dev --json` | **0** (production tree clean, unchanged) |
| Lockfile production-package diff vs HEAD | **0 production packages changed** |
| Backend `./mvnw test` | NOT RUN — no backend change (last recorded 90/90 in S02) |
| Full four-browser Playwright suite | NOT RUN — out of scope per testing policy; only a devDependency changed and smoke passed |

GitHub Dependabot will mark alerts #180–#185 as fixed on its next re-scan of the branch after push (alert state updates asynchronously server-side; local prediction from patched-version ranges: all 6 `frontend-react` open alerts resolved — vitest 4.1.12 ≥ 4.1.11, @vitest/mocker 4.1.12 ≥ 4.1.12, tinypool removed ≥ 2.1.2; #185 minimatch remains open as deferred; #179 remains in retired `frontend/`).

## 6. Remaining risks / deferred upgrades

1. **minimatch < 11.0.1 (medium, dev-only)** in both frontends — fix requires minimatch 11, incompatible with `@typescript-eslint/typescript-estree@8` (`^10.2.2`) and glob 13 pins; needs an eslint 10 / typescript-eslint 9 major decision. EPSS 0.29%, not shipped, dev/CI-only exposure via crafted glob patterns.
2. **13 moderate dev-only npm findings** in `frontend-react/` (eslint 9.x family + minimatch chain) — same root cause as (1).
3. **16 moderate dev-only findings in retired `frontend/`** (Angular CLI pacote stack) — documented in S03; retires with the Angular app.
4. **2 critical spring-webmvc advisories** fixable only via Spring Boot 4 / Spring Framework 7 — major migration, deferred post-cutover; unreachable in current code.
5. **Open Dependabot version-update branches** (vite 8.3.5, lucide-react 1.65.0, @hookform/resolvers 6.0.2, jjwt 0.13.0) — not security-driven; owner may merge or close at discretion.
6. GitHub alert counts update asynchronously after push; treat local predictions as predictions until re-scanned.

## 7. Future recommendations

- Owner decision (post-cutover, separate milestone): eslint 10 / typescript-eslint 9 (or targeted overrides) to clear the minimatch + eslint moderate dev findings; Spring Boot 4 evaluation for the two spring-webmvc criticals.
- Consider Maven dependency-submission / OSV-Scanner so transitive Java libraries appear in GitHub Dependabot (backend currently invisible there).
- Re-run `gh api .../dependabot/alerts` after merge/push to confirm 7 open → 1 open (frontend/ only).

## 8. Git attribution

Local commits on `fix/s04-dependency-security` use the repository owner identity `alexc83 <alexc83@users.noreply.github.com>`; `.githooks` attribution hooks active; no AI author/committer attribution or AI trailers. No push, no merge, no branch deletion, no history rewrite.
