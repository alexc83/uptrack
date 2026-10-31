# UpTrack — portable coding-agent instructions

**This is the authoritative shared instruction file for Claude Code, OpenAI Codex, Google Antigravity and Mistral Vibe.** Client adapters may direct agents here but must not redefine the rules.

## First actions (every new task/session)
1. Read `AGENTS.md` and `context/migration/master-plan.md`, `context/migration/migration-status.md`, `context/migration/architecture.md`, `context/migration/feature-inventory.md`.
2. Read `context/project-overview.md`, `context/coding-standards.md`, `context/ai-interaction.md`, `context/current-feature.md` when those original repo files are present.
3. Determine active milestone; read its spec and related actual Angular/backend code. State the active spec status and current git branch.
4. If no spec is READY, do **read-only** inspection and prepare that milestone's detailed spec; stop for user approval before writing application code.

## Product / technical reality
Angular 21 + PrimeNG in `frontend/`; new React + strict TS + Vite + Flowbite React + Tailwind CSS 4 in `frontend-react/` after M03. Java 21 / Spring Boot 3.5.x in `backend/`. Active backend config uses **PostgreSQL**, even though some legacy docs refer to MySQL; treat source/config as authoritative for observed setup.

## Scope and safety
- Preserve every existing user-visible workflow; do not expand product scope.
- Keep `frontend/` read-only, do not remove it. Keep `backend/` and API/DB contracts unchanged unless separately approved.
- Do not expose credentials, secret values, real health records, seed passwords or auth tokens in logs or commits.
- Prefer Flowbite React components, Tailwind layout, minimal custom CSS; React Router, TanStack Query, native fetch, React Hook Form/Zod. No extra UI/state library without approval.
- Never silently alter acceptance criteria, skip error/empty/mobile/auth states or claim tests ran without evidence.

## Milestone lifecycle
1. Read and refine DRAFT spec after code audit.
2. Present READY spec to human and request approval. Do not start coding without approval.
3. Check git status; create approved milestone branch.
4. Implement only approved scope, write tests.
5. Run relevant typecheck/lint/test/build and functional/browser parity checks; record output, failures and NOT RUN limitations.
6. Fill `context/migration/verification/mxx-report.md`; update tracker and original current-feature record as appropriate.
7. Explain changed files, evidence, deviations and blockers. Request permission before **each** commit, merge and branch deletion. Never push without user authorization.
8. Advance to next milestone only after merge and tracker update.

## Stops / escalation
If tests cannot run, report blocker and do not claim parity. If 2–3 grounded fixes fail, stop rather than random retries. Ask before architecture changes, destructive operations, schema updates, dependency additions outside spec, modifying git history, deployments, and branch deletion.

## Verification
For React milestones after M03: `npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build` (from `frontend-react/`, after scripts are set up). For backend-impacting changes: `./mvnw test` and appropriate package build from `backend/`. Verify relevant browser scenarios with test accounts and screenshots when accessible. Never claim a command exists until the scaffold defines it.

## Cross-agent handoff
Make all decisions durable in specs, tracker and verification files; do not depend on chat memory or agent-specific plans. At handoff report active step, branch, spec status, exact tests run, known issues, next action.
