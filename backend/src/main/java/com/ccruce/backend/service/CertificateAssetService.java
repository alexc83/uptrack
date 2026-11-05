package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.entity.CERecord;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface CertificateAssetService {

    /** Persist a RESERVED registry row (server-generated identity + original filename) in its own
     *  committed transaction, before any Cloudinary call. */
    CertificateAsset reserve(UUID userId, String resourceType, String originalFilename, String deliveryType);

    /** Confirmed provider success: RESERVED -> PENDING with delivery metadata. Returns false if the row is no longer RESERVED. */
    boolean markUploaded(UUID assetId, UUID userId, String deliveryUrl, String originalFilename);

    /** Definitive provider rejection (4xx) at upload time: RESERVED -> UPLOAD_FAILED. */
    void markDefinitivelyFailed(UUID assetId);

    /** Uncertain outcome (timeout/IO/ambiguous): keep RESERVED and schedule the reconciliation probe. */
    void scheduleReconciliation(UUID assetId);

    /** Guarded claim of a reservation for probing. Returns the lease token, or null if another worker holds it. */
    UUID claimReservation(CertificateAsset asset, String workerId);

    /** Fenced adopt after the probe confirmed the asset exists; restores the full delivery metadata. */
    void adoptFromProbe(CertificateAsset asset, UUID leaseToken, Map<String, Object> providerResource);

    /** Fenced definitive failure after the probe confirmed absence. */
    void markDefinitivelyFailed(UUID assetId, UUID leaseToken);

    /** Fenced probe failure: bounded backoff (no tight polling during outages), sanitized failure class. */
    void registerProbeFailure(CertificateAsset asset, UUID leaseToken, String failureClass);

    /** Ownership-checked lookup: foreign or unknown ids are empty (caller answers 404). */
    Optional<CertificateAsset> findOwnedAsset(UUID assetId, UUID userId);

    /** Unscoped lookup for response mapping (delivery-type decisions are server-side). */
    Optional<CertificateAsset> findAsset(UUID assetId);

    /**
     * The certificate URL to expose in an ordinary API response. Asset-based, not flag-based:
     * an 'authenticated' asset's stored URL is NEVER exposed (even if the flag is later turned
     * off); 'upload'-type managed assets and legacy/external records keep their URL (temporary
     * compatibility policy until Phase 4 — those assets are public at the provider regardless).
     */
    String exposedCertificateUrl(CERecord record);

    /** Attach a PENDING asset to a CE record atomically. Throws ConflictException if already attached. */
    void attach(UUID assetId, UUID userId, UUID ceRecordId);

    /** Mark the managed asset of a CE record PENDING_DELETION before any provider call (Phase 2 worker owns retries). */
    void markPendingDeletion(UUID assetId, UUID ceRecordId);

    /** Phase 1 interim: after the synchronous best-effort destroy succeeded, record DELETED. */
    void markDeleted(UUID assetId);

    /** Admin API existence probe for unresolved reservations. */
    ProbeResult probeAtProvider(CertificateAsset asset);

    /** Phase 2: fenced lease claim for a PENDING_DELETION row; returns the fence token or null if held. */
    UUID claimDeletion(CertificateAsset asset, String workerId);

    /** Phase 2: provider destroy outside any DB transaction, with explicit response validation. */
    DestroyResult destroyAtProvider(CertificateAsset asset);

    /** Phase 2: fenced completion of a deletion after a successful destroy. */
    void completeDeletion(UUID assetId, UUID leaseToken);

    /** Phase 2: fenced failure with bounded backoff; exhaustion (maxAttempts) transitions to CLEANUP_FAILED. */
    void registerCleanupFailure(CertificateAsset asset, UUID leaseToken, String failureClass);

    /** Phase 2: move unattached PENDING assets older than the grace cutoff to PENDING_DELETION. */
    int expireAbandonedUploads(OffsetDateTime graceCutoff);

    List<CertificateAsset> findEligibleDeletions(OffsetDateTime now, int batchSize);

    /** probeSucceeded=false: the probe itself failed (retry later with backoff). exists=false: confirmed absent. */
    record ProbeResult(boolean probeSucceeded, boolean exists, Map<String, Object> resource, String failureClass) {
    }

    /**
     * Destroy outcome. DELETED and NOT_FOUND both count as successful cleanup; FAILED and AMBIGUOUS
     * stay retryable with a sanitized failure class. An asset is never marked DELETED merely because
     * the provider call returned without throwing.
     */
    record DestroyResult(Outcome outcome, String failureClass) {
        public enum Outcome {
            DELETED,
            NOT_FOUND,
            FAILED,
            AMBIGUOUS
        }
    }
}
