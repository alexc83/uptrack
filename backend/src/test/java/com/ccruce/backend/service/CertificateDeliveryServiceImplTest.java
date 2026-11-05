package com.ccruce.backend.service;

import com.ccruce.backend.dto.response.CertificateDeliveryUrlDto;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.impl.CertificateDeliveryServiceImpl;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CertificateDeliveryServiceImplTest {

    private final CERecordRepository ceRecordRepository = mock(CERecordRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final CertificateAssetService assetService = mock(CertificateAssetService.class);
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final CertificateDeliveryServiceImpl service =
            new CertificateDeliveryServiceImpl(ceRecordRepository, userRepository, assetService, cloudinary,
                    new com.ccruce.backend.config.CertificateDeliveryProperties(true, 60),
                    new com.ccruce.backend.config.CloudinaryProperties("test-cloud", "key", "secret"));

    private final UUID userId = UUID.randomUUID();
    private final UUID recordId = UUID.randomUUID();
    private final UUID assetId = UUID.randomUUID();

    @BeforeEach
    void setUp() throws Exception {
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cloudinary.privateDownload(anyString(), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.anyMap())).thenReturn("https://api.example.test/raw/download?signature=synthetic");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, "u@example.test", "User"), null, List.of()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private CERecord managedRecord() {
        CERecord record = new CERecord();
        record.setId(recordId);
        User owner = new User();
        owner.setId(userId);
        record.setUser(owner);
        record.setCertificateAssetId(assetId);
        return record;
    }

    private CertificateAsset attachedAsset() {
        CertificateAsset asset = new CertificateAsset();
        asset.setId(assetId);
        asset.setUserId(userId);
        asset.setStatus(AssetStatus.ATTACHED);
        asset.setCeRecordId(recordId);
        asset.setResourceType("raw");
        asset.setCloudName("test-cloud");
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setOriginalFilename("cert.pdf");
        asset.setDeliveryType("authenticated");
        return asset;
    }

    @Test
    void issuesShortLivedDownloadBoundToTheAsset() throws Exception {
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(attachedAsset()));

        CertificateDeliveryUrlDto result = service.issueDeliveryUrl(recordId);

        assertEquals("https://api.example.test/raw/download?signature=synthetic", result.url());
        assertTrue(result.expiresAt().isAfter(Instant.now().plusSeconds(55))
                && result.expiresAt().isBefore(Instant.now().plusSeconds(61)), "60s TTL");

        ArgumentCaptor<java.util.Map<String, Object>> options = ArgumentCaptor.forClass(java.util.Map.class);
        verify(cloudinary).privateDownload(eq("uptrack/users/u/certificates/x"), org.mockito.ArgumentMatchers.isNull(), options.capture());
        assertEquals(java.util.Map.of("resource_type", "raw", "type", "authenticated",
                "expires_at", result.expiresAt().getEpochSecond(), "attachment", false), options.getValue());
    }

    @Test
    void missingOrForeignRecordIs404() {
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.issueDeliveryUrl(recordId));

        CERecord foreign = managedRecord();
        User other = new User();
        other.setId(UUID.randomUUID());
        foreign.setUser(other);
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(foreign));
        assertThrows(ResourceNotFoundException.class, () -> service.issueDeliveryUrl(recordId));
    }

    @Test
    void recordWithoutManagedAssetIs404() {
        CERecord record = managedRecord();
        record.setCertificateAssetId(null);
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        assertThrows(ResourceNotFoundException.class, () -> service.issueDeliveryUrl(recordId));
    }

    @Test
    void uploadTypeAssetIsNotServedViaAuthenticatedUrl() {
        CertificateAsset asset = attachedAsset();
        asset.setDeliveryType("upload"); // current uploads until the Phase 4 migration
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(asset));

        assertThrows(ConflictException.class, () -> service.issueDeliveryUrl(recordId));
        org.mockito.Mockito.verifyNoInteractions(cloudinary);
    }

    @Test
    void inactiveAssetStateIs409NotDelivered() {
        CertificateAsset asset = attachedAsset();
        asset.setStatus(AssetStatus.PENDING_DELETION);
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(asset));

        assertThrows(ConflictException.class, () -> service.issueDeliveryUrl(recordId));
        org.mockito.Mockito.verifyNoInteractions(cloudinary);
    }

    @Test
    void urlGenerationFailureNeverFallsBackToPublicUrl() throws Exception {
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(attachedAsset()));
        when(cloudinary.privateDownload(anyString(), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.anyMap())).thenThrow(new java.io.IOException("sensitive SDK inputs"));

        UploadFailedException thrown = assertThrows(UploadFailedException.class, () -> service.issueDeliveryUrl(recordId));
        assertEquals("Certificate delivery failed.", thrown.getMessage());
    }

    @Test
    void flagDisabledIssuesNothing() {
        var disabled = new CertificateDeliveryServiceImpl(ceRecordRepository, userRepository, assetService, cloudinary,
                new com.ccruce.backend.config.CertificateDeliveryProperties(false, 60),
                new com.ccruce.backend.config.CloudinaryProperties("test-cloud", "key", "secret"));
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(attachedAsset()));
        assertThrows(ResourceNotFoundException.class, () -> disabled.issueDeliveryUrl(recordId));
        org.mockito.Mockito.verifyNoInteractions(cloudinary);
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        SecurityContextHolder.clearContext();
        assertThrows(UnauthorizedException.class, () -> service.issueDeliveryUrl(recordId));
    }
}
