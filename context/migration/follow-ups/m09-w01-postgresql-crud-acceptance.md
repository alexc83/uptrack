# M09-W01 — Live PostgreSQL credential write acceptance

Status: OPEN / DEFERRED by explicit owner acceptance on 2026-11-02. Does not block M09 acceptance or integration. No provisioning/write authorization granted. Owner assigns scheduling; do not silently add this to M10 scope.

Gap: existing React mutation tests use mocked APIs; backend integration evidence uses MockMvc/H2. Live read-only acceptance passed, but React → Spring → PostgreSQL create/edit/delete has NOT RUN.

Proposed separately authorized procedure:
1. Provision a separate local database `uptrack_m09_acceptance_<run>` and dedicated role restricted to it, with no access to `uptrack_migration_test` or production. Record exact names before proceeding.
2. Start a separate backend on 18081 and separately configured frontend proxy. Verify effective process JDBC URL/role, listener ownership and PostgreSQL sessions correlated by TCP client ports before authenticated requests. Health alone is insufficient proof.
3. Use synthetic records/accounts only, no remote certificate assets. Capture before-state; exercise create, edit/cancel, delete/CE cascade, fresh dashboard/list/detail/CE cache results and authorization/account-isolation failures. Confirm persisted values and after-state directly in the disposable DB.
4. Record UI/API/DB evidence and limitations. Cleanup only explicitly identified disposable processes/database/role under separate authorization; preserve the existing demo environment.

No database was provisioned, seeded, migrated, mutated or deleted during M09 live acceptance. See [M09 report](../verification/m09-report.md). M10 CE workflows and M11 reporting remain separately scoped.
