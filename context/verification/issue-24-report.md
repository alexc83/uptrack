> **Canonical issue:** [GitHub issue #24](https://github.com/alexc83/uptrack/issues/24) · **Spec:** [context/specs/issue-24-certificate-asset-registry.md](../specs/issue-24-certificate-asset-registry.md) (merged via PR #54, commit `fa8078a`) · **Phase:** 1 only — Phases 2/3/4, production Cloudinary access, migration and deployment remain unauthorized.

# Issue #24 Phase 1 verification report — certificate asset registry & metadata integrity

Date: 2026-11-05 · Branch: `fix/24-certificate-asset-registry` (from `main` @ `fa8078a`) · Cloudinary **fully mocked** in all automated checks; no production or live Cloudinary access.

## What was implemented

- `certificate_assets` registry (entity, repository, guarded-update queries) + additive `ce_records.certificate_asset_id` / `certificate_classification` columns. Reviewable additive SQL artifact at `backend/src/main/resources/db/migration/V1__phase1_certificate_assets.sql`. **No Flyway/Liquibase; `ddl-auto: update` unchanged** (D01-W01 / #43 untouched); no production backfill executed (historical rows stay NULL until an owner-approved step; safeguard 2).
- Reserve-first upload: `RESERVED` row committed before the provider call; server-generated public ID; `overwrite=false`. Confirmed success → `PENDING` + `assetId` in the response (legacy `url`/`publicId` kept — safeguard 1). Definitive provider 4xx → `UPLOAD_FAILED`. Timeouts/IO/ambiguous → row stays `RESERVED` with `next_retry_at`; `CertificateReservationSweeper` reconciles via the Admin API existence probe (exists → `PENDING`, confirmed absent → `UPLOAD_FAILED`). DB failure at reservation → no provider call.
- Ownership-validated attach by asset UUID (`findOwnedAsset` 404 for foreign/unknown; `attachIfPending` guarded update; `ConflictException` on duplicate attach; unique `ce_record_id`). Replace detaches the previous asset **before** attaching the new one (unique-slot ordering) and records `PENDING_DELETION` in the same transaction; the Cloudinary destroy runs **after commit** (afterCommit hook), never inside the request transaction. CE delete does the same. Legacy (non-asset) paths keep the existing synchronous cleanup and 502 semantics.
- Explicit classification: `MANAGED_VERIFIED` (registry attach), `LEGACY_UNVERIFIED` (legacy public-id metadata — never auto-trusted, safeguard 2), `EXTERNAL_LINK` (URL-only).
- React: `CertificateUploadResponse.assetId`, CE form schema/payload `certificateAssetId`, drawer removal clears it; viewing via `certificateUrl`/`safeHttpUrl` unchanged until Phase 3 (safeguard 1).

## Changed files

Backend main: `enums/{AssetStatus,CertificateClassification,FailureClass}.java` (new), `entity/CertificateAsset.java` (new), `entity/CERecord.java`, `repository/CertificateAssetRepository.java` (new), `service/CertificateAssetService.java` (new), `service/impl/{CertificateAssetServiceImpl,CertificateReservationSweeper,CertificateUploadServiceImpl,CERecordServiceImpl}.java`, `service/impl/{CredentialServiceImpl,DashboardServiceImpl}.java` (DTO mapping), `dto/request/CERecordRequestDto.java`, `dto/response/{CERecordResponseDto,CertificateUploadResponseDto}.java`, `config/SchedulingConfig.java` (new), `application.yml`, `db/migration/V1__phase1_certificate_assets.sql` (new).
Backend test: `service/CertificateAssetServiceImplTest.java` (new), `service/CertificateReservationSweeperTest.java` (new), `controller/CertificateAssetRegistryIntegrationTest.java` (new), `service/{CertificateUploadServiceImplTest,CertificateUploadConcurrencyTest}.java` (constructor adaptation + new cases), `application-test.yml` (sweeper disabled in shared contexts).
Frontend: `lib/dto/{uploads,ce-records}.ts`, `features/ce-records/{ce-record-form-schema.ts,ce-record-form.tsx,ce-record-detail-drawer.tsx}`, fixtures/tests (`src/test/fixtures/api-fixtures.ts`, `use-certificate-upload.test.tsx`, `ce-records-page.test.tsx`, `e2e/ce-record-fixtures.ts`, `e2e/ce-records.spec.ts` — payload now includes `certificateAssetId`).

## Checks run (all on this branch)

| Check | Result |
|---|---|
| `./mvnw -B -ntp clean test` (H2) — full backend suite, final head `cb91b7a` (run in full because shared DTO/entity changes touch many tests) | **218/218 passed**, 0 failures/errors (baseline 165 at D01-A; growth includes the new Phase 1 tests) |
| `npm run typecheck` / `npm run lint` | pass / pass |
| `npm run test -- --run` (full Vitest) | **597/597 passed**, 43 files |
| `npm run build` | pass (chunk-size warning pre-existing) |
| `E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium e2e/ce-records.spec.ts` | 3/3 passed (Chromium bundled; msedge/chrome/firefox/webkit/visual-edge NOT RUN — owner-run) |
| Required CI on PR #55 final head `cb91b7a` (run 41968196154): `backend`, `backend-postgres`, `frontend`, `e2e-chromium` | **all four pass** (PostgreSQL 17 covered in CI; no local PG here) |

New coverage: reservation-before-provider ordering (InOrder), success/definitive-4xx/uncertain/error-map outcomes, DB-failure-at-reserve, probe adopt/absent/backoff, attach ownership 404, duplicate 409, rollback-before-commit ⇒ no provider call, post-commit outage ⇒ durable `PENDING_DELETION`, replace/delete destroy-after-commit with `invalidate=true` → `DELETED`, `MANAGED_VERIFIED`/`LEGACY_UNVERIFIED`/`EXTERNAL_LINK` classification, upload response keeps `assetId` + legacy fields. No existing test was weakened or removed; the two pre-existing upload unit tests were adapted only for the new constructor argument, and the e2e payload assertion was extended with the new field.

## Review-remediation pass (PR #55 independent review, 2026-11-05)

**Finding 1 — managed deletion before Phase 2.** Initial decision (SUPERSEDED by the transaction-safety pass below): managed delete/replace/remove recorded `PENDING_DELETION` before the provider call but then attempted the destroy **inside** the CE-record transaction, rolling back with 502 on provider failure. That interim version is obsolete. Final behavior (below): `PENDING_DELETION` committed in the CE-record transaction, destroy executed after commit, `DELETED` on success, durable `PENDING_DELETION` on provider failure — no indefinite retention, and no rollback after a provider destroy. Phase 1 is mergeable and independently deployable for this path; merging to `main` still does not authorize deployment.

**Finding 2 — sweeper retry scheduling.** `findEligibleReservations` now requires grace cutoff AND `next_retry_at <= now()` AND no active lease, so newly reserved assets are never probed prematurely and backed-off assets are not re-probed early. Each row is claimed with a fenced `lease_token` (guarded claim; concurrent schedulers skip leased rows; every transition is token+lease-guarded, so stale workers write 0 rows and restarts re-claim expired leases). Failed probes get bounded exponential backoff (60 s base, capped at 24 h, 20 attempts) with a sanitized `last_failure_class` — Admin API outages cannot create tight polling loops. Tests: sweeper unit tests (claim contention, adopt/absent/backoff), service tests (claim winner-only, backoff cap, failure classification), integration tests (retry not due → not eligible; probe failure → backed off; restart-style re-claim after lease expiry is covered by the guarded-claim semantics).

**Finding 3 — recovered upload metadata.** `original_filename` is now persisted at reservation time (the provider does not retain the client filename with `use_filename=false`), and probe recovery rebuilds the delivery URL from the Admin API response including the raw-format suffix. A recovered asset therefore has complete authoritative metadata for attachment and viewing without trusting client-submitted Cloudinary identities. Tests: `uncertainUploadOutcomeIsReconciledByTheExistenceProbe` (retry gating, adopt with `.pdf` suffix, absent → `UPLOAD_FAILED`) and `probeFailureBacksOffAndRecoveryThenAttachesWithFullMetadataForViewing` (crash-after-success → backoff → recovery → attach with `certificateUrl` + `certificateOriginalFilename` + `MANAGED_VERIFIED`).

Re-run after that pass: backend **217/217 passed** (H2); frontend typecheck/lint pass, ce-records Vitest 28/28, focused Chromium `e2e/ce-records.spec.ts` 3/3. (Superseded counts; final counts in the checks table above.)

## Transaction-safety review pass (PR #55, 2026-11-05) — FINAL behavior

**Finding (verified correct):** the interim revision above ran `markPendingDeletion` → Cloudinary `destroy` → `markDeleted` all inside the CE-record `@Transactional` method, so `PENDING_DELETION` was **not committed** before the provider call; a rollback after a successful destroy could leave the registry claiming `ATTACHED` while the provider asset was already gone.

**Resolution (Option B, minimal):** `detachManagedAsset()` now records `PENDING_DELETION` in the CE-record transaction and registers a `TransactionSynchronization.afterCommit` hook; the Cloudinary destroy runs **only after the transaction has durably committed**, and `markDeleted` uses `REQUIRES_NEW` (a fresh transaction is required because the request tx thread-locals are still bound during afterCommit — verified by test). Consequences:

- The pending-deletion mark **is** committed before Cloudinary is called. A rollback can never follow a provider destroy, so the dangling-reference scenario is eliminated by construction (regression test: replace with an already-attached asset → 409 → `destroy` never called, asset stays `ATTACHED`).
- Success path: destroy after commit, then `DELETED` — no indefinite retention in the normal path.
- Provider failure/timeout/ambiguous during the post-commit destroy: the CE operation still succeeds (204/200), the row stays durably `PENDING_DELETION`, and the Phase 2 worker retries the idempotent destroy (not-found = success). If the destroy succeeded but the `DELETED` mark failed, Phase 2 self-heals the same way.

**What Phase 1 guarantees:** atomic registry + CE-record state transitions; pending-deletion durably committed before any provider deletion call; no reverse inconsistency (registry never claims an existing provider asset that was destroyed); ownership-validated attach; recoverable reservations.
**What Phase 1 does NOT guarantee:** provider deletion during an outage/crash in the post-commit window is deferred to Phase 2 (row remains `PENDING_DELETION`, visible and individually retryable) — Phase 1 does not provide durable *provider-side* deletion retries; that is Phase 2's responsibility. Legacy (non-managed) paths keep their pre-existing synchronous 502-on-outage semantics.
**Deployability:** Phase 1 is mergeable and independently deployable; merging to `main` does not authorize deployment. Operational note: between Phase 1 deployment and Phase 2, assets deleted during a provider outage remain at the provider until Phase 2 ships — bounded, durable, and visible in the registry.

**Tests:** `rollbackBeforeCommitNeverCallsTheProvider` (rollback ⇒ no provider call, asset stays ATTACHED, record unchanged), `managedDeleteProviderFailureLeavesDurablePendingDeletionAndNoDanglingReference` (outage ⇒ 204, record gone, row `PENDING_DELETION`), plus the existing replace/delete success assertions (destroy with `invalidate=true` after commit, row `DELETED`). Simulated failures only — no live-provider behavior is claimed. Full suite after the pass: backend **218/218 passed** (H2); frontend typecheck/lint pass, ce-records Vitest 28/28, focused Chromium e2e 3/3. Required CI re-runs on the new PR head.

## Not run / pending owner

- `backend-postgres` locally (CI covers PostgreSQL 17); full four-browser Playwright and visual goldens (owner-run); live provider verification (Phase 3, #23 — no pilot tooling is retained); production backfill (owner-approved step only).

## Final behavior summary (current head `cb91b7a`)

- **Normal successful deletion:** managed replace/remove/CE-delete record `PENDING_DELETION` in the CE-record transaction; after commit, the provider destroy runs with `invalidate=true` and the row becomes `DELETED`. The pending-deletion mark is always durably committed **before** any provider deletion call.
- **Provider failure/timeout/ambiguous post-commit:** the CE operation succeeds (204/200); the row stays durably `PENDING_DELETION` and is retried by the Phase 2 worker (idempotent destroy; not-found = success). Phase 1 does not itself retry provider deletions — that, plus abandoned-upload expiry and orphan reconciliation, is Phase 2's responsibility (#20).
- **Legacy (non-managed) certificates:** unchanged pre-existing synchronous in-transaction cleanup with 502 on provider failure.
- **Unverified production / live-Cloudinary behavior:** all automated checks mock Cloudinary; real provider delivery/deletion semantics (incl. authenticated delivery) remain pending live provider verification (Phase 3, #23). Production backfill of historical classifications remains an owner-approved step only.

## Risks / notes

- Between Phase 1 deployment and Phase 2, assets deleted during a provider outage remain at the provider as visible, individually retryable `PENDING_DELETION` rows — bounded and durable, resolved by Phase 2 (#20).
- Legacy synchronous cleanup behavior (incl. 502 on provider failure) is unchanged for non-managed records.
- `certificate_assets.ce_record_id` unique index is what makes duplicate attachment safe at the DB level; replace ordering (detach-before-attach) is required and covered by test.
