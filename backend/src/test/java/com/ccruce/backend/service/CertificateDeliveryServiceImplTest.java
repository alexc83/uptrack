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
import com.cloudinary.AuthToken;
import com.cloudinary.Cloudinary;
import com.cloudinary.Url;
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
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CertificateDeliveryServiceImplTest {

    private final CERecordRepository ceRecordRepository = mock(CERecordRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final CertificateAssetService assetService = mock(CertificateAssetService.class);
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final Url url = mock(Url.class, RETURNS_SELF);
    private final CertificateDeliveryServiceImpl service =
            new CertificateDeliveryServiceImpl(ceRecordRepository, userRepository, assetService, cloudinary, 60);

    private final UUID userId = UUID.randomUUID();
    private final UUID recordId = UUID.randomUUID();
    private final UUID assetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cloudinary.url()).thenReturn(url);
        when(url.generate(anyString())).thenReturn("https://res.example.test/raw/authenticated/tok/uptrack/users/u/certificates/x.pdf");
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
        asset.setPublicId("uptrack/users/u/certificates/x");
        asset.setOriginalFilename("cert.pdf");
        return asset;
    }

    @Test
    void issuesShortLivedTokenUrlBoundToTheAsset() {
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(attachedAsset()));

        CertificateDeliveryUrlDto result = service.issueDeliveryUrl(recordId);

        assertEquals("https://res.example.test/raw/authenticated/tok/uptrack/users/u/certificates/x.pdf", result.url());
        assertTrue(result.expiresAt().isAfter(Instant.now().plusSeconds(55))
                && result.expiresAt().isBefore(Instant.now().plusSeconds(61)), "60s TTL");

        ArgumentCaptor<AuthToken> token = ArgumentCaptor.forClass(AuthToken.class);
        verify(url).authToken(token.capture());
        assertEquals("/raw/authenticated/uptrack/users/u/certificates/x", token.getValue().asMap().get("acl").toString().replace("[", "").replace("]", ""));
        verify(url).type("authenticated");
        verify(url).secure(true);
        verify(url).format("pdf");
        verify(url).generate("uptrack/users/u/certificates/x");
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
    void inactiveAssetStateIs409NotDelivered() {
        CertificateAsset asset = attachedAsset();
        asset.setStatus(AssetStatus.PENDING_DELETION);
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(asset));

        assertThrows(ConflictException.class, () -> service.issueDeliveryUrl(recordId));
        verify(url, org.mockito.Mockito.never()).generate(anyString());
    }

    @Test
    void urlGenerationFailureNeverFallsBackToPublicUrl() {
        when(ceRecordRepository.findById(recordId)).thenReturn(Optional.of(managedRecord()));
        when(assetService.findOwnedAsset(assetId, userId)).thenReturn(Optional.of(attachedAsset()));
        when(url.generate(anyString())).thenThrow(new IllegalStateException("signing key broken"));

        UploadFailedException thrown = assertThrows(UploadFailedException.class, () -> service.issueDeliveryUrl(recordId));
        assertEquals("Certificate delivery failed.", thrown.getMessage());
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        SecurityContextHolder.clearContext();
        assertThrows(UnauthorizedException.class, () -> service.issueDeliveryUrl(recordId));
    }
}
