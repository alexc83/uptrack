package com.ccruce.backend.service.impl;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.enums.FailureClass;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.CertificateAssetService.DestroyResult;
import com.cloudinary.Cloudinary;
import com.cloudinary.api.exceptions.NotFound;
import org.slf4j.Logger;
import org.springframework.data.domain.PageRequest;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.OffsetDateTime;
import java.util.List;
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
    private final long leaseSeconds;          // reservation sweeper lease (Phase 1)
    private final long cleanupLeaseSeconds;   // cleanup worker lease (Phase 2)
    private final int maxAttempts;

    public CertificateAssetServiceImpl(CertificateAssetRepository repository,
            Cloudinary cloudinary,
            CloudinaryProperties cloudinaryProperties,
            @Value("${app.upload.reconciliation-delay-seconds:60}") long reconciliationDelaySeconds,
            @Value("${app.upload.reservation-lease-seconds:300}") long leaseSeconds,
            @Value("${app.cleanup.lease-seconds:300}") long cleanupLeaseSeconds,
            @Value("${app.cleanup.max-attempts:10}") int maxAttempts) {
        this.repository = repository;
        this.cloudinary = cloudinary;
        this.cloudinaryProperties = cloudinaryProperties;
        this.reconciliationDelaySeconds = reconciliationDelaySeconds;
        this.leaseSeconds = leaseSeconds;
        this.cleanupLeaseSeconds = cleanupLeaseSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CertificateAsset reserve(UUID userId, String resourceType, String originalFilename, String deliveryType) {
        CertificateAsset asset = new CertificateAsset();
        asset.setUserId(userId);
        // Server-generated identity: the client never supplies a Cloudinary public ID.
        // The extension is part of a raw asset's identity, not a delivery-time suffix.
        String suffix = "raw".equals(resourceType) ? ".pdf" : "";
        asset.setPublicId("uptrack/users/%s/certificates/%s%s".formatted(userId, UUID.randomUUID(), suffix));
        asset.setResourceType(resourceType);
        asset.setDeliveryType(deliveryType);
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
        if (!CloudinaryAssetIdentity.matches(asset, providerResource)) {
            throw new IllegalArgumentException("Provider certificate identity mismatch.");
        }
        String deliveryUrl = buildDeliveryUrl(providerResource);
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
    @Transactional(readOnly = true)
    public String exposedCertificateUrl(CERecord record) {
        if (record.getCertificateAssetId() == null) {
            return record.getCertificateUrl();
        }
        // NB: Optional.map with a null result would collapse to empty — use an explicit check.
        return repository.findById(record.getCertificateAssetId())
                .filter(asset -> "authenticated".equals(asset.getDeliveryType()))
                .isPresent() ? null : record.getCertificateUrl();
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

    // ---- Phase 2 durable cleanup (issue #20) ----

    /** Retry schedule in seconds: 5 min → 15 min → 1 h → 4 h → 24 h cap. */
    public static final long[] RETRY_SCHEDULE_SECONDS = {300, 900, 3600, 14400, 86400};

    @Override
    @Transactional
    public UUID claimDeletion(CertificateAsset asset, String workerId) {
        UUID token = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        int claimed = repository.claimDeletion(asset.getId(), workerId, token, now, now.plusSeconds(cleanupLeaseSeconds));
        return claimed == 1 ? token : null;
    }

    /**
     * Provider destroy with explicit response validation (SDK contract: the returned map carries
     * {@code result}); "ok" = deleted, "not found" = already gone, an "error" payload or exception =
     * failure, anything else = ambiguous and retryable. Never treats a mere non-throwing return as
     * proof of deletion.
     */
    @Override
    public DestroyResult destroyAtProvider(CertificateAsset asset) {
        Map<String, Object> response;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) cloudinary.uploader().destroy(asset.getPublicId(),
                    Map.of("resource_type", asset.getResourceType(), "type", asset.getDeliveryType(), "invalidate", true));
            response = result;
        } catch (Exception exception) {
            if (isNotFound(exception)) {
                return new DestroyResult(DestroyResult.Outcome.NOT_FOUND, null);
            }
            log.warn("Cloudinary destroy failed for asset {}.", asset.getId());
            return new DestroyResult(DestroyResult.Outcome.FAILED, classifyFailure(exception));
        }
        if (response == null) {
            return new DestroyResult(DestroyResult.Outcome.AMBIGUOUS, FailureClass.UNKNOWN.name());
        }
        Object result = response.get("result");
        if ("ok".equals(result)) {
            return new DestroyResult(DestroyResult.Outcome.DELETED, null);
        }
        if ("not found".equals(result)) {
            return new DestroyResult(DestroyResult.Outcome.NOT_FOUND, null);
        }
        Object error = response.get("error");
        if (error != null) {
            return new DestroyResult(DestroyResult.Outcome.FAILED, classifyErrorPayload(error));
        }
        log.warn("Cloudinary destroy returned an unexpected response for asset {}.", asset.getId());
        return new DestroyResult(DestroyResult.Outcome.AMBIGUOUS, FailureClass.UNKNOWN.name());
    }

    private static String classifyErrorPayload(Object error) {
        if (error instanceof Map<?, ?> errorMap && errorMap.get("http_code") instanceof Number code) {
            return code.intValue() >= 400 && code.intValue() < 500
                    ? FailureClass.PROVIDER_4XX.name()
                    : FailureClass.PROVIDER_5XX.name();
        }
        return FailureClass.UNKNOWN.name();
    }

    private static boolean isNotFound(Throwable throwable) {
        for (Throwable current = throwable; current != null; current = current.getCause()) {
            if (current instanceof NotFound) {
                return true;
            }
        }
        return false;
    }

    @Override
    @Transactional
    public void completeDeletion(UUID assetId, UUID leaseToken) {
        repository.markDeletedFenced(assetId, leaseToken, OffsetDateTime.now());
    }

    @Override
    @Transactional
    public void registerCleanupFailure(CertificateAsset asset, UUID leaseToken, String failureClass) {
        int attempts = asset.getCleanupAttempts() + 1;
        OffsetDateTime now = OffsetDateTime.now();
        if (attempts >= maxAttempts) {
            repository.markCleanupFailedFenced(asset.getId(), leaseToken, failureClass, now);
            log.error("Certificate asset {} exhausted {} cleanup attempts; marked CLEANUP_FAILED for owner investigation.",
                    asset.getId(), maxAttempts);
            return;
        }
        long delaySeconds = RETRY_SCHEDULE_SECONDS[Math.min(attempts - 1, RETRY_SCHEDULE_SECONDS.length - 1)];
        repository.registerCleanupFailureFenced(asset.getId(), leaseToken, failureClass,
                now.plusSeconds(delaySeconds), now);
    }

    @Override
    @Transactional
    public int expireAbandonedUploads(OffsetDateTime graceCutoff) {
        int expired = 0;
        for (CertificateAsset asset : repository.findAbandonedPending(graceCutoff, PageRequest.of(0, 100))) {
            expired += repository.expireAbandoned(asset.getId(), graceCutoff, OffsetDateTime.now());
        }
        return expired;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateAsset> findEligibleDeletions(OffsetDateTime now, int batchSize) {
        return repository.findEligibleDeletions(now, PageRequest.of(0, batchSize));
    }

    @Override
    public ProbeResult probeAtProvider(CertificateAsset asset) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resource = (Map<String, Object>) cloudinary.api().resource(
                    asset.getPublicId(), Map.of("resource_type", asset.getResourceType(), "type", asset.getDeliveryType()));
            if (!CloudinaryAssetIdentity.matches(asset, resource)) {
                return new ProbeResult(false, false, null, FailureClass.UNKNOWN.name());
            }
            return new ProbeResult(true, true, resource, null);
        } catch (NotFound notFound) {
            return new ProbeResult(true, false, null, null);
        } catch (Exception exception) {
            log.warn("Cloudinary existence probe failed; reservation stays for retry.");
            return new ProbeResult(false, false, null, classifyFailure(exception));
        }
    }

    /** Keep the provider's URL unchanged; never fabricate a second raw identity. */
    private static String buildDeliveryUrl(Map<String, Object> resource) {
        Object secureUrl = resource.get("secure_url");
        return secureUrl instanceof String url && !url.isBlank() ? url : null;
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
