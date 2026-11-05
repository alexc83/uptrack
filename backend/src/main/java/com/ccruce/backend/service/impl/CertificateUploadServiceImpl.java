package com.ccruce.backend.service.impl;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.validation.CertificateFileValidator;
import com.ccruce.backend.dto.response.CertificateUploadResponseDto;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.exception.UploadBusyException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CertificateUploadService;
import com.cloudinary.Cloudinary;
import com.cloudinary.api.exceptions.AlreadyExists;
import com.cloudinary.api.exceptions.BadRequest;
import com.cloudinary.api.exceptions.NotAllowed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Semaphore;

@Service
public class CertificateUploadServiceImpl implements CertificateUploadService {

    private static final Logger log = LoggerFactory.getLogger(CertificateUploadServiceImpl.class);

    private final Cloudinary cloudinary;
    private final CertificateFileValidator fileValidator;
    private final CertificateAssetService assetService;
    // Bounds concurrent decode+upload work (image decode can use ~160 MB per 40 Mpx
    // frame). tryAcquire never queues: when all slots are busy the request is rejected
    // with 503 instead of letting one client block everyone else.
    private final Semaphore uploadSlots;

    public CertificateUploadServiceImpl(Cloudinary cloudinary,
            CertificateFileValidator fileValidator,
            CertificateAssetService assetService,
            @Value("${app.upload.max-concurrent:4}") int maxConcurrentUploads) {
        if (maxConcurrentUploads < 1) throw new IllegalStateException("Upload concurrency must be positive.");
        this.cloudinary = cloudinary;
        this.fileValidator = fileValidator;
        this.assetService = assetService;
        this.uploadSlots = new Semaphore(maxConcurrentUploads);
    }

    @Override
    public CertificateUploadResponseDto uploadCertificate(MultipartFile file) {
        if (!uploadSlots.tryAcquire()) {
            throw new UploadBusyException();
        }
        try {
            return doUploadCertificate(file);
        } finally {
            uploadSlots.release();
        }
    }

    private CertificateUploadResponseDto doUploadCertificate(MultipartFile file) {
        byte[] bytes = fileValidator.validate(file);

        UUID userId = getAuthenticatedUserId();
        String originalFilename = file.getOriginalFilename();
        String resourceType = determineResourceType(file);

        // Phase 1 (#24): reserve the asset identity in PostgreSQL (committed) BEFORE the provider
        // call, so a crash/timeout after a successful upload is recoverable via the Admin API probe.
        // A database failure here means no provider call was ever made: clean failure, nothing to clean.
        CertificateAsset reservation;
        try {
            reservation = assetService.reserve(userId, resourceType);
        } catch (RuntimeException exception) {
            log.warn("Certificate asset reservation failed before provider call.");
            throw new UploadFailedException("Certificate upload failed.");
        }

        Map<String, Object> uploadResult;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    bytes,
                    buildUploadOptions(reservation, resourceType)
            );
            uploadResult = result;
        } catch (IOException | RuntimeException exception) {
            handleProviderFailure(reservation, exception);
            throw new UploadFailedException("Certificate upload failed.");
        }

        Object providerError = uploadResult.get("error");
        if (providerError != null) {
            if (providerError instanceof Map<?, ?> errorMap && isClientErrorCode(errorMap.get("http_code"))) {
                assetService.markDefinitivelyFailed(reservation.getId());
            } else {
                assetService.scheduleReconciliation(reservation.getId());
            }
            log.warn("Cloudinary certificate upload rejected by provider.");
            throw new UploadFailedException("Certificate upload failed.");
        }

        String returnedResourceType;
        String secureUrl;
        try {
            returnedResourceType = getRequiredString(uploadResult, "resource_type");
            getRequiredString(uploadResult, "public_id");
            secureUrl = getRequiredString(uploadResult, "secure_url");
        } catch (UploadFailedException exception) {
            // Uncertain outcome: the asset may exist; reconcile via the existence probe.
            assetService.scheduleReconciliation(reservation.getId());
            throw exception;
        }

        assetService.markUploaded(reservation.getId(), userId, buildAssetUrl(uploadResult, returnedResourceType), originalFilename);

        return new CertificateUploadResponseDto(
                reservation.getId(),
                buildAssetUrl(uploadResult, returnedResourceType),
                getRequiredString(uploadResult, "public_id"),
                originalFilename,
                returnedResourceType
        );
    }

    /** Definitive rejections (provider 4xx) fail the reservation; timeouts/IO/unknown stay RESERVED for the probe. */
    private void handleProviderFailure(CertificateAsset reservation, Exception exception) {
        if (isDefinitiveRejection(exception)) {
            assetService.markDefinitivelyFailed(reservation.getId());
            log.warn("Cloudinary certificate upload definitively rejected (4xx).");
        } else {
            assetService.scheduleReconciliation(reservation.getId());
            log.warn("Cloudinary certificate upload outcome uncertain; reservation scheduled for reconciliation.");
        }
    }

    private static boolean isDefinitiveRejection(Throwable throwable) {
        for (Throwable current = throwable; current != null; current = current.getCause()) {
            if (current instanceof BadRequest || current instanceof NotAllowed || current instanceof AlreadyExists) {
                return true;
            }
        }
        return false;
    }

    private static boolean isClientErrorCode(Object httpCode) {
        if (httpCode instanceof Number number) {
            int code = number.intValue();
            return code >= 400 && code < 500;
        }
        return false;
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
            log.warn("Cloudinary certificate cleanup failed (provider).");
            throw new UploadFailedException("Certificate cleanup failed.");
        } catch (RuntimeException exception) {
            log.warn("Cloudinary certificate cleanup failed (provider).");
            throw new UploadFailedException("Certificate cleanup failed.");
        }
    }

    private Map<String, Object> buildUploadOptions(CertificateAsset reservation, String resourceType) {
        // The reserved public_id already contains the per-user folder; overwrite is disabled so a
        // retried upload can never replace a different asset.
        return Map.of(
                "public_id", reservation.getPublicId(),
                "resource_type", resourceType,
                "use_filename", false,
                "unique_filename", false,
                "overwrite", false,
                "allowed_formats", List.of("pdf", "jpg", "jpeg", "png", "webp", "gif")
        );
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
