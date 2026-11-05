package com.ccruce.backend.entity;

import com.ccruce.backend.enums.AssetStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Server-controlled registry of a Cloudinary certificate asset (Phase 1, issue #24).
 * The internal {@link #id} is the only asset reference exposed to clients; Cloudinary
 * public IDs are never trusted from client input. Cloudinary never participates in a
 * database transaction: state transitions are committed before/after provider calls.
 */
@Entity
@Table(name = "certificate_assets",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_certificate_assets_cloud_identity",
                columnNames = {"cloud_name", "resource_type", "public_id"}),
        indexes = {
                @Index(name = "ix_certificate_assets_status_retry", columnList = "status, next_retry_at, lease_expires_at"),
                @Index(name = "ix_certificate_assets_user", columnList = "user_id"),
                @Index(name = "ix_certificate_assets_ce_record", columnList = "ce_record_id", unique = true)
        })
public class CertificateAsset {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** At most one CE record per asset; plain UUID (no circular FK), enforced by the unique index. */
    @Column(name = "ce_record_id")
    private UUID ceRecordId;

    @Column(name = "public_id", nullable = false, length = 255)
    private String publicId;

    @Column(name = "resource_type", nullable = false, length = 16)
    private String resourceType;

    @Column(name = "delivery_type", nullable = false, length = 32)
    private String deliveryType = "upload";

    @Column(name = "cloud_name", nullable = false, length = 128)
    private String cloudName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AssetStatus status = AssetStatus.RESERVED;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    @Column(name = "attached_at")
    private OffsetDateTime attachedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "cleanup_attempts", nullable = false)
    private int cleanupAttempts;

    @Column(name = "next_retry_at")
    private OffsetDateTime nextRetryAt;

    /** Sanitized FailureClass name only; never a raw provider message. */
    @Column(name = "last_failure_class", length = 64)
    private String lastFailureClass;

    // Durable lease for the Phase 2 cleanup worker; lease_token fences stale workers.
    @Column(name = "locked_by", length = 64)
    private String lockedBy;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @Column(name = "lease_expires_at")
    private OffsetDateTime leaseExpiresAt;

    @Column(name = "lease_token")
    private UUID leaseToken;

    // Dual-identity migration links (Phase 4): old and new assets keep independent durable identities.
    @Column(name = "migrated_from_asset_id")
    private UUID migratedFromAssetId;

    @Column(name = "superseded_by_asset_id")
    private UUID supersededByAssetId;

    @Column(name = "migrated_from_public_id", length = 255)
    private String migratedFromPublicId;

    @Column(name = "migrated_from_resource_type", length = 16)
    private String migratedFromResourceType;

    /** Permanent delivery URL captured at upload so existing viewing keeps working until Phase 3. */
    @Column(name = "delivery_url", length = 500)
    private String deliveryUrl;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (uploadedAt == null) {
            uploadedAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getCeRecordId() {
        return ceRecordId;
    }

    public void setCeRecordId(UUID ceRecordId) {
        this.ceRecordId = ceRecordId;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getDeliveryType() {
        return deliveryType;
    }

    public void setDeliveryType(String deliveryType) {
        this.deliveryType = deliveryType;
    }

    public String getCloudName() {
        return cloudName;
    }

    public void setCloudName(String cloudName) {
        this.cloudName = cloudName;
    }

    public AssetStatus getStatus() {
        return status;
    }

    public void setStatus(AssetStatus status) {
        this.status = status;
    }

    public OffsetDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(OffsetDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public OffsetDateTime getAttachedAt() {
        return attachedAt;
    }

    public void setAttachedAt(OffsetDateTime attachedAt) {
        this.attachedAt = attachedAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public int getCleanupAttempts() {
        return cleanupAttempts;
    }

    public void setCleanupAttempts(int cleanupAttempts) {
        this.cleanupAttempts = cleanupAttempts;
    }

    public OffsetDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(OffsetDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    public String getLastFailureClass() {
        return lastFailureClass;
    }

    public void setLastFailureClass(String lastFailureClass) {
        this.lastFailureClass = lastFailureClass;
    }

    public String getLockedBy() {
        return lockedBy;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public OffsetDateTime getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(OffsetDateTime lockedAt) {
        this.lockedAt = lockedAt;
    }

    public OffsetDateTime getLeaseExpiresAt() {
        return leaseExpiresAt;
    }

    public void setLeaseExpiresAt(OffsetDateTime leaseExpiresAt) {
        this.leaseExpiresAt = leaseExpiresAt;
    }

    public UUID getLeaseToken() {
        return leaseToken;
    }

    public void setLeaseToken(UUID leaseToken) {
        this.leaseToken = leaseToken;
    }

    public UUID getMigratedFromAssetId() {
        return migratedFromAssetId;
    }

    public void setMigratedFromAssetId(UUID migratedFromAssetId) {
        this.migratedFromAssetId = migratedFromAssetId;
    }

    public UUID getSupersededByAssetId() {
        return supersededByAssetId;
    }

    public void setSupersededByAssetId(UUID supersededByAssetId) {
        this.supersededByAssetId = supersededByAssetId;
    }

    public String getMigratedFromPublicId() {
        return migratedFromPublicId;
    }

    public void setMigratedFromPublicId(String migratedFromPublicId) {
        this.migratedFromPublicId = migratedFromPublicId;
    }

    public String getMigratedFromResourceType() {
        return migratedFromResourceType;
    }

    public void setMigratedFromResourceType(String migratedFromResourceType) {
        this.migratedFromResourceType = migratedFromResourceType;
    }

    public String getDeliveryUrl() {
        return deliveryUrl;
    }

    public void setDeliveryUrl(String deliveryUrl) {
        this.deliveryUrl = deliveryUrl;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }
}
