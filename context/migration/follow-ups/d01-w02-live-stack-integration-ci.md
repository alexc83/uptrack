> **PM01 tracking:** [GitHub issue #44](https://github.com/alexc83/uptrack/issues/44) is the canonical active tracker. This document preserves investigation and proposed options; it is not implementation authorization.

# D01-W02 — Isolated live React → Spring Boot → PostgreSQL integration tests in CI

Status: **OPEN — future engineering initiative. Not part of D01; not authorized.** Recorded 2026-11-04 during the D01 audit.

Gap: the per-PR Playwright suite (`frontend-react/e2e/`) mocks every `/api` call (default-deny). It verifies UI behaviour, not the real API contract, so DTO/field/status-code drift between `backend/` and `frontend-react/` is invisible to CI. The only end-to-end coverage is the M13 live suite (`playwright.live.config.ts`, `e2e-live/*.live.spec.ts`, `e2e-live/api-live.test.mjs`), which is run manually against a disposable loopback backend (default port 18081) and is pinned to the Edge channel.

Proposed separately authorized evaluation (no implementation implied):
1. A separate workflow (nightly + `workflow_dispatch`, optionally PR-label triggered) with a `postgres:17` service container and disposable inline credentials.
2. Build the backend JAR, start it on 18081 with a throwaway JWT secret generated in the job and placeholder Cloudinary values (no real uploads), wait for `/api/health`.
3. Run `api-live.test.mjs` and the live Playwright specs on bundled Chromium (requires adding a Chromium project or CI override to `playwright.live.config.ts`; the existing loopback/port-8080 guards must be preserved).
4. Upload reports/traces; never use repository secrets; `contents: read` only.
5. Decide whether contract checks (e.g. shared fixtures or schema snapshot tests) are cheaper than a full live stack.

Constraints: never target Neon, Render or any hosted backend; no real Cloudinary credentials. Related: [D01 spec](../specs/d01-ci-foundation.md) gap G7; history in [M09-W01](m09-w01-postgresql-crud-acceptance.md) and `../verification/m13-report.md`.
