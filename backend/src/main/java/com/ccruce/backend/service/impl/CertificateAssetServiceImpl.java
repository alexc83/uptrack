package com.ccruce.backend.service.impl;

import com.ccruce.backend.config.CloudinaryProperties;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
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

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateAssetServiceImpl implements CertificateAssetService {

    private static final Logger log = LoggerFactory.getLogger(CertificateAssetServiceImpl.class);

    private final CertificateAssetRepository repository;
    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final long reconciliationDelaySeconds;

    public CertificateAssetServiceImpl(CertificateAssetRepository repository,
            Cloudinary cloudinary,
            CloudinaryProperties cloudinaryProperties,
            @Value("${app.upload.reconciliation-delay-seconds:60}") long reconciliationDelaySeconds) {
        this.repository = repository;
        this.cloudinary = cloudinary;
        this.cloudinaryProperties = cloudinaryProperties;
        this.reconciliationDelaySeconds = reconciliationDelaySeconds;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CertificateAsset reserve(UUID userId, String resourceType) {
        CertificateAsset asset = new CertificateAsset();
        asset.setUserId(userId);
        // Server-generated identity: the client never supplies a Cloudinary public ID.
        asset.setPublicId("uptrack/users/%s/certificates/%s".formatted(userId, UUID.randomUUID()));
        asset.setResourceType(resourceType);
        asset.setDeliveryType("upload");
        asset.setCloudName(cloudinaryProperties.cloudName());
        asset.setStatus(AssetStatus.RESERVED);
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
    public void scheduleReconciliation(UUID assetId) {
        repository.scheduleReconciliation(assetId, OffsetDateTime.now().plusSeconds(reconciliationDelaySeconds), OffsetDateTime.now());
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
    public ProbeResult probeAtProvider(CertificateAsset asset) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resource = (Map<String, Object>) cloudinary.api().resource(
                    asset.getPublicId(), Map.of("resource_type", asset.getResourceType()));
            Object secureUrl = resource.get("secure_url");
            return new ProbeResult(true, true, secureUrl instanceof String s ? s : null);
        } catch (NotFound notFound) {
            return new ProbeResult(true, false, null);
        } catch (Exception exception) {
            log.warn("Cloudinary existence probe failed; reservation stays for retry.");
            return new ProbeResult(false, false, null);
        }
    }

    @Override
    @Transactional
    public void adoptFromProbe(CertificateAsset asset, String secureUrl) {
        repository.adoptReservation(asset.getId(), secureUrl, OffsetDateTime.now());
    }
}
