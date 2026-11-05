package com.ccruce.backend.service.impl;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.enums.FailureClass;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.CertificateAssetService;
import com.cloudinary.Cloudinary;
import com.cloudinary.api.exceptions.NotFound;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateAssetServiceImpl implements CertificateAssetService {

    private static final Logger log = LoggerFactory.getLogger(CertificateAssetServiceImpl.class);

    /** Probe retries are bounded: exponential backoff capped at 24 h so outages never cause tight polling. */
    public static final int MAX_PROBE_ATTEMPTS = 20;
    static final long MAX_BACKOFF_SECONDS = 24 * 3600;
    static final long BASE_BACKOFF_SECONDS = 60;

    private final CertificateAssetRepository repository;
    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final long reconciliationDelaySeconds;
    private final long leaseSeconds;

    public CertificateAssetServiceImpl(CertificateAssetRepository repository,
            Cloudinary cloudinary,
            CloudinaryProperties cloudinaryProperties,
            @Value("${app.upload.reconciliation-delay-seconds:60}") long reconciliationDelaySeconds,
            @Value("${app.upload.reservation-lease-seconds:300}") long leaseSeconds) {
        this.repository = repository;
        this.cloudinary = cloudinary;
        this.cloudinaryProperties = cloudinaryProperties;
        this.reconciliationDelaySeconds = reconciliationDelaySeconds;
        this.leaseSeconds = leaseSeconds;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CertificateAsset reserve(UUID userId, String resourceType, String originalFilename) {
        CertificateAsset asset = new CertificateAsset();
        asset.setUserId(userId);
        // Server-generated identity: the client never supplies a Cloudinary public ID.
        asset.setPublicId("uptrack/users/%s/certificates/%s".formatted(userId, UUID.randomUUID()));
        asset.setResourceType(resourceType);
        asset.setDeliveryType("upload");
        asset.setCloudName(cloudinaryProperties.cloudName());
        asset.setStatus(AssetStatus.RESERVED);
        // Persisted at reservation time (Finding 3): the client filename is authoritative and must
        // survive a crash/recovery, because the provider does not retain it (use_filename=false).
        asset.setOriginalFilename(originalFilename);
        return repository.save(asset);
    }

    @Override
    @Transactional
    public boolean markUploaded(UUID assetId, UUID userId, String deliveryUrl, String originalFilename) {
        return repository.markUploaded(assetId, userId, deliveryUrl, originalFilename, OffsetDateTime.now()) == 1;
    }

    @Override
    @Transactional
    public void markDefinitivelyFailed(UUID assetId) {
        repository.markDefinitivelyFailed(assetId, OffsetDateTime.now());
    }

    @Override
    @Transactional
    public void markDefinitivelyFailed(UUID assetId, UUID leaseToken) {
        repository.markDefinitivelyFailedFenced(assetId, leaseToken, OffsetDateTime.now());
    }

    @Override
    @Transactional
    public void scheduleReconciliation(UUID assetId) {
        repository.scheduleReconciliation(assetId, OffsetDateTime.now().plusSeconds(reconciliationDelaySeconds), OffsetDateTime.now());
    }

    @Override
    @Transactional
    public UUID claimReservation(CertificateAsset asset, String workerId) {
        UUID token = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        int claimed = repository.claimReservation(asset.getId(), workerId, token, now, now.plusSeconds(leaseSeconds));
        return claimed == 1 ? token : null;
    }

    @Override
    @Transactional
    public void adoptFromProbe(CertificateAsset asset, UUID leaseToken, Map<String, Object> providerResource) {
        String deliveryUrl = buildDeliveryUrl(providerResource, asset.getResourceType());
        repository.adoptReservation(asset.getId(), leaseToken, deliveryUrl, OffsetDateTime.now());
    }

    @Override
    @Transactional
    public void registerProbeFailure(CertificateAsset asset, UUID leaseToken, String failureClass) {
        int attempts = asset.getCleanupAttempts() + 1;
        long backoffSeconds = attempts >= MAX_PROBE_ATTEMPTS
                ? MAX_BACKOFF_SECONDS
                : Math.min(BASE_BACKOFF_SECONDS << Math.min(attempts - 1, 20), MAX_BACKOFF_SECONDS);
        repository.registerProbeFailure(asset.getId(), leaseToken, failureClass,
                OffsetDateTime.now().plusSeconds(backoffSeconds), OffsetDateTime.now());
        log.warn("Cloudinary existence probe failed for reservation {} (attempt {}); next retry in {}s.",
                asset.getId(), attempts, backoffSeconds);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CertificateAsset> findOwnedAsset(UUID assetId, UUID userId) {
        return repository.findById(assetId).filter(asset -> asset.getUserId().equals(userId));
    }

    @Override
    @Transactional
    public void attach(UUID assetId, UUID userId, UUID ceRecordId) {
        int updated = repository.attachIfPending(assetId, userId, ceRecordId, OffsetDateTime.now());
        if (updated == 0) {
            // Owned but not PENDING (e.g. already attached to another CE record): duplicate attachment.
            throw new ConflictException("Certificate asset is already attached to a CE record.");
        }
    }

    @Override
    @Transactional
    public void markPendingDeletion(UUID assetId, UUID ceRecordId) {
        repository.markPendingDeletionForCeRecord(assetId, ceRecordId, OffsetDateTime.now());
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markDeleted(UUID assetId) {
        // REQUIRES_NEW: called from an afterCommit hook, where the request transaction's
        // thread-locals may still be bound; a fresh transaction keeps the @Modifying update valid.
        repository.markDeleted(assetId, OffsetDateTime.now());
    }

    @Override
    public ProbeResult probeAtProvider(CertificateAsset asset) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resource = (Map<String, Object>) cloudinary.api().resource(
                    asset.getPublicId(), Map.of("resource_type", asset.getResourceType()));
            return new ProbeResult(true, true, resource, null);
        } catch (NotFound notFound) {
            return new ProbeResult(true, false, null, null);
        } catch (Exception exception) {
            log.warn("Cloudinary existence probe failed; reservation stays for retry.");
            return new ProbeResult(false, false, null, classifyFailure(exception));
        }
    }

    /** Delivery URL for a recovered asset: raw assets need the format suffix, mirroring upload-time handling. */
    private static String buildDeliveryUrl(Map<String, Object> resource, String resourceType) {
        Object secureUrl = resource.get("secure_url");
        if (!(secureUrl instanceof String url) || url.isBlank()) {
            return null;
        }
        if (!"raw".equals(resourceType)) {
            return url;
        }
        Object format = resource.get("format");
        if (format instanceof String f && !f.isBlank()
                && !url.toLowerCase(Locale.ROOT).endsWith("." + f.toLowerCase(Locale.ROOT))) {
            return url + "." + f;
        }
        return url;
    }

    private static String classifyFailure(Exception exception) {
        if (exception instanceof SocketTimeoutException) {
            return FailureClass.PROVIDER_TIMEOUT.name();
        }
        if (exception instanceof IOException) {
            return FailureClass.NETWORK.name();
        }
        return FailureClass.UNKNOWN.name();
    }
}
