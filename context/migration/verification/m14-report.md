# M14 verification report — React cutover & Angular retirement

Status: **IMPLEMENTED — targeted checks PASS; awaiting owner acceptance** (not merged/pushed)
Agent / model / session: Mistral Vibe CLI, autonomous M14 session
Date / branch / commit: 2026-11-03 / `feature/react-cutover` (created from `main` = `origin/main` = `3351209bccce1b9b76ed47c1563fe7f8e48fe9fb`, ahead/behind 0/0 verified via `git fetch` + `git rev-list --left-right --count HEAD...origin/main` before branching) / commits on the branch listed in §8
Spec version / approved changes: `specs/m14-cutover-and-documentation.md` was a DRAFT outline; executed per the owner's M14 brief of 2026-11-03 (branch `feature/react-cutover`, local commits allowed, no push/merge/deploy). Prerequisite verified: M13 merged on synchronized `main` (`a45a6a1`, `83cfeba`, `3351209`).

## 1. What was cut over

- **Canonical frontend is now `frontend-react/` (React 19 + Vite 7 + Tailwind 4 + Flowbite React)** in all developer-facing documentation: root `README.MD` (local dev now `cd frontend-react && npm ci && npm run dev` → `http://localhost:5173`; build `npm run build` → `dist/`; tests `npm test` / `npx playwright test`; tech stack, project structure, and seed/CORS notes corrected, including MySQL→PostgreSQL doc fixes), `START-HERE.md` starting commands, `context/project-overview.md`, `context/coding-standards.md` and `context/ai-interaction.md` (M14 notes; Angular sections retained as legacy-reference text), `context/current-feature.md` header, `frontend-react/README.md` (canonical-frontend banner + env section).
- **Environment examples:** new `frontend-react/.env.example` documenting `VITE_API_BASE_URL=/api` (default, same-origin) and `VITE_PROXY_TARGET=http://localhost:8080` (dev `/api` proxy target), matching `vite.config.ts` and `src/core/api/api-config.ts`. Verified not git-ignored (`git check-ignore` exit 1). Backend env example `scripts/dev-demo/env.example` was already accurate (PostgreSQL, wildcard local origin patterns, notes React 5173 vs Angular 4200).
- **Angular retirement decision:** `frontend/` is **preserved untouched** as a historical reference — the M14 spec allows removal only on explicit separate approval, which was not given, and the owner brief says not to delete it. No file under `frontend/` was modified. It is now described in docs as "historical reference only; not built by any supported command". No Angular-specific automation existed to remove (see §3).
- **Backend untouched:** no backend code, config, schema or dependency change. The Vite dev proxy remains the CORS solution (M02 decision); the backend CORS default (`localhost:4200`) is documented in the README as not applying to the standard dev flow, with `ALLOWED_ORIGIN_PATTERNS` documented for cross-origin setups. Port 8080 was not used or interfered with.

## 2. CI/CD and Dependabot

- **GitHub Actions:** the repository has **no Actions workflows** (`.github/` contains only `dependabot.yml`), so there was no frontend CI to repoint or retire. Verified by `find .github -type f`.
- **Dependabot** (`.github/dependabot.yml`): already scoped to `/frontend-react` (npm, weekly) and `/backend` (maven, weekly); no `/frontend` entry exists, so Angular automation was already retired. Validated the file still parses and contains exactly those two directories. Open Dependabot branches (including the legacy `dependabot/npm_and_yarn/frontend/...` branch) were left untouched per branch-preservation policy.
- **Reproducible installs:** `frontend-react/package-lock.json` is committed; `npm ci` is the documented install command. No lockfile or dependency change in M14. `npm audit --omit=dev` remains 0 (M13 §7; no dependency changed since).
- Branch protection / security settings: not touched (out of scope; no API calls made).

## 3. Configuration and production safety review

- API base URL: `VITE_API_BASE_URL` default `/api` (`src/core/api/api-config.ts`); dev proxy `/api` → `VITE_PROXY_TARGET` || `http://localhost:8080` (`vite.config.ts`). Accurate in docs and `.env.example`.
- CORS: same-origin via proxy in dev; cross-origin requires backend `ALLOWED_ORIGIN_PATTERNS` — documented in README. No backend change.
- React Router deep-link fallback: documented in README build notes — any static host must serve `index.html` for all client routes (`/dashboard`, `/credentials/:id/ce-report`, etc.).
- Static assets: `public/landing/*.png` bundled by Vite into `dist/`; confirmed present in the production build output listing.
- Dev-only `/preview` route: `import.meta.env.DEV`-gated in `src/app/router.tsx`; production build verified to exclude it (§5 row 4: no `shell-placeholder` chunk in `dist/assets`, `grep -r "Shared UI preview" dist` = 0).
- Secrets: no secrets added or exposed; `.env.example` contains placeholders/defaults only; `backend/.env.local` and `.env*.local` remain git-ignored.
- No deployment, DNS, hosting or production-data action performed; hosted backend remains suspended.

## 4. Commands and results (exact, from `frontend-react/` unless noted)

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 2 | `npm run lint` | exit 0 |
| 3 | `npm run test -- --run` | **556/556 passed**, 40 files, 5.58 s |
| 4 | `npm run build` | exit 0, 1.25 s; only the pre-existing >500 kB chunk warning; `dist/assets` contains **no** `shell-placeholder`/preview chunk and `grep -r "Shared UI preview" dist` = 0 (remaining "preview" strings are landing-page marketing images and the account-menu fallback label) |
| 5 | `npx playwright test --project=msedge e2e/smoke.spec.ts e2e/auth.spec.ts e2e/app-shell.spec.ts e2e/landing.spec.ts` | **57/57 passed** (27.6 s) — routing/wildcard redirect, auth flows incl. `returnTo` deep links, shell, landing |
| 6 | `npx playwright test --project=msedge e2e/credentials.spec.ts e2e/ce-report.spec.ts e2e/dashboard.spec.ts` | **44/44 passed** (22.8 s) — `?credentialId=` deep links, report route, dashboard guards |
| 7 | repo-level: `git fetch origin`; `git rev-list --left-right --count HEAD...origin/main` on main before branching | 0/0 — prerequisite synchronized |
| 8 | `git check-ignore frontend-react/.env.example` | exit 1 (not ignored — committable) |

Not run (owner scope per `context/testing-workflow.md`): full Playwright suite across all browsers (`npm run e2e` / `verify:local`), visual-edge goldens comparison, live-backend acceptance, backend `./mvnw test` (no backend change; last recorded 90/90 in S02), Cloudinary upload success, real Safari/VoiceOver.

## 5. Acceptance criteria evaluation

1. React operates independently and docs are accurate; Angular remains unless expressly authorized for deletion — **MET**: docs now point exclusively to `frontend-react/`; `.env.example` matches actual config; Angular preserved, removal explicitly not authorized.
2. All relevant tests executed or marked NOT RUN with reasons — **MET** (§4; NOT RUN list above).
3. Browser/runtime evidence recorded — **MET** (§4 rows 5–6, Edge/macOS).
4. Completion report and tracker updated before commit approval — **MET** (this report; `migration-status.md`, `agent-handoff.md`, M14 spec updated on the branch).

## 6. Known limitations carried forward from M13 (unchanged; see `m13-report.md` §9–§10)

- Cloudinary certificate upload success / asset deletion: NOT RUN against a real account (owner condition 1).
- Backend P3 items F-01–F-06 (500-on-unparseable-enum, upload type-or-extension validation, Cloudinary-before-DB ordering, 400-vs-409 duplicate registration, 404 drawer retry copy, stale "migration preview" fallback copy) — accepted as post-cutover follow-ups.
- JWT risks: token in `localStorage`, no server-side revocation, pre-password-change tokens remain valid — documented, accepted until after cutover.
- Dev-only vitest advisories (16 findings, all dev/test tooling; production audit 0).
- Deployment of the merged S01–S03 backend fixes to the hosted (suspended) backend remains a separate owner decision; nothing was deployed.

## 7. Manual steps intentionally left for the owner

- Production deployment of the React build (host with SPA fallback to `index.html`, build-time `VITE_API_BASE_URL`, backend `ALLOWED_ORIGIN_PATTERNS` for the hosting origin) — not authorized, not performed.
- Real-Cloudinary upload verification in a non-production environment (or explicit acceptance of the gap).
- Owner merge/push of `feature/react-cutover` per the canonical branch policy (fast-forward only), then merged-branch cleanup.
- Optional future removal of the legacy `frontend/` directory — requires separate explicit approval.
- Full regression (`npm run verify:local`, all-browser Playwright, `./mvnw test`) remains the owner's run.

## 8. Files changed

Docs/config only — no application code, no backend, no dependency/lockfile change:

- `README.MD` — React canonical dev/build/test commands, port 5173, PostgreSQL corrections, project structure, env/CORS/SPA-fallback notes, legacy-Angular note
- `frontend-react/.env.example` — **new**: `VITE_API_BASE_URL`, `VITE_PROXY_TARGET` with defaults and safety notes
- `frontend-react/README.md` — canonical-frontend banner + environment section
- `START-HERE.md` — starting commands point to `frontend-react/`
- `context/project-overview.md`, `context/coding-standards.md`, `context/ai-interaction.md`, `context/current-feature.md` — M14 cutover notes / corrected active-frontend references
- `context/migration/architecture.md` — canonical-frontend decision + M14 addendum
- `context/migration/master-plan.md` — status + M14 milestone line
- `context/migration/migration-status.md` — M13 row marked Merged; M14 row In progress on `feature/react-cutover`; latest-acceptance note
- `context/migration/agent-handoff.md` — current M14 entry
- `context/migration/specs/m14-cutover-and-documentation.md` — status/branch/scope updated to the executed owner brief
- `context/migration/verification/m14-report.md` — this report

Untracked and preserved: `conversation-2026-11-02-064616.txt` (conversation transcript, left untouched).

## 9. Git attribution and signing

All commits on `feature/react-cutover` use the repository owner identity `alexc83 <alexc83@users.noreply.github.com>` (repo `user.name`/`user.email`), with the configured 1Password SSH commit signing (`commit.gpgsign=true`, `gpg.format=ssh`) and the `.githooks` pre-commit/commit-msg attribution hooks active (`core.hooksPath=.githooks`). No AI author/committer attribution and no AI trailers (`Co-Authored-By`, `Generated by`, `Signed-off-by`) were added. No history rewrite, no force-push, no push, no merge, no branch deletion.

## 10. Review and approvals

- Approval to commit (local, on `feature/react-cutover`): granted by the M14 brief.
- Approval to push / merge / delete branch / deploy: **not granted — owner decision.**
