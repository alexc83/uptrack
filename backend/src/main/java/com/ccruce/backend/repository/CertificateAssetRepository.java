package com.ccruce.backend.repository;

import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateAssetRepository extends JpaRepository<CertificateAsset, UUID> {

    Optional<CertificateAsset> findByCeRecordId(UUID ceRecordId);

    List<CertificateAsset> findByUserId(UUID userId);

    @Query("select a from CertificateAsset a where a.status = 'RESERVED' and a.uploadedAt < :cutoff order by a.uploadedAt")
    List<CertificateAsset> findReservationsOlderThan(@Param("cutoff") OffsetDateTime cutoff, Pageable pageable);

    /** Guarded attach: succeeds only for a PENDING asset owned by the user. 0 rows = not attachable. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'ATTACHED', a.ceRecordId = :ceRecordId, a.attachedAt = :now "
            + "where a.id = :id and a.userId = :userId and a.status = 'PENDING'")
    int attachIfPending(@Param("id") UUID id, @Param("userId") UUID userId,
                        @Param("ceRecordId") UUID ceRecordId, @Param("now") OffsetDateTime now);

    /** Adopt a reservation after the provider existence probe confirmed the asset exists. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'PENDING', a.deliveryUrl = :deliveryUrl, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED'")
    int adoptReservation(@Param("id") UUID id, @Param("deliveryUrl") String deliveryUrl, @Param("now") OffsetDateTime now);

    /** Definitive provider rejection (4xx): no asset can exist. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'UPLOAD_FAILED', a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED'")
    int markDefinitivelyFailed(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    /** Uncertain outcome: keep RESERVED and schedule the reconciliation probe. */
    @Modifying
    @Query("update CertificateAsset a set a.nextRetryAt = :nextRetryAt, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED'")
    int scheduleReconciliation(@Param("id") UUID id, @Param("nextRetryAt") OffsetDateTime nextRetryAt, @Param("now") OffsetDateTime now);

    /** Confirmed upload: RESERVED -> PENDING with the delivery metadata. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'PENDING', a.deliveryUrl = :deliveryUrl, a.originalFilename = :originalFilename, a.updatedAt = :now "
            + "where a.id = :id and a.userId = :userId and a.status = 'RESERVED'")
    int markUploaded(@Param("id") UUID id, @Param("userId") UUID userId, @Param("deliveryUrl") String deliveryUrl,
                     @Param("originalFilename") String originalFilename, @Param("now") OffsetDateTime now);

    /** Managed asset detached from a CE record (replace/remove/delete): durable cleanup takes over in Phase 2. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'PENDING_DELETION', a.ceRecordId = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'ATTACHED' and a.ceRecordId = :ceRecordId")
    int markPendingDeletionForCeRecord(@Param("id") UUID id, @Param("ceRecordId") UUID ceRecordId, @Param("now") OffsetDateTime now);

    @Query("select a from CertificateAsset a where a.status = :status and a.userId = :userId")
    List<CertificateAsset> findByStatusAndUserId(@Param("status") AssetStatus status, @Param("userId") UUID userId);
}
