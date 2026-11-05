package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.enums.FailureClass;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateReservationSweeper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
        asset.setOriginalFilename("cert.pdf");
        asset.setUploadedAt(OffsetDateTime.now().minusMinutes(30));
        return asset;
    }

    private CertificateReservationSweeper sweeper(boolean enabled) {
        return new CertificateReservationSweeper(enabled, 10, 20, repository, assetService);
    }

    @Test
    void disabledSweeperDoesNotRunOnSchedule() {
        sweeper(false).reconcileReservations();
        verify(repository, never()).findEligibleReservations(any(), any(), any());
    }

    @Test
    void eligibleReservationIsClaimedProbedAndAdoptedWhenItExists() {
        CertificateAsset asset = reserved();
        UUID token = UUID.randomUUID();
        when(repository.findEligibleReservations(any(), any(), eq(PageRequest.of(0, 20)))).thenReturn(List.of(asset));
        when(assetService.claimReservation(eq(asset), anyString())).thenReturn(token);
        when(assetService.probeAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.ProbeResult(true, true, Map.of("secure_url", "https://res/x.pdf"), null));

        sweeper(true).reconcileReservations();

        verify(assetService).adoptFromProbe(asset, token, Map.of("secure_url", "https://res/x.pdf"));
        verify(assetService, never()).markDefinitivelyFailed(any(UUID.class), any());
        verify(assetService, never()).registerProbeFailure(any(), any(), anyString());
    }

    @Test
    void confirmedAbsentReservationIsMarkedUploadFailed() {
        CertificateAsset asset = reserved();
        UUID token = UUID.randomUUID();
        when(repository.findEligibleReservations(any(), any(), any())).thenReturn(List.of(asset));
        when(assetService.claimReservation(eq(asset), anyString())).thenReturn(token);
        when(assetService.probeAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.ProbeResult(true, false, null, null));

        sweeper(true).reconcileBatch();

        verify(assetService).markDefinitivelyFailed(asset.getId(), token);
    }

    @Test
    void failedProbeSchedulesBoundedRetryAndDoesNotFailTheReservation() {
        CertificateAsset asset = reserved();
        UUID token = UUID.randomUUID();
        when(repository.findEligibleReservations(any(), any(), any())).thenReturn(List.of(asset));
        when(assetService.claimReservation(eq(asset), anyString())).thenReturn(token);
        when(assetService.probeAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.ProbeResult(false, false, null, FailureClass.NETWORK.name()));

        sweeper(true).reconcileBatch();

        verify(assetService).registerProbeFailure(asset, token, FailureClass.NETWORK.name());
        verify(assetService, never()).adoptFromProbe(any(), any(), any());
        verify(assetService, never()).markDefinitivelyFailed(any(UUID.class), any());
    }

    @Test
    void rowsAlreadyLeasedByAnotherWorkerAreSkipped() {
        CertificateAsset asset = reserved();
        when(repository.findEligibleReservations(any(), any(), any())).thenReturn(List.of(asset));
        when(assetService.claimReservation(eq(asset), anyString())).thenReturn(null);

        sweeper(true).reconcileBatch();

        verify(assetService, never()).probeAtProvider(any());
    }
}
