> **Canonical tracker:** [GitHub issue #24](https://github.com/alexc83/uptrack/issues/24) — do not create duplicates.
> **Related:** #19 (PDF diagnosis, Phase 0), #20 (lifecycle/migration, Phases 2+4, [spec](issue-20-certificate-lifecycle.md)), #23 (authenticated delivery, Phase 3, [spec](issue-23-authenticated-delivery.md)), D01-W01 follow-up (issue #43, schema-migration infrastructure).

# READY Specification — Issue #24: Managed certificate asset registry & metadata integrity (Phase 1)

**Status: READY.** The owner approved the v3 architecture as the basis of this READY specification on 2026-11-05, subject to the two mandatory Phase 1 safeguards in §3. **READY is not implementation authorization; Phase 1 implementation remains unauthorized.** Documentation and GitHub tracking are authorized.

Evidence tags: **[C]** confirmed in current `main` code/tests · **[H]** hypothesis · **[LV]** requires controlled non-production Cloudinary pilot.

## 1. Current-code findings

- **[C]** `POST /api/uploads/certificates` (`UploadController` → `CertificateUploadServiceImpl`) validates via `CertificateFileValidator` (exact extension↔MIME match, ≤5 MiB bounded read, `%PDF-` + `%%EOF` in final 4 KiB, PDFBox parse rejecting encrypted/0-page/active content incl. `AcroForm`/JS/`EmbeddedFiles`/XFA, images via ImageIO ≤100 frames/≤40 Mpx header-checked) and uploads to `uptrack/users/<uid>/certificates` as Cloudinary `upload`-type with `unique_filename=true`; response `CertificateUploadResponseDto` carries a permanent public `secure_url`, `publicId`, `originalFilename`, `resourceType`.
- **[C]** CE create/update accept client-supplied `certificateUrl`/`certificatePublicId`/`certificateResourceType`; `CERecordServiceImpl.validateCertificateMetadata` enforces HTTP(S)-without-credentials URLs, all-or-nothing metadata, an own-folder prefix `uptrack/users/<uid>/certificates/` and a canonical asset-name check — but **does not bind URL ↔ public ID ↔ resource type ↔ configured cloud** (residual S05-008, this issue).
- **[C]** `ce_records` stores `certificate_url`, `certificate_public_id`, `certificate_resource_type`, `certificate_original_filename` as plain columns; historical rows may contain external HTTPS links or legacy Cloudinary identities that were never server-verified.
- **[C]** `spring.jpa.hibernate.ddl-auto: update` in production; D01-W01 (issue #43) owns migration-tool/baseline/cut-over decisions separately.
- **[C]** React: `uploads-api.ts` posts the file and returns `CertificateUploadResponse{url, publicId, originalFilename, resourceType}`; `ce-record-form.tsx` seeds `certificateUrl`/`certificatePublicId` from it; links render through `safeHttpUrl` (http/https only) in the form and `ce-record-detail-drawer.tsx`; CE report/print shows a label only.

## 2. Approved architecture (owner-selected, recorded 2026-11-05)

A server-controlled PostgreSQL **asset registry** is the single source of truth for certificate assets. Clients reference assets by an internal UUID; attachment never trusts client-subplied Cloudinary URLs or public IDs; historical external HTTPS links are preserved through an explicit compatibility classification; **historical metadata is not automatically trusted** (safeguard 2, §3).

## 3. Mandatory Phase 1 safeguards (owner-imposed, 2026-11-05)

1. **Full React compatibility.** Phase 1 ships backend and React changes together: the upload response keeps `url` (transitional) alongside the new `assetId`, the CE form submits `certificateAssetId` while continuing to accept/populate the legacy fields, and **certificate viewing via the existing URL is preserved until Phase 3 authenticated delivery is operational**. The certificate URL must not be prematurely removed from existing frontend contracts or API DTOs.
2. **Historical metadata is unverified until reconciled.** `certificate_classification` distinguishes `MANAGED_VERIFIED`, `LEGACY_UNVERIFIED`, `EXTERNAL_LINK` (and NULL during transition). The Phase 1 backfill must **not** classify historical rows with legacy public IDs as verified managed assets: they are inserted as `LEGACY_UNVERIFIED` and only become `MANAGED_VERIFIED` after explicit reconciliation of URL, Cloudinary identity and ownership (Phase 4, issue #20/#23). New uploads in Phase 1 are `MANAGED_VERIFIED` by construction (server-reserved identity).

## 4. Data model (Phase 1, additive-only)

New table `certificate_assets`:

| column | type / constraint | purpose |
|---|---|---|
| `id` | `uuid` PK | internal asset UUID; the only asset reference exposed to clients |
| `user_id` | `uuid` NOT NULL FK → `users` | owner from JWT, never client input |
| `ce_record_id` | `uuid` NULL UNIQUE FK → `ce_records` ON DELETE SET NULL | at most one CE record per asset |
| `public_id` | `varchar(255)` NOT NULL | server-generated reserved name `uptrack/users/<uid>/certificates/<uuid>` |
| `resource_type` | `varchar(16)` NOT NULL, check ∈ {`raw`,`image`} | |
| `delivery_type` | `varchar(32)` NOT NULL DEFAULT `'upload'` | → `authenticated` only via verified Phase 4 migration |
| `cloud_name` | `varchar(128)` NOT NULL | configured account identity recorded at reservation |
| `status` | `varchar(32)` NOT NULL | `RESERVED / PENDING / ATTACHED / SUPERSEDED / PENDING_DELETION / DELETED / UPLOAD_FAILED / CLEANUP_FAILED` |
| `uploaded_at / attached_at / updated_at` | `timestamptz` | lifecycle timestamps |
| `cleanup_attempts` | `int` NOT NULL DEFAULT 0 | provider-failure counter (lease expirations do not count) |
| `next_retry_at` | `timestamptz` NULL | backoff schedule |
| `last_failure_class` | `varchar(64)` NULL | sanitized enum only: `PROVIDER_TIMEOUT / PROVIDER_5XX / PROVIDER_4XX / NETWORK / UNKNOWN`; provider not-found on destroy counts as success |
| `locked_by / locked_at / lease_expires_at` | worker lease | durable lease; survives the claiming transaction |
| `lease_token` | `uuid` NULL | **fence**: every cleanup transition must match it (see issue #20 spec §4) |
| `migrated_from_asset_id / superseded_by_asset_id` | `uuid` NULL FK self | dual-identity migration links (Phase 4) |
| `migrated_from_public_id / migrated_from_resource_type` | `varchar` NULL | explicit old→new identity mapping |

Constraints: `UNIQUE (cloud_name, resource_type, public_id)` (idempotency key); indexes on `(status, next_retry_at, lease_expires_at)`, `(user_id)`, `(ce_record_id)`.

`ce_records` gains: `certificate_asset_id uuid NULL FK → certificate_assets`, `certificate_classification varchar(32) NULL`. Existing `certificate_url/public_id/resource_type/original_filename` columns are **kept** during transition (safeguard 1) and stop being authoritative for managed assets only at Phase 3.

**Migration boundary:** Phase 1 ships additive-only, reviewable, H2+PostgreSQL-portable SQL under `backend/src/main/resources/db/migration/`; production DDL is applied by the existing `ddl-auto: update` (**unchanged**); tests keep `create-drop`. The `certificate_classification` backfill is a one-time owner-approved step that marks historical rows `LEGACY_UNVERIFIED` / `EXTERNAL_LINK` per safeguard 2 — never auto-verified. Flyway/Liquibase evaluation, Neon baseline and `ddl-auto` cut-over remain with **D01-W01 / issue #43** under separate authorization.

## 5. Upload & attachment flows (Phase 1)

1. **Reserve-first upload.** After validation (unchanged), a committed transaction inserts a `RESERVED` row with the server-generated `public_id`. DB failure here → no provider call, clean failure. Then `uploader.upload(bytes, {public_id: <reserved>, overwrite:false, unique_filename:false, allowed_formats…})` outside the transaction.
2. **Outcome handling.** Confirmed success → guarded update to `PENDING` + returned metadata; response includes `assetId` **and** the legacy `url`/`publicId` fields (safeguard 1). Definitive provider rejection (4xx validation) → `UPLOAD_FAILED`. **Timeouts, connection interruptions and other uncertain outcomes stay `RESERVED`** and are reconciled by a sweeper via the Admin API existence probe (`resource(public_id, resource_type)`): exists → adopt to `PENDING`; confirmed absent → `UPLOAD_FAILED`. The post-upload insert is never the only recovery path. Client receives an assetId only on confirmed success.
3. **Attachment.** `CERecordRequestDto` gains `certificateAssetId`; the server resolves the registry row, requires `user_id` = JWT uid and `status = PENDING`, and in one transaction sets `ATTACHED` + `ce_record_id` and writes `certificate_classification = MANAGED_VERIFIED`. Foreign asset ids → 404 indistinguishable from nonexistent. Legacy submissions with publicId/URL only are accepted as `LEGACY_UNVERIFIED` (safeguard 2) with the existing prefix/canonical checks retained. URL↔publicId↔resource-type↔cloud binding is enforced for managed assets; malformed/mismatched combinations are rejected 400.
4. **Edge cases.** Duplicate attach: unique `ce_record_id` + re-attach moves the previous asset to `PENDING_DELETION` atomically. Replacement race: single transaction reads old asset, writes new, marks old. Cross-user: ownership-scoped lookups. Stale references: CE delete clears via the lifecycle (issue #20), never synchronous destroy in Phase 1's new paths.

## 6. React compatibility (Phase 1, safeguard 1)

`CertificateUploadResponse` keeps `url`/`publicId` and adds `assetId`; `use-certificate-upload` and `ce-record-form` submit `certificateAssetId` while continuing to populate legacy fields; viewing links keep using `certificateUrl` through `safeHttpUrl` until Phase 3. No frontend contract removes the URL in Phase 1.

## 7. Acceptance criteria (Phase 1)

- Reserve-first upload with Admin-API-probe reconciliation of uncertain outcomes (mocked provider + mocked Admin API in CI).
- Attach-by-UUID with ownership, duplicate/race/invalid-metadata rejection; foreign → 404.
- URL↔asset↔cloud binding enforced; `LEGACY_UNVERIFIED` preserved for historical metadata (safeguard 2); `EXTERNAL_LINK` links still work.
- React upload/attach/view flows unchanged in behavior (safeguard 1); `frontend` and `e2e-chromium` green.
- Additive SQL reviewed; `ddl-auto` untouched; D01-W01 boundary respected.
- Required CI green on cloudinary-http5 2.5.0 **and** 2.6.0 (PR #30 compatibility): `backend`, `backend-postgres`, `frontend`, `e2e-chromium`. No existing test weakened.

## 8. Verification matrix (Phase 1)

Unit: registry transitions, reservation states, probe reconciliation logic, binding validation. Integration (`@SpringBootTest`, H2 + `backend-postgres`, mocked Cloudinary/Admin API): reserve→upload→crash/timeout/ambiguous recovery; attach/ownership/cross-user/duplicate/race; transaction-rollback consistency. Security regression: foreign assetId/publicId rejected, traversal/encoding in IDs, unauthenticated 401, rate limit. Frontend: Vitest for hook/DTO changes; typecheck/lint/build; focused Playwright (chromium in CI). Live Cloudinary: **not** in Phase 1 (Phase 3 pilot, issue #23).

## 9. Remaining owner decisions

Tunables (reservation grace 10 min, etc.); backfill execution window for `LEGACY_UNVERIFIED`; PR #30 merge timing; explicit Phase 1 implementation authorization (currently **not granted**).
