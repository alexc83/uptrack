> **Canonical issue:** [GitHub issue #24](https://github.com/alexc83/uptrack/issues/24) · **Spec:** [context/specs/issue-24-certificate-asset-registry.md](../specs/issue-24-certificate-asset-registry.md) (merged via PR #54, commit `fa8078a`) · **Phase:** 1 only — Phases 2/3/4, production Cloudinary access, migration and deployment remain unauthorized.

# Issue #24 Phase 1 verification report — certificate asset registry & metadata integrity

Date: 2026-11-05 · Branch: `fix/24-certificate-asset-registry` (from `main` @ `fa8078a`) · Cloudinary **fully mocked** in all automated checks; no production or live Cloudinary access.

## What was implemented

- `certificate_assets` registry (entity, repository, guarded-update queries) + additive `ce_records.certificate_asset_id` / `certificate_classification` columns. Reviewable additive SQL artifact at `backend/src/main/resources/db/migration/V1__phase1_certificate_assets.sql`. **No Flyway/Liquibase; `ddl-auto: update` unchanged** (D01-W01 / #43 untouched); no production backfill executed (historical rows stay NULL until an owner-approved step; safeguard 2).
- Reserve-first upload: `RESERVED` row committed before the provider call; server-generated public ID; `overwrite=false`. Confirmed success → `PENDING` + `assetId` in the response (legacy `url`/`publicId` kept — safeguard 1). Definitive provider 4xx → `UPLOAD_FAILED`. Timeouts/IO/ambiguous → row stays `RESERVED` with `next_retry_at`; `CertificateReservationSweeper` reconciles via the Admin API existence probe (exists → `PENDING`, confirmed absent → `UPLOAD_FAILED`). DB failure at reservation → no provider call.
- Ownership-validated attach by asset UUID (`findOwnedAsset` 404 for foreign/unknown; `attachIfPending` guarded update; `ConflictException` on duplicate attach; unique `ce_record_id`). Replace detaches the previous asset **before** attaching the new one (unique-slot ordering) and marks it `PENDING_DELETION` in-transaction — no provider call in the request path; CE delete does the same. Legacy (non-asset) paths keep the existing synchronous cleanup and 502 semantics.
- Explicit classification: `MANAGED_VERIFIED` (registry attach), `LEGACY_UNVERIFIED` (legacy public-id metadata — never auto-trusted, safeguard 2), `EXTERNAL_LINK` (URL-only).
- React: `CertificateUploadResponse.assetId`, CE form schema/payload `certificateAssetId`, drawer removal clears it; viewing via `certificateUrl`/`safeHttpUrl` unchanged until Phase 3 (safeguard 1).

## Changed files

Backend main: `enums/{AssetStatus,CertificateClassification,FailureClass}.java` (new), `entity/CertificateAsset.java` (new), `entity/CERecord.java`, `repository/CertificateAssetRepository.java` (new), `service/CertificateAssetService.java` (new), `service/impl/{CertificateAssetServiceImpl,CertificateReservationSweeper,CertificateUploadServiceImpl,CERecordServiceImpl}.java`, `service/impl/{CredentialServiceImpl,DashboardServiceImpl}.java` (DTO mapping), `dto/request/CERecordRequestDto.java`, `dto/response/{CERecordResponseDto,CertificateUploadResponseDto}.java`, `config/SchedulingConfig.java` (new), `application.yml`, `db/migration/V1__phase1_certificate_assets.sql` (new).
Backend test: `service/CertificateAssetServiceImplTest.java` (new), `service/CertificateReservationSweeperTest.java` (new), `controller/CertificateAssetRegistryIntegrationTest.java` (new), `service/{CertificateUploadServiceImplTest,CertificateUploadConcurrencyTest}.java` (constructor adaptation + new cases), `application-test.yml` (sweeper disabled in shared contexts).
Frontend: `lib/dto/{uploads,ce-records}.ts`, `features/ce-records/{ce-record-form-schema.ts,ce-record-form.tsx,ce-record-detail-drawer.tsx}`, fixtures/tests (`src/test/fixtures/api-fixtures.ts`, `use-certificate-upload.test.tsx`, `ce-records-page.test.tsx`, `e2e/ce-record-fixtures.ts`, `e2e/ce-records.spec.ts` — payload now includes `certificateAssetId`).

## Checks run (all on this branch)

| Check | Result |
|---|---|
| `./mvnw -B -ntp test` (H2) — full backend suite (run in full because shared DTO/entity changes touch many tests) | **211/211 passed**, 0 failures/errors (baseline 165 at D01-A; growth includes new Phase 1 tests) |
| `npm run typecheck` / `npm run lint` | pass / pass |
| `npm run test -- --run` (full Vitest) | **597/597 passed**, 43 files |
| `npm run build` | pass (chunk-size warning pre-existing) |
| `E2E_CHROMIUM_FALLBACK=1 npx playwright test --project=chromium e2e/ce-records.spec.ts` | 3/3 passed (Chromium bundled; msedge/chrome/firefox/webkit/visual-edge NOT RUN — owner-run) |
| Required CI on the implementation PR (`backend`, `backend-postgres`, `frontend`, `e2e-chromium`) | reported on the PR (PostgreSQL 17 job runs in CI; no local PG here) |

New coverage: reservation-before-provider ordering (InOrder), success/definitive-4xx/uncertain/error-map outcomes, DB-failure-at-reserve, probe adopt/absent/failed, attach ownership 404, duplicate 409, replace/delete `PENDING_DELETION` marking without provider destroy, `MANAGED_VERIFIED`/`LEGACY_UNVERIFIED`/`EXTERNAL_LINK` classification, upload response keeps `assetId` + legacy fields. No existing test was weakened or removed; the two pre-existing upload unit tests were adapted only for the new constructor argument, and the e2e payload assertion was extended with the new field.

## Not run / pending owner

- `backend-postgres` locally (CI covers PostgreSQL 17); full four-browser Playwright and visual goldens (owner-run); live Cloudinary pilot (Phase 3, separate non-production credentials); production backfill (owner-approved step only).

## Risks / notes

- Managed assets deleted/replaced in Phase 1 are marked `PENDING_DELETION` but the provider object is removed only when Phase 2's worker ships — intended, time-boxed by Phase 2 authorization.
- Legacy synchronous cleanup behavior (incl. 502 on provider failure) is unchanged for non-managed records.
- `certificate_assets.ce_record_id` unique index is what makes duplicate attachment safe at the DB level; replace ordering (detach-before-attach) is required and covered by test.
