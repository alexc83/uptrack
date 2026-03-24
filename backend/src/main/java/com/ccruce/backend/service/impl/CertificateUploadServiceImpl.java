package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CertificateUploadService;
import com.cloudinary.Cloudinary;
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

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    Map.of(
                            "folder", "uptrack/users/%s/certificates".formatted(userId),
                            "resource_type", "auto",
                            "use_filename", true,
                            "unique_filename", true,
                            "overwrite", false
                    )
            );

            return new CertificateUploadResponseDto(
                    getRequiredString(uploadResult, "secure_url"),
                    getRequiredString(uploadResult, "public_id"),
                    originalFilename,
                    getRequiredString(uploadResult, "resource_type")
            );
        } catch (IOException exception) {
            throw new UploadFailedException("Certificate upload failed.");
        } catch (RuntimeException exception) {
            throw new UploadFailedException("Certificate upload failed.");
        }
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

    private String getRequiredString(Map<String, Object> result, String key) {
        Object value = result.get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }

        throw new UploadFailedException("Certificate upload failed.");
    }
}
