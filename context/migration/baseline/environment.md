# M01 baseline — environment

Date: 2026-10-31 · Branch: `chore/react-migration-planning` · HEAD: `9769237` (working tree has uncommitted migration-kit files)

Legend: **SOURCE** = read from code/config only. **RAN** = command actually executed, exit code recorded.

## Toolchain (RAN: version commands)
| Tool | Observed | Note |
|---|---|---|
| Node / npm | v24.22.0 / 11.19.1 | frontend `packageManager` is `npm@11.12.0` |
| Default Java | 27 | backend targets 21; JDK 21.0.13 installed, used via `JAVA_HOME=$(/usr/libexec/java_home -v 21)` |
| Maven | not on PATH | `./mvnw` (Maven 3.9.14 wrapper) used; downloads from Maven Central |
| Docker | not installed | no containerised DB |
| PostgreSQL | `psql` present (postgresql@18); server answers on `/tmp:5432` (`pg_isready`) | no database was opened or listed |
| Browser automation | `playwright-core` (scratchpad, outside repo) driving installed Microsoft Edge 156 (`channel: msedge`), headless | |

## Required backend environment variables (SOURCE: `application.yml`; values never read or recorded)
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `AUTH_JWT_SECRET` (>= 32 bytes for HS256), `AUTH_JWT_EXPIRATION_SECONDS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Optional: `SERVER_PORT` (8080), `ALLOWED_ORIGIN_PATTERNS` (defaults `http://localhost:4200,http://127.0.0.1:4200`). `backend/.env.local` is git-ignored and was not opened.

## Build / test commands (RAN)
| Command (cwd) | Exit | Result |
|---|---|---|
| `npm ci` (`frontend/`) | 0 | installed; 51 `npm audit` findings (2 low, 24 moderate, 22 high, 3 critical) — **not remediated**; 5 packages have un-approved install scripts (warning only) |
| `npm run build` (`frontend/`) | 0 | production build OK; 5 budget WARNINGS: initial bundle 661.86 kB (budget 500 kB); component styles over 8 kB in landing (9.13), ce-report (11.61), credentials (8.47), ce-records (13.52). Output `frontend/dist/frontend` (git-ignored) |
| `npm test -- --watch=false` (`frontend/`) | 0 | Vitest 4.1.0: 13 files, 38 tests passed |
| `./mvnw -B test` (`backend/`, JDK 21) | 0 | 39 tests, 0 failures/errors/skipped (H2 in-memory, Cloudinary mocked) |
| `./mvnw -B -q package -DskipTests` (`backend/`, JDK 21) | 0 | `target/backend-0.0.1-SNAPSHOT.jar` built (git-ignored) |

Backend test counts per class (RAN): BackendApplicationTests 1, AuthController 3, UserController 7, CredentialController 12, CERecordController 8, DashboardController 2, UploadController 6.

## Not available / not run
- Lint: no lint script or target exists in `frontend/`. NOT RUN (does not exist).
- E2E: no e2e target or framework. NOT RUN (does not exist).
- Runtime (browser + live backend + PostgreSQL): RAN; see `runtime-results-api.md` and `runtime-results-ui.md`.
- Cloudinary upload success path: NOT RUN (no safe credentials; placeholders only).
- Runtime baseline DB: `uptrack_migration_test` owned by limited role `uptrack_m01` (retained). Backend started with placeholder Cloudinary values and a random per-run JWT secret.
- Backend tests ran against H2 (MySQL mode), **not PostgreSQL**; Postgres-specific behaviour is unverified by tests.

## Side effects of baseline commands
`frontend/node_modules`, `frontend/dist`, `backend/target`, and `~/.m2` content were created; all inside git-ignored paths. `git status` after the commands showed only the pre-existing changes (AGENTS.md, CLAUDE.md, GEMINI.md, START-HERE.md, context/migration/).
