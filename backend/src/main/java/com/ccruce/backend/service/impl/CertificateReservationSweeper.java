package com.ccruce.backend.service.impl;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.CertificateAssetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Reconciles RESERVED uploads whose provider outcome was uncertain (crash, timeout, ambiguous
 * response). The Admin API existence probe is authoritative; the post-upload database insert is
 * never the only recovery path.
 *
 * <p>Selection honors the grace period AND the scheduled retry time ({@code next_retry_at}), so
 * newly reserved assets are never probed prematurely and failed probes back off (bounded, capped
 * at 24 h — provider outages cannot create tight polling loops). Each row is claimed with a
 * fenced lease ({@code lease_token}); concurrent scheduler executions cannot corrupt state because
 * every transition is guarded by the token, and expired leases make rows re-claimable after a
 * restart. Disabled in shared test contexts via {@code app.upload.sweeper-enabled=false}.
 */
@Component
public class CertificateReservationSweeper {

    private static final Logger log = LoggerFactory.getLogger(CertificateReservationSweeper.class);

    private final boolean enabled;
    private final long graceMinutes;
    private final int batchSize;
    private final String workerId;
    private final CertificateAssetRepository repository;
    private final CertificateAssetService assetService;

    public CertificateReservationSweeper(
            @Value("${app.upload.sweeper-enabled:true}") boolean enabled,
            @Value("${app.upload.reservation-grace-minutes:10}") long graceMinutes,
            @Value("${app.upload.sweeper-batch-size:20}") int batchSize,
            CertificateAssetRepository repository,
            CertificateAssetService assetService) {
        this.enabled = enabled;
        this.graceMinutes = graceMinutes;
        this.batchSize = batchSize;
        this.workerId = resolveWorkerId();
        this.repository = repository;
        this.assetService = assetService;
    }

    private static String resolveWorkerId() {
        try {
            return InetAddress.getLocalHost().getHostName() + ":" + UUID.randomUUID();
        } catch (Exception exception) {
            return "unknown:" + UUID.randomUUID();
        }
    }

    @Scheduled(fixedDelayString = "${app.upload.sweeper-interval-ms:60000}")
    public void reconcileReservations() {
        if (!enabled) {
            return;
        }
        reconcileBatch();
    }

    /** One reconciliation pass; also invoked directly by tests (the enabled flag only gates scheduling). */
    public void reconcileBatch() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime cutoff = now.minusMinutes(graceMinutes);
        List<CertificateAsset> eligible = repository.findEligibleReservations(cutoff, now, PageRequest.of(0, batchSize));
        for (CertificateAsset asset : eligible) {
            UUID leaseToken = assetService.claimReservation(asset, workerId);
            if (leaseToken == null) {
                continue; // claimed by another worker instance
            }
            reconcileClaimed(asset, leaseToken);
        }
    }

    @Transactional
    public void reconcileClaimed(CertificateAsset asset, UUID leaseToken) {
        var probe = assetService.probeAtProvider(asset);
        if (!probe.probeSucceeded()) {
            assetService.registerProbeFailure(asset, leaseToken, probe.failureClass());
            return;
        }
        if (probe.exists()) {
            // Provider has the asset (upload succeeded but the app crashed/timed out before recording it).
            assetService.adoptFromProbe(asset, leaseToken, probe.resource());
        } else {
            assetService.markDefinitivelyFailed(asset.getId(), leaseToken);
            log.info("Reservation {} confirmed absent at provider; marked UPLOAD_FAILED.", asset.getId());
        }
    }
}
