# START HERE — UpTrack migration kit

`START-HERE.md` is a **new guide provided by this kit**, not a file from the original repository.

This ZIP is a **documentation-only overlay**, not a refactored app. Apply files to the root of a cloned UpTrack repository; see conflict precautions below.

## Installation
1. Clone or open your existing UpTrack Git repository; ensure clean working tree: `git status`. Back up the existing `AGENTS.md` and `CLAUDE.md` (and ideally create a checkpoint branch).
2. Extract this ZIP into a temporary folder. Review differences in the three replacement instruction files; do not blindly overwrite user customizations.
3. Copy `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/uptrack-migration.md`, and `context/migration/` into the repository root. `START-HERE.md` can also be copied if desired. Existing `frontend/`, `backend/`, `context/features/`, and `context/screenshots/` remain untouched.
4. Run `git diff -- AGENTS.md CLAUDE.md GEMINI.md` and check `git status`. No migration code has been written yet.
5. Start one agent at the repository root and paste the shared kickoff prompt below. Have it work on **M01 read-only audit** first.
6. Review the expanded M01 spec and baseline report. Explicitly approve a branch and work before any implementation.
7. Continue M02 architecture approval, then M03 scaffolding, and subsequent milestones one at a time. At each step insist on a verification report, approval for commit/merge/push, and a tracker update.
8. To switch agents, give the incoming agent the handoff prompt below and direct it to `context/migration/agent-handoff.md`. It must not trust the outgoing agent's chat summary without checking actual files and git.

## Shared kickoff prompt (paste into Claude Code, Codex, Antigravity or Mistral Vibe)
```text
You are working in the UpTrack repository. Read AGENTS.md and the context/migration master plan, migration status, architecture, feature inventory and agent-handoff files. Also inspect the legacy context guidelines. Treat AGENTS.md as the cross-agent source of truth. Start with milestone M01 only. Perform a read-only audit of the real Angular frontend and Spring Boot API/configuration, expand the M01 spec and baseline matrix, and report inaccuracies or unavailable tests. Do not modify application source, create branches, install dependencies, commit, push, merge, delete or deploy. Stop and ask for approval when the M01 spec is ready.
```

## Reusable per-milestone prompt
```text
Read AGENTS.md, migration-status.md, architecture.md, agent-handoff.md and the active Mxx spec. Check git status and current branch. If the spec is DRAFT, inspect the source and present a READY spec for my approval; do not code. If READY and I explicitly authorize implementation, make only the scoped changes on the approved branch, run tests, write the Mxx verification report and stop before committing. Do not push, merge or delete branches without separately asking.
```

## Switching agents / clean handoff
```text
This repository's state, not the previous AI's chat, is authoritative. First read AGENTS.md, context/migration/agent-handoff.md, migration-status.md and the active spec; verify actual git state and test evidence. Summarize what is complete, incomplete, unverified, and the next approval required. Do not make edits until you have identified current scope and approval.
```

## Platform notes
- Claude Code: `CLAUDE.md` redirects to shared `AGENTS.md`; verify agent actually reads both.
- Codex: root `AGENTS.md` is the native supported instruction entry point.
- Gemini / Antigravity: `GEMINI.md` routes to shared instructions; `.agents/rules/uptrack-migration.md` is a workspace rule; if your version does not activate it automatically, add or enable it as Always On in workspace Rules.
- Mistral Vibe: explicitly paste the kickoff prompt referencing `AGENTS.md` at session start; do not assume automatic instruction discovery across versions.
- Always verify what instructions the agent loaded; platform products and discovery conventions may change.

## Useful starting commands
```bash
git status
# active React frontend (canonical since the M14 cutover)
cd frontend-react && npm ci && npm run typecheck && npm run lint && npm run test && npm run build
# in existing backend; requires local env vars / DB
cd ../backend && ./mvnw test
```
The legacy Angular app in `frontend/` is preserved as a historical reference only and is no longer part of any supported workflow. Historical M01-baseline note: the original audit used `cd frontend && npm start && npm test`; those commands applied to the legacy Angular client only.

## Useful implementation docs
- Flowbite React Vite: https://flowbite-react.com/docs/guides/vite
- Codex AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Antigravity rules: https://antigravity.google/docs/ide/rules/
