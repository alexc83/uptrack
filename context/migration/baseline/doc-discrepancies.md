# M01 baseline — documentation vs source discrepancies

No documents were edited to resolve these. "Recommendation" is for the human to decide.

| ID | Document says | Source shows | Recommendation |
|---|---|---|---|
| D1 | README.MD, project-overview.md, coding-standards.md, backend-scaffold.md, seed-data-and-remove-mocks.md: MySQL | `application.yml`: `org.postgresql.Driver`; tests use H2 in MySQL mode | Source authoritative (AGENTS.md); correct docs in M14 |
| D2 | README/seed docs: seed users can log in | `test_data.sql` has no users; `test_data_v2.sql` stores plaintext passwords (BCrypt rejects), uses column `requiredcehours` (entity: `required_ce_hours`), and both use MySQL-only `UUID_TO_BIN`/`CURDATE`/`DATE_ADD` | No usable seed; create synthetic users via API |
| D3 | coding-standards.md: Flyway/Liquibase | none; `ddl-auto: update` | Note; do not change DB |
| D4 | master-plan.md: "plus `/app/*` redirects" | exactly `/app`, `/app/dashboard`, `/app/credentials`, `/app/ce-records`; no `/app/settings` | Define precisely in M02 contract |
| D5 | dashboard-ui-spec-2.md: recent activity shows 5 | frontend caps at 4 (`dashboard.mappers.ts:135`) | Parity target = code (4) unless changed by decision |
| D6 | dashboard-ui-spec-2.md: right panel "CE Progress", all credentials | panel is "CEs Still Needed", only credentials with required>0 and earned<required, "Due <date>" | Parity target = code |
| D7 | dashboard-ui-spec-2.md: expirations include expired items | backend returns only 0–90 days | Parity target = code |
| D8 | drawer-spec.md: footer "Export CE Summary"; CE drawer has Upload/Replace | actual: Add CE Record, Edit, **Delete**, **Open CE Report**; CE drawer: Edit, Delete, Remove Certificate (replace via edit dialog) | Parity target = code |
| D9 | ce-page-ui.md: title "Live CE Records"; card "Certificates Missing" | "CE Records"; "Missing Certificates"; page filters/paginates in memory over the full credentials payload | Parity target = code |
| D10 | landing-page-spec.md: light mode only; two footer lines; auth out of scope | dark-mode toggle (`uptrack-landing-theme`); single merged footer line; auth implemented | Parity target = code |
| D11 | credential-write-flows.md: `renewalCycleMonths`, `requiredCEHours` "if provided" | both required (FE and BE); renewal min 1, hours min 0 | Parity target = code/BE |
| D12 | frontend-api-foundation.md: nested `POST /credentials/{id}/ce-records` | `POST /ce-records` with `credentialId` in body | Use real endpoint |
| D13 | credential-crud.md / ce-record-crud.md: request DTOs include `userId` | no `userId`; owner from JWT | Use real DTOs |
| D14 | relationship-and-query-endpoints.md: queries scoped to userId | unscoped reads (defects S1–S3) | Security finding, separate remediation |
| D15 | cloudinary-backend.md: Cloudinary delete out of scope | implemented (replace/remove/delete) | Note |
| D16 | auth-integration.md: refresh token, role-based authorization | neither exists | Note |
| D17 | ce-report-backend.md example key `requiredCeHours` | JSON key `requiredCEHours` | Use real key |
| D18 | README "CE export not implemented", "30/60/90 buckets" | `/ce-report` + print page exist; only a single 90-day window exists | Update README in M14 |
| D19 | backend-scaffold.md package `com.uptrack`; "no Spring Security" | package `com.ccruce.backend`; security + JWT implemented | Stale |
| D20 | frontend/README.md mentions `ng e2e`; root README links to an absolute path of the form `/Users/<user>/Documents/UpTrack/...` | no e2e target; paths stale | Stale |
| D21 | START-HERE.md: copy `.agents/rules/uptrack-migration.md` | `.agents/` absent | Needed only for Antigravity; flag |
| D22 | Previous `AGENTS.md` (git history): "Do not add Codex to any commit messages", MySQL | replaced by migration `AGENTS.md` (no attribution rule); GEMINI.md still forbids agent attribution | **Resolved by user 2026-10-31: do not add AI agent attribution to commit messages.** Note: the harness attribution reminder suggesting a Co-Authored-By line conflicts; user rule applies |
| D23 | CLAUDE.md/AGENTS.md describe test command as Vitest | confirmed: `@angular/build:unit-test` + Vitest 4.1.0 | OK |
