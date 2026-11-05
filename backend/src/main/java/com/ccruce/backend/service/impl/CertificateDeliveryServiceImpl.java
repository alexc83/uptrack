package com.ccruce.backend.service.impl;

import com.ccruce.backend.config.CertificateDeliveryProperties;
import com.ccruce.backend.config.CloudinaryProperties;
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
import com.cloudinary.Cloudinary;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;

/** Ownership-checked, time-limited API downloads. Signing is local with the ordinary API secret;
 * no provider call and no public fallback. Provider enforcement is not proved offline.
 */
@Service
public class CertificateDeliveryServiceImpl implements CertificateDeliveryService {

    private final CERecordRepository ceRecordRepository;
    private final UserRepository userRepository;
    private final CertificateAssetService assetService;
    private final Cloudinary cloudinary;
    private final CertificateDeliveryProperties properties;
    private final CloudinaryProperties cloudProperties;

    public CertificateDeliveryServiceImpl(CERecordRepository ceRecordRepository,
            UserRepository userRepository,
            CertificateAssetService assetService,
            Cloudinary cloudinary,
            CertificateDeliveryProperties properties,
            CloudinaryProperties cloudProperties) {
        this.ceRecordRepository = ceRecordRepository;
        this.userRepository = userRepository;
        this.assetService = assetService;
        this.cloudinary = cloudinary;
        this.properties = properties;
        this.cloudProperties = cloudProperties;
    }

    @Override
    public CertificateDeliveryUrlDto issueDeliveryUrl(UUID ceRecordId) {
        // Strategy A gate: while the flag is OFF the endpoint issues nothing (404, indistinguishable).
        if (!properties.enabled()) {
            throw new ResourceNotFoundException("CE record not found for id: " + ceRecordId);
        }
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
        // Delivery-type compatibility (Finding 1): authenticated URLs only work for assets stored
        // with delivery type 'authenticated'. Current uploads are 'upload' (public); issuing an
        // authenticated URL for them would fail at the provider. Refuse with 409 — never fall back
        // to the public URL.
        if (!"authenticated".equals(asset.getDeliveryType())) {
            throw new ConflictException("Certificate is not available for authenticated delivery yet.");
        }

        Instant expiresAt = Instant.now().truncatedTo(ChronoUnit.SECONDS).plusSeconds(properties.ttlSeconds());
        String url = generateAuthenticatedUrl(asset, expiresAt);
        return new CertificateDeliveryUrlDto(url, expiresAt);
    }

    private String generateAuthenticatedUrl(CertificateAsset asset, Instant expiresAt) {
        try {
            if (!cloudProperties.cloudName().equals(asset.getCloudName())
                    || asset.getPublicId() == null || asset.getPublicId().isBlank()) {
                throw new IllegalArgumentException("Invalid certificate identity.");
            }
            String format = switch (asset.getResourceType()) {
                // Raw public IDs include their extension. Do not append it as a format or rewrite
                // historical extensionless IDs. Raw assets are delivered as stored, never converted.
                case "raw" -> null;
                case "image" -> imageFormat(asset.getOriginalFilename());
                default -> throw new IllegalArgumentException("Unsupported certificate resource type.");
            };
            String signed = cloudinary.privateDownload(asset.getPublicId(), format, Map.of(
                    "resource_type", asset.getResourceType(), "type", "authenticated",
                    "expires_at", expiresAt.getEpochSecond(), "attachment", false));
            if (signed == null || !"https".equals(URI.create(signed).getScheme())) {
                throw new IllegalStateException("Invalid certificate download URL.");
            }
            return signed;
        } catch (Exception exception) {
            // SDK exceptions can contain signing inputs; no retained cause, logging or URL fallback.
            throw new UploadFailedException("Certificate delivery failed.");
        }
    }

    private static String imageFormat(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new IllegalArgumentException("Missing certificate format.");
        }
        String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!java.util.Set.of("jpg", "jpeg", "png", "webp", "gif").contains(extension)) {
            throw new IllegalArgumentException("Unsupported certificate format.");
        }
        return extension;
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
