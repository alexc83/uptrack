# D01-W04 — Cloudinary certificate lifecycle and orphaned files

Status: **OPEN — future engineering initiative. Not part of D01; not authorized.** Recorded 2026-11-04 during D01-D (found while characterizing Cloudinary cleanup failures). No production code or Cloudinary configuration was changed.

Notation: **[C]** confirmed by code inspection and a passing test; **[H]** hypothesis / not verified against the real service.

## 1. Confirmed behaviour

- **[C] Credential delete orphans files.** `CredentialServiceImpl.deleteCredential` calls only `credentialRepository.delete(credential)`. `Credential.ceRecords` is `cascade = ALL, orphanRemoval = true`, so the credential's CE records are deleted from the database, but `CertificateUploadService.deleteCertificate` is **never** called for their certificate files. Pinned by `CertificateCleanupFailureIntegrationTest.deletingCredentialCascadesCeRecordsWithoutDeletingCloudinaryAssets` (asserts `deleteCertificate` is never invoked and the records are gone). That test documents current behaviour; it must be replaced when this is fixed.
- **[C] CE-record paths do clean up.** `CERecordServiceImpl.deleteCERecord` removes the asset before the row delete; `updateCERecord` saves, then removes the previous asset when the certificate was replaced or removed, in one `@Transactional` method. A cleanup failure returns 502 "Certificate cleanup failed." and, for updates, rolls the update back; for deletes the record is kept (characterized in the same test class).
- **[C] Account deletion has the same latent issue but no reachable path today.** `User.credentials` and `User.ceRecords` are also `cascade = ALL, orphanRemoval = true`. No user/account-deletion endpoint or service exists (general user CRUD was removed in S01; only `GET/PUT /api/users/me` and password change remain), so nothing currently removes a user. Any future account-deletion feature (or a JPA-level user delete) would orphan every certificate file unless it goes through a cleanup service.

## 2. Other orphan scenarios

| Scenario | Status |
|---|---|
| Upload then abandon: `POST /api/uploads/certificates` stores the file immediately; the form keeps only metadata. Cancelling the dialog, the UI "remove" action (`removePending()` only clears form state), or a create/update that fails or is never submitted leaves an unreferenced file. | **[C]** by code reading (`CertificateUploadServiceImpl.uploadCertificate`; `use-certificate-upload.ts`); not measured against real data |
| Reverse inconsistency on record delete: the asset is destroyed first; if the later row delete/commit fails, the record points to a destroyed asset (dangling link). | **[H]** plausible from the ordering; not reproduced |
| Cloudinary outage blocks deleting/replacing certificates (cleanup failure aborts the action). | **[C]** current design; a product decision, not a defect |
| Files orphaned before this finding (existing production data) | **[H]** unknown; production Cloudinary was not accessed |

## 3. Implications

- **Storage:** unbounded growth of unreferenced files (bounded per file by the 5 MiB cap and upload rate limits). Plan limits **[H]**.
- **Privacy / retention:** certificates are professional-credential documents that may carry a name, licence/certificate numbers and dates. After a user deletes a credential they reasonably expect the files to be gone. Assets use Cloudinary's standard public delivery type **[H — delivery settings not inspected]**, so an orphan stays retrievable by anyone holding its URL, and would survive account deletion — relevant to any deletion-request commitments.
- **Operations:** there is no inventory/reconciliation between database references and the `uptrack/users/<userId>/certificates` folders.
- **Data integrity:** no database corruption found; exposure is orphaned external objects and (scenario 2) a possible dangling reference.

## 4. Remediation options

A. **Cascade-aware cleanup in `deleteCredential`:** collect the credential's CE-record certificate ids and call `deleteCertificate` for each, with the same ordering and transaction semantics as CE-record delete. Smallest change; inherits the Cloudinary-availability coupling.
B. **After-commit cleanup:** delete rows, then remove assets in an `afterCommit` hook/event; log failures instead of rolling back. Fixes the reverse inconsistency and the availability coupling but can leave orphans — pair with C.
C. **Cleanup queue plus reconciler:** record "assets to delete" transactionally and process with retry; a scheduled job lists the Cloudinary folders and removes unreferenced assets older than N hours (dry-run first).
D. **Two-phase upload:** upload as tagged/pending (or to a temporary folder), confirm when the record is saved, expire unconfirmed assets.

## 5. Recommended initial approach

Option A first (closes the confirmed credential-delete gap; small, testable, mocks Cloudinary), designed so an account-deletion feature must reuse the same cleanup service. Decide B/C/D (abandoned uploads, availability coupling, retention) in a separate design review. Needs a READY spec and owner approval per `AGENTS.md`; do not change production code or Cloudinary settings before then.

## 6. Proposed regression tests and acceptance criteria

1. Credential with N CE records having certificates: `deleteCertificate` is called once per asset with the correct public id and resource type; records without certificates are skipped; the DB rows are gone.
2. Credential delete when cleanup fails: assert the chosen semantics (502 + rollback for A; success + logged failure for B) and that no provider detail leaks.
3. Replace the current `deletingCredentialCascadesCeRecordsWithoutDeletingCloudinaryAssets` characterization test (it asserts `never(deleteCertificate)`) with the new behaviour.
4. Cross-user: deleting A's credential never requests deletion of B's assets (and ownership prefix `uptrack/users/<userId>/` is respected).
5. When account deletion exists: all of the user's assets are removed; failure handling per the chosen option.
6. For C/D: an unreferenced asset older than the threshold is removed, a referenced or recent one is kept; dry-run mode deletes nothing.
7. Cloudinary stays mocked in CI; no real service, credentials or production data are used.

Acceptance: items 1–4 pass on H2 and PostgreSQL 17 in CI with no existing test weakened.

## 7. Priority and scope

Priority **medium** (confirmed storage/privacy gap, no confirmed data corruption, no exploit path). Independent of D01-E; schedule by owner decision. Scope: backend service plus tests (frontend only if a pending-upload removal API is added). Related: [D01-D report](../verification/d01-d-report.md) §3, [S05R security remediation](../verification/s05r-security-remediation.md).
