# S04.1 verification report — Dependabot PR evaluation and dependency upgrades

Status: **IMPLEMENTED — targeted checks PASS; commits on `chore/s04-1-dependabot-review`; PR opened for owner review; no merge, no Dependabot PR closures**
Agent / session: Mistral Vibe / S04.1 session
Date / branch / base: 2026-11-03 / `chore/s04-1-dependabot-review` / created from `main` = `origin/main` = `fe2b881` (S04 commit verified merged: `git merge-base --is-ancestor fe2b881 origin/main` = YES; `git rev-list --left-right --count main...origin/main` = 0/0 before branching; untracked `conversation-2026-11-02-064616.txt` preserved untouched)
Scope: S04.1 brief — evaluate the six open Dependabot PRs (#4–#9), implement justified upgrades only, run focused verification, document decisions. No `npm audit fix --force`, no overrides, no alert dismissals, no merge, no push of main, no Dependabot PR closures.

## 1. Baseline

- `main` = `origin/main` = `fe2b881` (S04 vitest 4.1.12 fix already merged). No dependency-baseline coordination problem; S04's changes (vitest 4.1.12, no tinypool) are intact in the branch.
- Backend post-S02 state confirmed: Spring Boot 3.5.16 parent, jjwt 0.12.7 (api/impl/jackson).
- Frontend-react: vite 7.3.7, vitest 4.1.12, @hookform/resolvers 5.9.2, lucide-react 0.475.0, react-hook-form 7.91.0 (locked), zod 4.6.7, @vitejs/plugin-react 5.2.0, @tailwindcss/vite 4.3.3. Node v24.22.0, npm 11.19.1, Java 27 (Temurin) for the backend build (project targets Java 21).
- Advisory check (GitHub Advisory DB + OSV, 2026-11-03): **0 advisories** affect jjwt-api/impl/jackson 0.12.7, vite 7.3.7, lucide-react 0.475.0, @hookform/resolvers 5.9.2; 0 advisories against jjwt 0.13.0. All six PRs are **routine version updates, not security fixes**; none is CISA-KEV-listed. Newer majors are therefore not treated as urgent.

## 2. PR-by-PR evaluation and decisions

| PR | Change (actual branch diff) | Classification | Decision |
|---|---|---|---|
| #4 | jjwt-jackson 0.12.7 → 0.13.0 (pom only) | Routine minor | **ACCEPT** (with #5, #7) |
| #5 | jjwt-api 0.12.7 → 0.13.0 (pom only) | Routine minor | **ACCEPT** (with #4, #7) |
| #7 | jjwt-impl 0.12.7 → 0.13.0 (pom only) | Routine minor | **ACCEPT** (with #4, #5) |
| #6 | @hookform/resolvers ^5.9.2 → ^7.0.0 (branch force-updated; brief said 6.0.2) | Routine major | **ACCEPT** at 7.0.2 (see §3) |
| #8 | lucide-react ^0.475.0 → ^1.66.0 (branch force-updated from 1.65.0) | Routine major | **DEFER** |
| #9 | vite ^7.3.7 → ^8.3.5 | Routine major | **DEFER** |

### JJWT 0.12.7 → 0.13.0 (PRs #4/#5/#7) — ACCEPT, one coordinated bump

- JJWT CHANGELOG (jwtk/jjwt @ 0.13.0): "This 0.13.0 minor release has only one change" — a previously private `JacksonDeserializer(ObjectMapper, Map)` constructor made public (issue #914). **No breaking changes** for the APIs UpTrack uses: `Jwts.builder().subject/issuedAt/expiration/claim/signWith(SecretKey).compact()`, `Jwts.parser().verifyWith(SecretKey).build().parseSignedClaims(...).getPayload()`, `Keys.hmacShaKeyFor`, and the exception types caught in `JwtAuthenticationFilter` are all unchanged 0.12-line APIs. (The big JJWT breaks were 0.11→0.12, already absorbed.) The "last Java 7 branch" note is irrelevant (backend runs Java 21/27). The three artifacts must move together, so all three PRs are satisfied by one pom change.
- No code changes were needed; no JWT validation, expiry, or secret handling was weakened.

### @hookform/resolvers (PR #6) — ACCEPT at 7.0.2

- Live PR diff is `^5.9.2 → ^7.0.0` (branch `…resolvers-6.0.2` was force-updated to 7.0.0 after the brief was written; latest is 7.0.2). Release notes: v6.0.0 breaking change affects only the **effect-ts** resolver (Effect v3 dropped); v7.0.0 breaking change affects only the **typebox** resolver (typebox 1.x). UpTrack uses only `zodResolver` from `@hookform/resolvers/zod`.
- Peer compatibility verified from registry metadata: resolvers 6.x/7.x require `react-hook-form ^7.55.0` (locked 7.91.0 ✓) and optional `zod ^3.25.0 || ^4.0.0` (locked 4.6.7 ✓); all other schema peers are `peerDependenciesMeta.optional` (incl. typebox) so no ERESOLVE. Plain `npm install` succeeded with no `--force`/`--legacy-peer-deps`.
- Installed `^7.0.2` → locked 7.0.2. Lockfile diff touches only the resolvers entry (adds dep `@standard-schema/utils ^0.3.0`); zero other packages changed.

### lucide-react 0.475.0 → 1.66.0 (PR #8) — DEFER

- Compatible on paper: react peer `^16.5.1–^19` ✓ (react 19); all 26 icons imported in `src/` (ArrowLeft, ArrowRight, Bell, Bookmark, BookOpen, Check, ChevronLeft/Right, CircleCheck, CircleX, ClipboardList, Clock, File, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, Moon, Plus, Printer, Settings, Shield, Sun, TriangleAlert, X) plus the `LucideIcon` type are declared exports in the 1.66.0 type bundle (verified against the published tarball). No security advisory on 0.475.0; production audit is 0.
- Deferred anyway: a 0.x→1.x major of the shipped icon library has no security or functional driver, and any rendering delta (size/stroke/paths) would only be caught by the owner-run Edge/macOS visual golden suite, which agents must not regenerate. Better handled in a dedicated UI-regression milestone with owner-run visuals. PR #8 left open.

### vite 7.3.7 → 8.3.5 (PR #9) — DEFER

- Vite 8 is the rolldown-1.0-based major ("Vite 7 → 8 tooling changes"): bundler, optimizer, and dev-server internals all change. Declared peers happen to allow it today (@vitejs/plugin-react 5.2.0 peer includes `^8.0.0`, @tailwindcss/vite 4.3.3 includes `^8`, vitest 4.1.12 peer includes `^8.0.0`, engines `^20.19 || >=22.12` satisfied by Node 24), but that only means installable, not low-risk: dev proxy (`server.proxy /api`), SPA fallback, `loadEnv` behavior, production build output, and the Playwright `webServer` (`npm run dev`) would all need the full four-browser + visual regression the owner runs.
- No advisory affects vite 7.3.7 and vite is a devDependency (not shipped; production audit 0). S04 just stabilized vitest 4.1.12 on vite 7 days ago; swapping the bundler major immediately before the S05 security audit adds risk with zero security benefit. Deferred to a dedicated tooling milestone. PR #9 left open.

## 3. Changes made (ACCEPT only)

- `backend/pom.xml`: jjwt-api / jjwt-impl / jjwt-jackson `0.12.7 → 0.13.0` (three lines; coordinated single bump).
- `frontend-react/package.json`: `@hookform/resolvers` `^5.9.2 → ^7.0.2`; `frontend-react/package-lock.json` regenerated by plain `npm install` (resolvers 7.0.2 + `@standard-schema/utils`; no other package entries changed; no production-tree surprise — resolvers is a direct production dep either way, and audit stays 0 in prod).
- No source, config, or test changes. lucide-react and vite untouched (DEFER).

## 4. Verification results

Backend (JJWT 0.13.0), from `backend/`:

| Check | Result |
|---|---|
| `./mvnw test` (full suite) | **90/90 passed, 0 failures/errors, BUILD SUCCESS** — includes `JwtAuthenticationFilterTest` (valid token authenticates; malformed token → unauthenticated + chain continues; weak/ misconfigured key still a server error), `AuthControllerIntegrationTest` (register/login/current-user, invalid credentials rejected, protected endpoints 401 without token), and `CrossUserAuthorizationIntegrationTest` 47/47 covering the required token matrix: **expired, tampered-signature, wrong-signing-key, unsigned alg=none, garbage** tokens on protected and public endpoints plus cross-user authorization (403/404 isolation, owner access intact) |
| `./mvnw package -DskipTests` | BUILD SUCCESS, executable jar repackaged |

Frontend-react (@hookform/resolvers 7.0.2), from `frontend-react/`:

| Check | Result |
|---|---|
| `npm run typecheck` | PASS exit 0 |
| `npm run lint` | PASS exit 0 |
| `npm run test -- --run` | **556/556 passed**, 40 files (identical to S04/M14 baseline) |
| Focused form run (`zod-resolver` gate + auth + credentials + ce-records + settings) | **144/144 passed** across 10 files — credential, CE-record, login/register and settings validation behavior unchanged under resolvers 7 + zod 4 |
| `npm run build` | PASS exit 0; only the pre-existing >500 kB chunk warning |
| `npx playwright test --project=msedge e2e/smoke.spec.ts` | **3/3 passed** |
| Focused Playwright (msedge): `e2e/auth.spec.ts`, `credentials`, `ce-records`, `settings` | **39/39 passed** (includes invalid-form-sends-nothing validation flows) |
| `npm audit` (full) | **13 moderate, 0 critical/high/low** — unchanged from S04 (dev-only eslint/minimatch chain) |
| `npm audit --omit=dev` (production) | **0** — unchanged |

## 5. Not run / pending owner

- Full four-browser Playwright suite and Edge/macOS visual goldens: NOT RUN (owner-run per testing policy; deferred PRs #8/#9 are exactly the ones that would need them). Focused msedge runs covered smoke 3/3 and auth/credentials/CE-records/settings 39/39.
- Live-backend acceptance against PostgreSQL: NOT RUN (hosted backend suspended by owner; MockMvc/H2 integration evidence used instead).
- GitHub Dependabot alert re-scan after merge (async server-side).
- Closing Dependabot PRs #4–#7 (superseded) — only after owner merges this branch and explicitly authorizes; PRs #8/#9 stay open (deferred).

## 6. Remaining risks / postponed upgrades

1. PR #8 lucide-react 1.66.0 and PR #9 vite 8.3.5 remain open and deferred (no security driver; need owner-run visual/full-browser validation; vite 8 is a rolldown major). Recommend a dedicated tooling/UI milestone after S05.
2. The 13 moderate dev-only npm findings (eslint 9/typescript-eslint 8/minimatch 10 chain) remain, as documented in S04 — fix requires eslint 10 / typescript-eslint 9 major decision.
3. The 2 known spring-webmvc criticals (fixable only on Spring Framework 7 / Boot 4) remain deferred as in S02.
4. PR #6's branch has since moved to 7.0.0 while the brief referenced 6.0.2; 7.0.2 was chosen because both majors break only unused resolvers and peers are satisfied — noted for the record.

## 7. GitHub PR handling

- Consolidated branch `chore/s04-1-dependabot-review` pushed once; a single PR to `main` was opened for owner review. Not merged.
- Original Dependabot PRs #4–#9 left open. After the owner merges the consolidated PR, #4/#5/#6/#7 are superseded and can be closed with owner authorization; #8/#9 stay open (deferred).

## 8. Favicon fix (S04.1 add-on, isolated from the dependency upgrades)

- The React `index.html` still pointed at `/favicon.ico` (the retired Angular app's icon in `frontend/public/favicon.ico`; no such file exists in `frontend-react/public/`). Replaced with a new standalone `frontend-react/public/favicon.svg` that replicates the exact top-navigation brand from `src/shared/layout/sidebar-header.tsx`: lucide `Shield` (white, size 21, exact 0.475.0 path) centered in a 34×34 `rounded-lg` square of `--ut-primary` (#185fa5 light / #378add dark via `prefers-color-scheme`). `index.html` now has `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`; no `favicon.ico` references remain in `frontend-react`. The retired Angular `frontend/` was not touched.
- Verified: `npm run build` copies `dist/favicon.svg` and emits the new link in `dist/index.html`; dev server returns 200 `image/svg+xml` for `/favicon.svg`; real-browser check (msedge) confirmed `link[rel=icon]` → `/favicon.svg` loading the Shield SVG; typecheck/lint PASS, unit 556/556, msedge smoke 3/3.

## 9. Git attribution

Commits on `chore/s04-1-dependabot-review` use the repository owner identity `alexc83 <alexc83@users.noreply.github.com>`; `.githooks` attribution hooks active; no AI author/committer attribution or AI trailers. No merge, no history rewrite, no main push.
