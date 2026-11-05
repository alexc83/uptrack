package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;

import java.util.Optional;
import java.util.UUID;

public interface CertificateAssetService {

    /** Persist a RESERVED registry row (server-generated identity) in its own committed transaction,
     *  before any Cloudinary call. */
    CertificateAsset reserve(UUID userId, String resourceType);

    /** Confirmed provider success: RESERVED -> PENDING with delivery metadata. Returns false if the row is no longer RESERVED. */
    boolean markUploaded(UUID assetId, UUID userId, String deliveryUrl, String originalFilename);

    /** Definitive provider rejection (4xx): RESERVED -> UPLOAD_FAILED. */
    void markDefinitivelyFailed(UUID assetId);

    /** Uncertain outcome (timeout/IO/ambiguous): keep RESERVED and schedule the reconciliation probe. */
    void scheduleReconciliation(UUID assetId);

    /** Ownership-checked lookup: foreign or unknown ids are empty (caller answers 404). */
    Optional<CertificateAsset> findOwnedAsset(UUID assetId, UUID userId);

    /** Attach a PENDING asset to a CE record atomically. Throws ConflictException if already attached. */
    void attach(UUID assetId, UUID userId, UUID ceRecordId);

    /** Mark the managed asset of a CE record PENDING_DELETION (Phase 2 worker performs the provider call). */
    void markPendingDeletion(UUID assetId, UUID ceRecordId);

    /** Admin API existence probe for unresolved reservations. */
    ProbeResult probeAtProvider(CertificateAsset asset);

    /** Adopt a reservation after the probe confirmed the asset exists at the provider. */
    void adoptFromProbe(CertificateAsset asset, String secureUrl);

    /** probeSucceeded=false: the probe itself failed (retry later). exists=false: confirmed absent. */
    record ProbeResult(boolean probeSucceeded, boolean exists, String secureUrl) {
    }
}
