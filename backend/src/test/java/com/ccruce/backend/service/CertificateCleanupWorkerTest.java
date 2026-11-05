package com.ccruce.backend.service;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.service.impl.CertificateCleanupWorker;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CertificateCleanupWorkerTest {

    private final CertificateAssetService assetService = mock(CertificateAssetService.class);
    private final CertificateCleanupWorker worker = new CertificateCleanupWorker(true, 50, 24, assetService);

    private static CertificateAsset pendingDeletion() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        asset.setStatus(AssetStatus.PENDING_DELETION);
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setResourceType("raw");
        asset.setUploadedAt(OffsetDateTime.now().minusHours(1));
        return asset;
    }

    @Test
    void successfulDestroyCompletesDeletionWithTheFenceToken() {
        CertificateAsset asset = pendingDeletion();
        UUID token = UUID.randomUUID();
        when(assetService.findEligibleDeletions(any(), eq(50))).thenReturn(List.of(asset));
        when(assetService.claimDeletion(eq(asset), anyString())).thenReturn(token);
        when(assetService.destroyAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.DestroyResult(CertificateAssetService.DestroyResult.Outcome.DELETED, null));

        worker.processDeletionBatch();

        verify(assetService).completeDeletion(asset.getId(), token);
        verify(assetService, never()).registerCleanupFailure(any(), any(), anyString());
    }

    @Test
    void providerNotFoundIsTreatedAsSuccessfulCleanup() {
        CertificateAsset asset = pendingDeletion();
        UUID token = UUID.randomUUID();
        when(assetService.findEligibleDeletions(any(), anyInt())).thenReturn(List.of(asset));
        when(assetService.claimDeletion(eq(asset), anyString())).thenReturn(token);
        when(assetService.destroyAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.DestroyResult(CertificateAssetService.DestroyResult.Outcome.NOT_FOUND, null));

        worker.processDeletionBatch();

        verify(assetService).completeDeletion(asset.getId(), token);
    }

    @Test
    void providerFailureRegistersBackoffWithTheFenceToken() {
        CertificateAsset asset = pendingDeletion();
        UUID token = UUID.randomUUID();
        when(assetService.findEligibleDeletions(any(), anyInt())).thenReturn(List.of(asset));
        when(assetService.claimDeletion(eq(asset), anyString())).thenReturn(token);
        when(assetService.destroyAtProvider(eq(asset)))
                .thenReturn(new CertificateAssetService.DestroyResult(CertificateAssetService.DestroyResult.Outcome.FAILED, "NETWORK"));

        worker.processDeletionBatch();

        verify(assetService).registerCleanupFailure(asset, token, "NETWORK");
        verify(assetService, never()).completeDeletion(any(), any());
    }

    @Test
    void rowAlreadyLeasedByAnotherWorkerIsSkipped() {
        CertificateAsset asset = pendingDeletion();
        when(assetService.findEligibleDeletions(any(), anyInt())).thenReturn(List.of(asset));
        when(assetService.claimDeletion(eq(asset), anyString())).thenReturn(null); // stale/lost race

        worker.processDeletionBatch();

        verify(assetService, never()).destroyAtProvider(any());
        verify(assetService, never()).completeDeletion(any(), any());
        verify(assetService, never()).registerCleanupFailure(any(), any(), anyString());
    }

    @Test
    void disabledWorkerDoesNotRunOnSchedule() {
        var disabled = new CertificateCleanupWorker(false, 50, 24, assetService);
        disabled.runScheduled();
        verify(assetService, never()).findEligibleDeletions(any(), anyInt());
        verify(assetService, never()).expireAbandonedUploads(any());
    }
}
