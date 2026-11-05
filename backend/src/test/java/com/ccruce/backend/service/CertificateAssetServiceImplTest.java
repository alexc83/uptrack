package com.ccruce.backend.service;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateAssetServiceImpl;
import com.cloudinary.Cloudinary;
import com.cloudinary.Api;
import com.cloudinary.api.exceptions.NotFound;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
            repository, cloudinary, new CloudinaryProperties("test-cloud", "key", "secret"), 60);

    @BeforeEach
    void setUp() {
        when(cloudinary.api()).thenReturn(api);
    }

    @Test
    void reservePersistsServerGeneratedIdentityBeforeAnyProviderCall() {
        UUID userId = UUID.randomUUID();
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CertificateAsset asset = service.reserve(userId, "raw");

        assertEquals(userId, asset.getUserId());
        assertEquals(AssetStatus.RESERVED, asset.getStatus());
        assertEquals("test-cloud", asset.getCloudName());
        assertEquals("upload", asset.getDeliveryType());
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
    void probeAtProviderClassifiesExistsAbsentAndFailed() throws Exception {
        CertificateAsset asset = new CertificateAsset();
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setResourceType("raw");

        com.cloudinary.api.ApiResponse response = mock(com.cloudinary.api.ApiResponse.class);
        when(response.get("secure_url")).thenReturn("https://res.example.test/raw/upload/x.pdf");
        org.mockito.Mockito.doReturn(response).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult exists = service.probeAtProvider(asset);
        assertTrue(exists.probeSucceeded() && exists.exists());
        assertEquals("https://res.example.test/raw/upload/x.pdf", exists.secureUrl());

        org.mockito.Mockito.doThrow(new NotFound("nope")).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult absent = service.probeAtProvider(asset);
        assertTrue(absent.probeSucceeded() && !absent.exists());

        org.mockito.Mockito.doThrow(new RuntimeException("api down")).when(api).resource(anyString(), anyMap());
        CertificateAssetService.ProbeResult failed = service.probeAtProvider(asset);
        assertFalse(failed.probeSucceeded());
    }
}
