package com.ccruce.backend.service.impl;

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
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.CertificateDeliveryService;
import com.cloudinary.AuthToken;
import com.cloudinary.Cloudinary;
import com.cloudinary.Url;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Phase 3 (issue #23): ownership-checked, short-lived authenticated delivery URLs. The token is an
 * HMAC AuthToken bound (acl) to the single intended asset, generated locally — no provider call, so
 * there is no outage path and never a fallback to a permanent public URL. SDK-generated URL shape is
 * provisional until the non-production pilot verifies it (spec §3).
 */
@Service
public class CertificateDeliveryServiceImpl implements CertificateDeliveryService {

    private final CERecordRepository ceRecordRepository;
    private final UserRepository userRepository;
    private final CertificateAssetService assetService;
    private final Cloudinary cloudinary;
    private final long ttlSeconds;

    public CertificateDeliveryServiceImpl(CERecordRepository ceRecordRepository,
            UserRepository userRepository,
            CertificateAssetService assetService,
            Cloudinary cloudinary,
            @Value("${app.certificates.delivery.ttl-seconds:60}") long ttlSeconds) {
        if (ttlSeconds < 1 || ttlSeconds > 3600) {
            throw new IllegalStateException("Certificate delivery TTL must be between 1 and 3600 seconds.");
        }
        this.ceRecordRepository = ceRecordRepository;
        this.userRepository = userRepository;
        this.assetService = assetService;
        this.cloudinary = cloudinary;
        this.ttlSeconds = ttlSeconds;
    }

    @Override
    public CertificateDeliveryUrlDto issueDeliveryUrl(UUID ceRecordId) {
        User user = getAuthenticatedUser();
        CERecord record = ceRecordRepository.findById(ceRecordId)
                .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("CE record not found for id: " + ceRecordId));

        UUID assetId = record.getCertificateAssetId();
        if (assetId == null) {
            // Legacy/external-link records keep their own (non-managed) URL handling; no managed asset here.
            throw new ResourceNotFoundException("No managed certificate for CE record: " + ceRecordId);
        }
        CertificateAsset asset = assetService.findOwnedAsset(assetId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Certificate asset not found for id: " + assetId));
        if (asset.getStatus() != AssetStatus.ATTACHED || !ceRecordId.equals(asset.getCeRecordId())) {
            throw new ConflictException("Certificate is not available.");
        }

        String url = generateAuthenticatedUrl(asset);
        return new CertificateDeliveryUrlDto(url, Instant.now().plusSeconds(ttlSeconds));
    }

    private String generateAuthenticatedUrl(CertificateAsset asset) {
        try {
            AuthToken token = new AuthToken()
                    .duration(ttlSeconds)
                    .acl("/" + asset.getResourceType() + "/authenticated/" + asset.getPublicId());
            Url url = cloudinary.url()
                    .secure(true)
                    .type("authenticated")
                    .resourceType(asset.getResourceType())
                    .authToken(token);
            if ("raw".equals(asset.getResourceType())) {
                String extension = extensionOf(asset.getOriginalFilename());
                if (extension != null) {
                    url.format(extension);
                }
            }
            return url.generate(asset.getPublicId());
        } catch (RuntimeException exception) {
            // URL generation is local signing; failure here must never degrade to a public URL.
            throw new UploadFailedException("Certificate delivery failed.");
        }
    }

    private static String extensionOf(String filename) {
        if (filename == null || !filename.contains(".")) {
            return null;
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }
        return userRepository.findById(currentUser.id())
                .orElseThrow(() -> new UnauthorizedException("Authentication is required."));
    }
}
