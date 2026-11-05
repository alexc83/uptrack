> **Canonical issue:** [GitHub issue #20](https://github.com/alexc83/uptrack/issues/20) (canonical D01-W04 tracker) · **Spec:** [context/specs/issue-20-certificate-lifecycle.md](../specs/issue-20-certificate-lifecycle.md) (updated for Phase 1 evolution on this branch) · **Phase:** 2 only — Phases 3/4, production Cloudinary access, migration, deployment NOT authorized.

# Issue #20 Phase 2 verification report — durable certificate lifecycle

Date: 2026-11-05 · Branch: `fix/20-durable-certificate-cleanup` (from `main` @ `6cc94dd`) · Cloudinary **fully mocked** in all automated checks.

## What was implemented

- **`CertificateCleanupWorker`** (scheduled, `app.cleanup.*` configurable): selects eligible `PENDING_DELETION` rows (retry due, no active lease), claims each with a **fenced lease token committed before any provider call**, runs `destroy(..., invalidate=true)` outside the DB transaction, then a token-guarded transition: success → `DELETED`; provider not-found → `DELETED` (success); failure → `cleanup_attempts+1`, sanitized `last_failure_class`, bounded backoff (5 min → 15 min → 1 h → 4 h → 24 h cap), lease released; at 10 attempts → terminal `CLEANUP_FAILED` (asset kept, owner investigation). Stale workers write 0 rows (fence); expired leases are re-claimable (crash/restart recovery).
- **Transition from Phase 1:** the interim `afterCommit` destroy in `CERecordServiceImpl` was removed; managed delete/replace/remove now only mark `PENDING_DELETION` in the CE-record transaction, so they never depend on Cloudinary availability and exactly one mechanism (the worker) owns provider deletion. Registry + CE-record changes commit atomically; Cloudinary never joins a DB transaction.
- **Abandoned uploads:** unattached `PENDING` assets older than 24 h (`app.cleanup.abandoned-grace-hours`) → `PENDING_DELETION`, guarded so an attachment race loses (delayed attach after expiry → 409). Confirmed deletion requests have no grace.
- **Credential cascade (D01-W04 fix):** `deleteCredential` marks all managed assets of the credential's CE records `PENDING_DELETION` in the same transaction before the JPA cascade; rows survive the deleted CE records. Legacy publicId-only records are **not** registered or deleted (LEGACY_UNVERIFIED safeguard — Phase 4 only).
- **Reconciliation (dry-run only):** `CertificateReconciliationService.dryRunInventory()` classifies provider-listed vs registry-known assets (managed-listed / missing-in-cloudinary / unknown-provider-assets) and never deletes; aborts on incomplete inventory; scheduled report only behind `app.cleanup.reconcile.enabled=false` (default).
- Legacy non-managed CE paths unchanged (synchronous destroy, 502 on failure), pinned by the existing `CertificateCleanupFailureIntegrationTest`.

## Changed files

Main: `repository/CertificateAssetRepository.java`, `service/CertificateAssetService.java`, `service/impl/CertificateAssetServiceImpl.java`, `service/impl/CertificateCleanupWorker.java` (new), `service/impl/CertificateReconciliationService.java` (new), `service/impl/CERecordServiceImpl.java` (afterCommit hook removed), `service/impl/CredentialServiceImpl.java` (cascade marking), `application.yml`. Tests: `controller/CertificateCleanupLifecycleIntegrationTest.java` (new, 7 tests), `service/CertificateCleanupWorkerTest.java` (new, 5 tests), `controller/CertificateAssetRegistryIntegrationTest.java` (updated to worker-owned deletion), `service/CertificateAssetServiceImplTest.java` (constructor). Spec: `context/specs/issue-20-certificate-lifecycle.md` updated for Phase 1 evolution. `application-test.yml`: workers off in shared contexts.

## Checks run (this branch)

| Check | Result |
|---|---|
| `./mvnw -B -ntp test` (H2) — full backend suite | **225/225 passed** (was 218 after Phase 1; +7 net new Phase 2 tests across worker/lifecycle classes) |
| `npm run typecheck` / `npm run lint` | pass / pass (no frontend changes) |
| Required CI on the PR (`backend`, `backend-postgres`, `frontend`, `e2e-chromium`) | reported on the PR (PG17 in CI) |

Coverage added: successful deletion, provider failure + backoff gating (5 min first retry), timeout classification, not-found = success, exhaustion → `CLEANUP_FAILED` (terminal, not re-selected), lease claim contention (skipped), 24 h expiry + attach-after-expiry 409 + fresh-asset attach OK, credential cascade (managed marked, legacy untouched, no provider call in request), replacement/removal/CE-delete marking without request-path provider calls, reconciliation dry-run classification + abort-on-incomplete + never-deletes, worker-disabled gating. No existing test weakened; legacy characterization tests still pass unchanged.

## Phase 1 guarantees carried forward

Pending-deletion is always committed before any provider call; rollback can never follow a destroy; ownership-validated attach; reserve-first uploads with probe reconciliation.

## What Phase 2 does NOT do

No historical asset migration or deletion (Phase 4); no authenticated delivery (Phase 3); no automatic deletion of unknown provider assets (dry-run only); no production Cloudinary access. Live provider behavior (destroy semantics, Admin API listing shape) remains [LV] for the Phase 3 pilot.

## Remaining risks

- Between Phase 2 deploy and Phase 4, legacy `LEGACY_UNVERIFIED` assets orphaned by credential deletion remain at the provider by design (safeguard) until reconciliation.
- Worker throughput bounded by batch size 50 and Cloudinary API rate limits ([LV]).
- `CLEANUP_FAILED` rows need an owner-runbook (manual retry/destroy decision).
