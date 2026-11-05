package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateReservationSweeper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CertificateReservationSweeperTest {

    private final CertificateAssetRepository repository = mock(CertificateAssetRepository.class);
    private final CertificateAssetService assetService = mock(CertificateAssetService.class);

    private static CertificateAsset reserved() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        asset.setUserId(UUID.randomUUID());
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setResourceType("raw");
        asset.setStatus(AssetStatus.RESERVED);
        asset.setUploadedAt(OffsetDateTime.now().minusMinutes(30));
        return asset;
    }

    @Test
    void disabledSweeperDoesNothing() {
        var sweeper = new CertificateReservationSweeper(false, 10, 20, repository, assetService);
        sweeper.reconcileReservations();
        verify(repository, never()).findReservationsOlderThan(any(), any());
    }

    @Test
    void existingAssetIsAdoptedAsPending() {
        CertificateAsset asset = reserved();
        when(repository.findReservationsOlderThan(any(), eq(PageRequest.of(0, 20)))).thenReturn(List.of(asset));
        when(assetService.probeAtProvider(asset))
                .thenReturn(new CertificateAssetService.ProbeResult(true, true, "https://res.example.test/x.pdf"));

        new CertificateReservationSweeper(true, 10, 20, repository, assetService).reconcileReservations();

        verify(assetService).adoptFromProbe(asset, "https://res.example.test/x.pdf");
        verify(assetService, never()).markDefinitivelyFailed(any());
    }

    @Test
    void confirmedAbsentAssetIsMarkedUploadFailed() {
        CertificateAsset asset = reserved();
        when(repository.findReservationsOlderThan(any(), eq(PageRequest.of(0, 20)))).thenReturn(List.of(asset));
        when(assetService.probeAtProvider(asset))
                .thenReturn(new CertificateAssetService.ProbeResult(true, false, null));

        new CertificateReservationSweeper(true, 10, 20, repository, assetService).reconcileReservations();

        verify(assetService).markDefinitivelyFailed(asset.getId());
        verify(assetService, never()).adoptFromProbe(any(), any());
    }

    @Test
    void failedProbeLeavesReservationUntouchedForNextRun() {
        CertificateAsset asset = reserved();
        when(repository.findReservationsOlderThan(any(), eq(PageRequest.of(0, 20)))).thenReturn(List.of(asset));
        when(assetService.probeAtProvider(asset))
                .thenReturn(new CertificateAssetService.ProbeResult(false, false, null));

        new CertificateReservationSweeper(true, 10, 20, repository, assetService).reconcileReservations();

        verify(assetService, never()).adoptFromProbe(any(), any());
        verify(assetService, never()).markDefinitivelyFailed(any());
    }
}
