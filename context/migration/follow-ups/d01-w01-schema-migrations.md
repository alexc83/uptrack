> **PM01 tracking:** [GitHub issue #43](https://github.com/alexc83/uptrack/issues/43) is the canonical active tracker. This document preserves investigation and proposed options; it is not implementation authorization.

# D01-W01 — Explicit database schema migrations

Status: **OPEN — technical debt / future engineering initiative. Not part of D01; not authorized.** Recorded 2026-11-04 during the D01 audit.

Gap: production schema is managed by Hibernate `spring.jpa.hibernate.ddl-auto: update` (`backend/src/main/resources/application.yml`); tests use `create-drop`. There is no Flyway/Liquibase history, so:
- schema changes are implicit and not reviewable as code;
- `update` never drops or renames columns/constraints and cannot express data migrations;
- CI (D01-B/C) can verify that a fresh schema works on PostgreSQL 17, but cannot verify the upgrade path from the existing Neon production schema (PostgreSQL 17.11, owner-verified);
- rollback of a schema change is manual.

Proposed separately authorized evaluation (no implementation implied):
1. Compare Flyway and Liquibase for a single Spring Boot 3.5 service (Flyway is likely simpler: SQL files, Boot auto-configuration).
2. Capture a baseline migration from the current entity model, checked against a schema-only dump of production taken by the owner (no data, no credentials in the repository).
3. Plan cut-over: `baselineOnMigrate`, switch `ddl-auto` to `validate`, verify on a disposable PostgreSQL 17 database and in the D01-C CI job.
4. Define a rollback/backup procedure for Neon (branching/point-in-time restore) before the first migration runs in production.

Constraints: no Neon change, no schema change and no dependency addition without explicit owner approval. Related: [D01 spec](../specs/d01-ci-foundation.md) gap G8.
