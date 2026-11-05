package com.ccruce.backend.service.impl;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.CertificateAssetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Reconciles RESERVED uploads whose provider outcome was uncertain (crash, timeout,
 * ambiguous response). The Admin API existence probe is authoritative: the post-upload
 * database insert is never the only recovery path. Disabled in tests via
 * {@code app.upload.sweeper-enabled=false}.
 */
@Component
public class CertificateReservationSweeper {

    private static final Logger log = LoggerFactory.getLogger(CertificateReservationSweeper.class);

    private final boolean enabled;
    private final long graceMinutes;
    private final int batchSize;
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
        this.repository = repository;
        this.assetService = assetService;
    }

    @Scheduled(fixedDelayString = "${app.upload.sweeper-interval-ms:60000}")
    public void reconcileReservations() {
        if (!enabled) {
            return;
        }
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(graceMinutes);
        List<CertificateAsset> stale = repository.findReservationsOlderThan(cutoff, PageRequest.of(0, batchSize));
        for (CertificateAsset asset : stale) {
            reconcileOne(asset);
        }
    }

    @Transactional
    public void reconcileOne(CertificateAsset asset) {
        if (asset.getStatus() != AssetStatus.RESERVED) {
            return;
        }
        var probe = assetService.probeAtProvider(asset);
        if (!probe.probeSucceeded()) {
            return; // probe failed; try again next run
        }
        if (probe.exists()) {
            // Provider has the asset (upload succeeded but the app crashed/timed out before recording it).
            assetService.adoptFromProbe(asset, probe.secureUrl());
        } else {
            assetService.markDefinitivelyFailed(asset.getId());
            log.info("Reservation {} confirmed absent at provider; marked UPLOAD_FAILED.", asset.getId());
        }
    }
}
