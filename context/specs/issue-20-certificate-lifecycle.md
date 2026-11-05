> **Canonical tracker:** [GitHub issue #20](https://github.com/alexc83/uptrack/issues/20) — canonical D01-W04 lifecycle tracker ([evidence](../migration/follow-ups/d01-w04-cloudinary-certificate-lifecycle.md)); do not create duplicates.
> **Related:** #24 (registry, Phase 1, [spec](issue-24-certificate-asset-registry.md)), #23 (delivery, Phase 3, [spec](issue-23-authenticated-delivery.md)), #19 (PDF diagnosis, Phase 0, [spec](issue-19-pdf-diagnosis.md)).

# READY Specification — Issue #20: Durable certificate lifecycle, cleanup & historical migration (Phases 2 + 4)

**Status: READY.** Owner approved the v3 architecture as the basis of this READY specification on 2026-11-05. **READY is not implementation authorization; implementation remains unauthorized.**

Evidence tags: **[C]** confirmed in current `main` code/tests · **[H]** hypothesis · **[LV]** requires controlled non-production Cloudinary pilot.

## 1. Current-code findings (updated after Phase 1 merged, PR #55 / `6cc94dd`)

- **[C]** Phase 1 (issue #24) introduced the `certificate_assets` registry, reserve-first uploads with an Admin-API probe sweeper, ownership-validated attach by asset UUID, and `MANAGED_VERIFIED` / `LEGACY_UNVERIFIED` / `EXTERNAL_LINK` classification. Managed CE delete/replace/remove record `PENDING_DELETION` in the CE-record transaction; the provider destroy runs after commit (Phase 1 interim) — Phase 2 replaces this with the durable worker below so exactly one mechanism owns provider deletion.
- **[C]** `CredentialServiceImpl.deleteCredential` still only cascades CE rows; **Phase 2 fixes this** by marking managed assets `PENDING_DELETION` in the same transaction before the cascade. Legacy publicId-only CE records have no registry row and are **never auto-registered or auto-deleted** (safeguard, §6 of the Phase 2 plan) — historical assets are reconciled only in Phase 4.
- **[C]** Legacy (non-managed) CE paths keep the pre-existing synchronous in-transaction destroy with 502 on provider failure — unchanged by Phase 2; pinned by `CertificateCleanupFailureIntegrationTest`.
- **[C]** Upload-then-abandon leaves unattached `PENDING` assets; Phase 2 expires them after the 24 h grace. No reconciliation of unknown provider assets exists; Phase 2 ships **dry-run only**.
- **[C]** No account-deletion endpoint exists; any future user delete must reuse the same marking path.

## 2. Approved architecture

Durable PostgreSQL-backed deletion retries (outbox-style status machine in `certificate_assets`) with **fenced leases**, plus restricted, dry-run-first reconciliation of orphaned Cloudinary assets. 24-hour grace period applies to **unattached uploads only**, never to confirmed deletion requests. No Redis/RabbitMQ/Kafka/cloud queues/separate workers — Spring scheduling + PostgreSQL only. Cloudinary never participates in a DB transaction; pending deletions are committed **before** any provider call.

## 3. Fenced lease protocol (mandatory correction)

- **Claim (one short transaction):** select eligible rows `WHERE status='PENDING_DELETION' AND (next_retry_at IS NULL OR next_retry_at <= now()) AND (lease_expires_at IS NULL OR lease_expires_at <= now()) ORDER BY next_retry_at LIMIT :batch FOR UPDATE SKIP LOCKED` — selection only — then `UPDATE … SET locked_by=:worker, lease_token=:fenceUuid, locked_at=now(), lease_expires_at=now()+:ttl WHERE id IN (…) AND (lease_expires_at IS NULL OR lease_expires_at <= now())`; commit. A fresh fence UUID is issued per claim.
- **Fenced transitions:** every completion/failure/retry update requires `… WHERE id=:id AND status='PENDING_DELETION' AND lease_token=:fence AND lease_expires_at > now()`. Zero affected rows ⇒ lease lost; the stale worker abandons the record without further writes. A re-claimer after expiry holds a different fence, so stale workers are no-ops.
- **Processing:** `uploader.destroy(public_id, {resource_type, invalidate:true})` outside the transaction; idempotent (provider not-found = success). Success → `DELETED`, lease cleared (fenced). Failure → `cleanup_attempts+1`, `next_retry_at = now()+backoff`, `last_failure_class` from the sanitized enum, lease cleared (fenced). Backoff 5 min → 15 min → 1 h → 4 h → 24 h cap; after 10 attempts → `CLEANUP_FAILED` (terminal, visible, asset kept, owner decision — never auto-deleted).
- **Crash/restart recovery:** the scheduled pass re-claims rows whose lease expired; lease expirations are tracked for observability but never increment `cleanup_attempts`. Batch default 50, lease TTL 5 min/row, worker id `hostname:uuid`.

## 4. Lifecycle scenarios (all must be tested)

Successful upload · upload succeeded but DB registration failed (covered by reserve-first + probe, #24) · abandoned form (24 h expiry of unattached `PENDING`) · CE create (attach) · replacement (old asset marked in the same tx as the row update; worker destroys it later) · removal · CE delete (mark `PENDING_DELETION`, delete row, provider call deferred to the worker — the Phase 1 afterCommit hook is removed) · credential delete (load CE records, mark managed assets, then cascade delete in one tx) · Cloudinary outage (rows stay `PENDING_DELETION` with backoff, user ops never blocked) · DB rollback (no mark persisted, asset untouched) · duplicate cleanup (unique key + fenced claims + idempotent destroy, not-found = success) · interrupted job · app restart · retry exhaustion → `CLEANUP_FAILED` · historical orphans (dry-run reconciliation only in Phase 2).

**Phase 1 → Phase 2 transition notes:** existing `PENDING_DELETION` rows (e.g. Phase 1 post-commit-outage stragglers) are eligible for the worker on its first run; the worker treats provider not-found as success, so a Phase 1 crash between destroy and `markDeleted` self-heals. The Phase 1 `afterCommit` destroy in `CERecordServiceImpl` is removed in the same PR that introduces the worker, so only one deletion mechanism owns each managed asset.

## 5. Restricted reconciliation (Phase 2: dry-run only — no deletions)

`CertificateReconciliationService.dryRunInventory()` lists Cloudinary assets under prefix `uptrack/` via the Admin API (paginated, `image` + `raw`), joins with the registry, and classifies: managed-listed / missing-in-cloudinary / **unknown-provider-assets** (listed at the provider, absent from the registry). **Phase 2 never deletes anything**: unknown assets are reported and explicitly kept out of automatic deletion; any listing/pagination/API failure aborts the run (incomplete inventory is never acted on). The scheduled dry-run report runs only behind `app.cleanup.reconcile.enabled` (default false). Automatic reconciliation deletion of unknown assets requires complete inventory evidence and separate owner authorization (Phase 4). Sanitized output; no secrets in logs; configured account only.

## 6. Dual-identity historical migration (Phase 4; mandatory correction)

Do **not** assume Cloudinary supports in-place delivery-type change preserving public ID ([LV] pilot question, issue #23). Default is **copy-and-verify**:

1. Create a **new registry row** for the authenticated copy (new public ID, new asset UUID, `delivery_type='authenticated'`, `migrated_from_asset_id` → old row); old row gets `superseded_by_asset_id` → new row. Old and new assets retain **independent durable identities** throughout: each is individually traceable, leasable, retryable and safely deletable.
2. Copy bytes server-side, re-upload with `type=authenticated`; verify checksum + authenticated delivery + content type ([LV] pilot first, synthetic certs).
3. One transaction: repoint `ce_records.certificate_asset_id` to the new row; new row `ATTACHED`; old row `SUPERSEDED`.
4. After the verification window (default 7 days), old row `SUPERSEDED → PENDING_DELETION` → normal **fenced** cleanup destroys it with `invalidate=true`. Old public URL refusal (logged-out probes) is verified before destroy.
5. **Rollback:** repoint the CE record to the never-destroyed old row and cancel its pending deletion via a fenced guarded update — explicit, logged, owner decision; **never** roll back by making an authenticated asset public; never silently re-expose confidential documents.
6. Batches resumable via the registry (lease + `migration_attempts` + `next_retry_at`), small batch size (~20), abort on incomplete inventory.

Historical CE metadata stays `LEGACY_UNVERIFIED` (issue #24 safeguard 2) until URL, Cloudinary identity and ownership are reconciled — migration never treats legacy public IDs as verified by default.

## 7. Acceptance criteria (Phases 2 + 4)

- Fenced lease protocol implemented and tested, including stale-fence no-op writes (0 rows affected) after lease expiry/reassignment.
- All 15 lifecycle scenarios covered on H2 and PostgreSQL 17 in CI; cleanup failure no longer returns 502 or blocks user operations; failures remain visible/retryable; exhaustion → `CLEANUP_FAILED`.
- 24 h abandoned-upload expiry tested; confirmed deletions have no grace.
- Reconciliation is dry-run only in Phase 2: produces a classification report, deletes nothing, and abort-on-incomplete-inventory is tested; unknown provider assets are never auto-deleted.
- Migration: dual-identity rows, resumable batches, verify-before-cutover, retire-after-window via fenced cleanup, rollback rehearsed in non-production without re-exposure.
- Cloudinary mocked in all CI; no existing test weakened (the credential-cascade characterization test is replaced by the new behavior).

## 8. Verification matrix (Phases 2 + 4)

Unit: state machine, fence guards, backoff, sanitized failure classes, reconciliation classification. Integration: fenced claim/complete/fail/retry; lease expiry mid-flight; restart; all 15 scenarios; transactional consistency; cross-user. Security regression: cross-user deletion attempts never touch foreign assets; ownership prefix respected; no provider detail leaks. Live [LV] pilot (issue #23) covers real destroy/invalidate/list semantics with synthetic assets only. Required CI per PR: `backend`, `backend-postgres`, `frontend`, `e2e-chromium`.

## 9. Remaining owner decisions

Tunables (lease TTL 5 min, batch 50, backoff, 10 attempts, 7-day window, migration batch 20); reconciliation enablement cadence and who may enable deletes; per-step Phase 4 authorization; explicit implementation authorization (currently **not granted**).
