package com.ccruce.backend.service.impl;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.service.CertificateAssetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Phase 2 (issue #20): durable cleanup worker for managed certificate assets. PostgreSQL-backed
 * outbox semantics: a PENDING_DELETION row is claimed with a fenced lease (committed before any
 * provider call), the Cloudinary destroy runs outside the database transaction, and every state
 * transition is guarded by the lease token so stale workers cannot overwrite newer state. Destroy
 * is idempotent and provider not-found counts as success. Failed attempts get bounded exponential
 * backoff (5 min → 15 min → 1 h → 4 h → 24 h cap) and exhaustion (default 10) marks CLEANUP_FAILED,
 * which retains the asset for owner investigation. Also expires unattached PENDING uploads after
 * the 24 h grace period. Disabled in shared test contexts via {@code app.cleanup.enabled=false}.
 */
@Component
public class CertificateCleanupWorker {

    private static final Logger log = LoggerFactory.getLogger(CertificateCleanupWorker.class);

    private final boolean enabled;
    private final int batchSize;
    private final long abandonedGraceHours;
    private final String workerId;
    private final CertificateAssetService assetService;

    public CertificateCleanupWorker(
            @Value("${app.cleanup.enabled:true}") boolean enabled,
            @Value("${app.cleanup.batch-size:50}") int batchSize,
            @Value("${app.cleanup.abandoned-grace-hours:24}") long abandonedGraceHours,
            CertificateAssetService assetService) {
        this.enabled = enabled;
        this.batchSize = batchSize;
        this.abandonedGraceHours = abandonedGraceHours;
        this.workerId = WorkerIds.resolve();
        this.assetService = assetService;
    }

    @Scheduled(fixedDelayString = "${app.cleanup.interval-ms:60000}")
    public void runScheduled() {
        if (!enabled) {
            return;
        }
        expireAbandonedUploads();
        processDeletionBatch();
    }

    /** Testable entry points; the enabled flag only gates scheduling. */
    public int expireAbandonedUploads() {
        int expired = assetService.expireAbandonedUploads(OffsetDateTime.now().minusHours(abandonedGraceHours));
        if (expired > 0) {
            log.info("Expired {} abandoned certificate upload(s) beyond the {}h grace period.", expired, abandonedGraceHours);
        }
        return expired;
    }

    public void processDeletionBatch() {
        List<CertificateAsset> eligible = assetService.findEligibleDeletions(OffsetDateTime.now(), batchSize);
        for (CertificateAsset asset : eligible) {
            processOne(asset);
        }
    }

    void processOne(CertificateAsset asset) {
        UUID leaseToken = assetService.claimDeletion(asset, workerId);
        if (leaseToken == null) {
            return; // claimed by another worker
        }
        var result = assetService.destroyAtProvider(asset);
        if (result.outcome() == CertificateAssetService.DestroyResult.Outcome.DELETED
                || result.outcome() == CertificateAssetService.DestroyResult.Outcome.NOT_FOUND) {
            assetService.completeDeletion(asset.getId(), leaseToken);
        } else {
            // FAILED or AMBIGUOUS: retryable, sanitized class, bounded backoff.
            assetService.registerCleanupFailure(asset, leaseToken, result.failureClass());
        }
    }
}
