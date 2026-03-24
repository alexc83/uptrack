package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CertificateUploadService;
import com.cloudinary.Cloudinary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CertificateUploadServiceImpl implements CertificateUploadService {

    private static final Logger log = LoggerFactory.getLogger(CertificateUploadServiceImpl.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf",
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif"
    );

    private final Cloudinary cloudinary;

    public CertificateUploadServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public CertificateUploadResponseDto uploadCertificate(MultipartFile file) {
        validateFile(file);

        UUID userId = getAuthenticatedUserId();
        String originalFilename = file.getOriginalFilename();
        String resourceType = determineResourceType(file);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    buildUploadOptions(userId, originalFilename, resourceType)
            );

            String returnedResourceType = getRequiredString(uploadResult, "resource_type");

            return new CertificateUploadResponseDto(
                    buildAssetUrl(uploadResult, returnedResourceType),
                    getRequiredString(uploadResult, "public_id"),
                    originalFilename,
                    returnedResourceType
            );
        } catch (IOException exception) {
            log.error("Cloudinary certificate upload failed while reading file bytes for user {}", userId, exception);
            throw new UploadFailedException("Certificate upload failed.");
        } catch (RuntimeException exception) {
            log.error("Cloudinary certificate upload failed for user {}", userId, exception);
            throw new UploadFailedException("Certificate upload failed.");
        }
    }

    @Override
    public void deleteCertificate(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank() || resourceType == null || resourceType.isBlank()) {
            return;
        }

        try {
            cloudinary.uploader().destroy(
                    publicId,
                    Map.of(
                            "resource_type", resourceType,
                            "invalidate", true
                    )
            );
        } catch (IOException exception) {
            log.error("Cloudinary certificate delete failed for asset {}", publicId, exception);
            throw new UploadFailedException("Certificate cleanup failed.");
        } catch (RuntimeException exception) {
            log.error("Cloudinary certificate delete failed for asset {}", publicId, exception);
            throw new UploadFailedException("Certificate cleanup failed.");
        }
    }

    private Map<String, Object> buildUploadOptions(UUID userId, String originalFilename, String resourceType) {
        return Map.of(
                "folder", "uptrack/users/%s/certificates".formatted(userId),
                "resource_type", resourceType,
                "use_filename", true,
                "unique_filename", true,
                "overwrite", false,
                "filename_override", originalFilename == null ? "certificate-upload" : originalFilename
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null) {
            throw new BadRequestException("Certificate file is required.");
        }

        if (file.isEmpty()) {
            throw new BadRequestException("Certificate file must not be empty.");
        }

        String originalFilename = file.getOriginalFilename();
        String contentType = file.getContentType();
        String extension = extractExtension(originalFilename);

        boolean allowedContentType = contentType != null && ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT));
        boolean allowedExtension = extension != null && ALLOWED_EXTENSIONS.contains(extension);

        if (!allowedContentType && !allowedExtension) {
            throw new BadRequestException("Unsupported certificate file type. Allowed types: PDF, JPG, JPEG, PNG, WEBP, GIF.");
        }
    }

    private UUID getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return currentUser.id();
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank() || !originalFilename.contains(".")) {
            return null;
        }

        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private String determineResourceType(MultipartFile file) {
        String contentType = file.getContentType();
        String extension = extractExtension(file.getOriginalFilename());

        if ("application/pdf".equalsIgnoreCase(contentType) || "pdf".equals(extension)) {
            return "raw";
        }

        return "image";
    }

    private String buildAssetUrl(Map<String, Object> uploadResult, String resourceType) {
        String secureUrl = getRequiredString(uploadResult, "secure_url");

        if (!"raw".equals(resourceType)) {
            return secureUrl;
        }

        String format = getOptionalString(uploadResult, "format");
        if (format == null || secureUrl.toLowerCase(Locale.ROOT).endsWith("." + format.toLowerCase(Locale.ROOT))) {
            return secureUrl;
        }

        return secureUrl + "." + format;
    }

    private String getRequiredString(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }

        throw new UploadFailedException("Certificate upload failed.");
    }

    private String getOptionalString(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }

        return null;
    }
}
