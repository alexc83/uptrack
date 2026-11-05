package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface CertificateAssetService {

    /** Persist a RESERVED registry row (server-generated identity + original filename) in its own
     *  committed transaction, before any Cloudinary call. */
    CertificateAsset reserve(UUID userId, String resourceType, String originalFilename);

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

    /** Attach a PENDING asset to a CE record atomically. Throws ConflictException if already attached. */
    void attach(UUID assetId, UUID userId, UUID ceRecordId);

    /** Mark the managed asset of a CE record PENDING_DELETION before any provider call (Phase 2 worker owns retries). */
    void markPendingDeletion(UUID assetId, UUID ceRecordId);

    /** Phase 1 interim: after the synchronous best-effort destroy succeeded, record DELETED. */
    void markDeleted(UUID assetId);

    /** Admin API existence probe for unresolved reservations. */
    ProbeResult probeAtProvider(CertificateAsset asset);

    /** probeSucceeded=false: the probe itself failed (retry later with backoff). exists=false: confirmed absent. */
    record ProbeResult(boolean probeSucceeded, boolean exists, Map<String, Object> resource, String failureClass) {
    }
}
