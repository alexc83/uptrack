package com.ccruce.backend.service;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.enums.FailureClass;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateAssetServiceImpl;
import com.cloudinary.Api;
import com.cloudinary.Cloudinary;
import com.cloudinary.api.exceptions.NotFound;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CertificateAssetServiceImplTest {

    private final CertificateAssetRepository repository = mock(CertificateAssetRepository.class);
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final Api api = mock(Api.class);
    private final CertificateAssetServiceImpl service = new CertificateAssetServiceImpl(
            repository, cloudinary, new CloudinaryProperties("test-cloud", "key", "secret"), 60, 300, 300, 10);

    @BeforeEach
    void setUp() {
        when(cloudinary.api()).thenReturn(api);
    }

    @Test
    void reservePersistsServerGeneratedIdentityAndClientFilenameBeforeAnyProviderCall() {
        UUID userId = UUID.randomUUID();
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CertificateAsset asset = service.reserve(userId, "raw", "acls-cert.pdf");

        assertEquals(userId, asset.getUserId());
        assertEquals(AssetStatus.RESERVED, asset.getStatus());
        assertEquals("test-cloud", asset.getCloudName());
        assertEquals("upload", asset.getDeliveryType());
        assertEquals("acls-cert.pdf", asset.getOriginalFilename(), "filename must survive crash/recovery");
        assertTrue(asset.getPublicId().startsWith("uptrack/users/%s/certificates/".formatted(userId)),
                "public id must be server-generated under the owner folder");
        verify(repository).save(asset);
        verify(cloudinary, never()).uploader();
    }

    @Test
    void findOwnedAssetHidesForeignAssets() {
        UUID userId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        CertificateAsset foreign = new CertificateAsset();
        foreign.setId(assetId);
        foreign.setUserId(UUID.randomUUID());
        when(repository.findById(assetId)).thenReturn(Optional.of(foreign));

        assertTrue(service.findOwnedAsset(assetId, userId).isEmpty(), "foreign asset must look nonexistent");
    }

    @Test
    void attachConflictsWhenAssetIsNotPendingAnymore() {
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(repository.attachIfPending(eq(assetId), eq(userId), any(), any())).thenReturn(0);

        assertThrows(ConflictException.class, () -> service.attach(assetId, userId, UUID.randomUUID()));
    }

    @Test
    void claimReservationReturnsTokenOnlyForTheWinner() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        when(repository.claimReservation(eq(asset.getId()), anyString(), any(), any(), any())).thenReturn(1);
        assertNotNull(service.claimReservation(asset, "worker-1"));

        when(repository.claimReservation(eq(asset.getId()), anyString(), any(), any(), any())).thenReturn(0);
        assertNull(service.claimReservation(asset, "worker-2"), "a held lease must not be re-claimable");
    }

    @Test
    void probeAtProviderClassifiesExistsAbsentAndFailed() throws Exception {
        CertificateAsset asset = new CertificateAsset();
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setResourceType("raw");

        com.cloudinary.api.ApiResponse response = mock(com.cloudinary.api.ApiResponse.class);
        when(response.get("secure_url")).thenReturn("https://res.example.test/raw/upload/x");
        when(response.get("format")).thenReturn("pdf");
        org.mockito.Mockito.doReturn(response).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult exists = service.probeAtProvider(asset);
        assertTrue(exists.probeSucceeded() && exists.exists());
        assertNotNull(exists.resource());

        org.mockito.Mockito.doThrow(new NotFound("nope")).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult absent = service.probeAtProvider(asset);
        assertTrue(absent.probeSucceeded() && !absent.exists());

        org.mockito.Mockito.doThrow(new SocketTimeoutException("slow")).when(api).resource(anyString(), anyMap());
        assertEquals(FailureClass.PROVIDER_TIMEOUT.name(), service.probeAtProvider(asset).failureClass());
        org.mockito.Mockito.doThrow(new IOException("reset")).when(api).resource(anyString(), anyMap());
        assertEquals(FailureClass.NETWORK.name(), service.probeAtProvider(asset).failureClass());
        org.mockito.Mockito.doThrow(new RuntimeException("api down")).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult failed = service.probeAtProvider(asset);
        assertFalse(failed.probeSucceeded());
        assertEquals(FailureClass.UNKNOWN.name(), failed.failureClass());
    }

    @Test
    void adoptFromProbeRestoresFullDeliveryMetadataIncludingRawFormatSuffix() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        asset.setResourceType("raw");
        UUID token = UUID.randomUUID();

        service.adoptFromProbe(asset, token, Map.of(
                "secure_url", "https://res.example.test/raw/upload/x", "format", "pdf"));

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(repository).adoptReservation(eq(asset.getId()), eq(token), url.capture(), any());
        assertEquals("https://res.example.test/raw/upload/x.pdf", url.getValue(),
                "recovered raw asset must keep a viewable delivery URL");

        asset.setResourceType("image");
        service.adoptFromProbe(asset, token, Map.of("secure_url", "https://res.example.test/image/upload/x.png"));
        verify(repository).adoptReservation(eq(asset.getId()), eq(token), eq("https://res.example.test/image/upload/x.png"), any());
    }

    @Test
    void probeFailureBackoffIsBoundedAndCappedAt24h() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(UUID.randomUUID());
        asset.setStatus(AssetStatus.RESERVED);
        UUID token = UUID.randomUUID();

        asset.setCleanupAttempts(0);
        service.registerProbeFailure(asset, token, FailureClass.NETWORK.name());
        ArgumentCaptor<OffsetDateTime> first = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(repository).registerProbeFailure(eq(asset.getId()), eq(token), eq(FailureClass.NETWORK.name()), first.capture(), any());
        long firstDelay = java.time.Duration.between(OffsetDateTime.now(), first.getValue()).getSeconds();
        assertTrue(firstDelay >= 55 && firstDelay <= 65, "first backoff ~60s, got " + firstDelay);

        asset.setCleanupAttempts(CertificateAssetServiceImpl.MAX_PROBE_ATTEMPTS);
        service.registerProbeFailure(asset, token, FailureClass.UNKNOWN.name());
        ArgumentCaptor<OffsetDateTime> capped = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(repository, org.mockito.Mockito.times(2)).registerProbeFailure(eq(asset.getId()), eq(token), anyString(), capped.capture(), any());
        long cappedDelay = java.time.Duration.between(OffsetDateTime.now(), capped.getValue()).getSeconds();
        assertTrue(cappedDelay >= 86390 && cappedDelay <= 86410, "backoff capped at 24h, got " + cappedDelay);
    }
}
