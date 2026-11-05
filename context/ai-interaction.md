# AI Interaction Guidelines

## Communication

- Be concise and direct.
- Explain non-obvious decisions briefly.
- Ask before large refactors or architectural changes.
- Don't add features that are not in the project spec.
- Never delete files without clarification.
- When requested, explain implementation decisions clearly at a beginner-to-intermediate level.
- Prefer short explanations during implementation unless a deeper explanation is requested.

## Workflow

Follow [AGENTS.md](../AGENTS.md) and the [issue-first development workflow](development-workflow.md). GitHub issues and PRs hold active scope, decisions, acceptance and progress. `current-feature.md` is historical evidence. Preserve all owner authorization and verification requirements; existing explicit authorization may cover a named sequence.

## Branching

- Create a new branch for every feature or fix.
- Use branch names like:
  - `feature/[feature-name]`
  - `fix/[fix-name]`
  - `chore/[task-name]`
- Ask before deleting the branch after merge.

## Commits

- Ask before committing. Do not auto-commit.
- Use conventional commit messages such as `feat:`, `fix:`, `chore:`, `refactor:`, and `docs:`.
- Keep commits focused on a single feature, fix, or task.
- Never include phrases like `Generated with Claude` in commit messages.

## When Stuck

- If something is not working after 2-3 grounded attempts, stop and explain the issue.
- Do not keep trying random fixes.
- Ask for clarification if requirements are unclear.
- If there are multiple reasonable implementation paths, briefly explain the tradeoffs before continuing.

## Code Changes

- Make the minimal changes needed to accomplish the task.
- Do not refactor unrelated code unless asked.
- Do not add “nice to have” features unless they are explicitly requested.
- Preserve existing patterns in the codebase unless there is a clear reason to improve them.
- Prefer clear, maintainable solutions over clever or overly abstract ones.
- Keep implementations easy to understand and consistent with the rest of the project.

## Architecture Awareness

- Respect frontend and backend boundaries.
- Do not move backend business logic into the Angular frontend.
- Do not tightly couple Angular UI code to backend implementation details.
- For full-stack work, verify whether the frontend, backend, or both layers are affected before making changes.
- Follow the existing architecture and folder structure unless a change is explicitly requested.

## Learning Support

- Prioritize implementation clarity over cleverness.
- When requested, explain code decisions, framework concepts, and tradeoffs in simple terms.
- Favor patterns that align with the existing architecture and are easy to understand later.
- Prefer straightforward solutions that also support learning and long-term maintainability.

## Code Review

Review AI-generated code periodically, especially for:

- Security:
  - auth checks
  - input validation
  - secrets handling
  - authorization rules
- Performance:
  - unnecessary re-renders
  - inefficient queries
  - over-fetching
  - avoidable duplicate work
- Logic:
  - edge cases
  - null/empty states
  - invalid input
  - state consistency
- Patterns:
  - consistency with the existing codebase
  - appropriate layering
  - separation of concerns

## Build Verification

Use the relevant commands based on what changed.

### Frontend (`/frontend-react` — canonical since the M14 cutover)

- `npm run dev` - start Vite dev server (http://localhost:5173, `/api` proxied to the backend)
- `npm run build` - run production build
- `npm run test` - run Vitest tests
- `npm run typecheck` / `npm run lint` - static checks
- `npx playwright test` - browser e2e (see `testing-workflow.md`)

The legacy Angular app in `/frontend` is a historical reference only; do not use it for new work.

### Backend (`/backend`)

- `./mvnw spring-boot:run` - run Spring Boot app
- `./mvnw clean package` - build backend
- `./mvnw test` - run backend tests

If only one side of the application changes, run the relevant commands for that side. If the feature affects both frontend and backend, verify both.
