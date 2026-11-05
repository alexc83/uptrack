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

    /**
     * Reservations eligible for a reconciliation probe: old enough (grace cutoff), retry time due
     * (never probe a newly reserved or backed-off asset prematurely), and not currently leased by
     * another worker (expired leases are re-claimable, which is also the restart-recovery path).
     */
    @Query("select a from CertificateAsset a where a.status = 'RESERVED' and a.uploadedAt < :cutoff "
            + "and (a.nextRetryAt is null or a.nextRetryAt <= :now) "
            + "and (a.leaseExpiresAt is null or a.leaseExpiresAt <= :now) order by a.uploadedAt")
    List<CertificateAsset> findEligibleReservations(@Param("cutoff") OffsetDateTime cutoff, @Param("now") OffsetDateTime now, Pageable pageable);

    /** Guarded claim: succeeds only when the reservation is still RESERVED and unleased/lease-expired. */
    @Modifying
    @Query("update CertificateAsset a set a.lockedBy = :worker, a.lockedAt = :now, a.leaseExpiresAt = :leaseUntil, "
            + "a.leaseToken = :token, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED' and (a.leaseExpiresAt is null or a.leaseExpiresAt <= :now)")
    int claimReservation(@Param("id") UUID id, @Param("worker") String worker, @Param("token") UUID token,
                         @Param("now") OffsetDateTime now, @Param("leaseUntil") OffsetDateTime leaseUntil);

    /** Fenced adopt: only the lease holder can transition; a stale worker writes 0 rows. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'PENDING', a.deliveryUrl = :deliveryUrl, a.nextRetryAt = null, "
            + "a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int adoptReservation(@Param("id") UUID id, @Param("token") UUID token, @Param("deliveryUrl") String deliveryUrl, @Param("now") OffsetDateTime now);

    /** Fenced definitive failure after the probe confirmed absence. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'UPLOAD_FAILED', "
            + "a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int markDefinitivelyFailedFenced(@Param("id") UUID id, @Param("token") UUID token, @Param("now") OffsetDateTime now);

    /** Fenced probe failure: bounded backoff, sanitized failure class, lease released for the next run. */
    @Modifying
    @Query("update CertificateAsset a set a.cleanupAttempts = a.cleanupAttempts + 1, a.lastFailureClass = :failureClass, "
            + "a.nextRetryAt = :nextRetryAt, a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, "
            + "a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'RESERVED' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int registerProbeFailure(@Param("id") UUID id, @Param("token") UUID token, @Param("failureClass") String failureClass,
                             @Param("nextRetryAt") OffsetDateTime nextRetryAt, @Param("now") OffsetDateTime now);

    /** Phase 1 interim deletion: synchronous best-effort destroy already done; record DELETED. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'DELETED', a.ceRecordId = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING_DELETION'")
    int markDeleted(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    /** Guarded attach: succeeds only for a PENDING asset owned by the user. 0 rows = not attachable. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'ATTACHED', a.ceRecordId = :ceRecordId, a.attachedAt = :now "
            + "where a.id = :id and a.userId = :userId and a.status = 'PENDING'")
    int attachIfPending(@Param("id") UUID id, @Param("userId") UUID userId,
                        @Param("ceRecordId") UUID ceRecordId, @Param("now") OffsetDateTime now);

    /** Definitive provider rejection (4xx) at upload time: no asset can exist. */
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

    // ---- Phase 2 durable cleanup (issue #20) ----

    /** Deletions eligible for the worker: due retry, no active lease (expired leases are re-claimable). */
    @Query("select a from CertificateAsset a where a.status = 'PENDING_DELETION' "
            + "and (a.nextRetryAt is null or a.nextRetryAt <= :now) "
            + "and (a.leaseExpiresAt is null or a.leaseExpiresAt <= :now) order by a.nextRetryAt")
    List<CertificateAsset> findEligibleDeletions(@Param("now") OffsetDateTime now, Pageable pageable);

    /** Guarded lease claim; committed before any provider call. 0 rows = another worker holds it. */
    @Modifying
    @Query("update CertificateAsset a set a.lockedBy = :worker, a.lockedAt = :now, a.leaseExpiresAt = :leaseUntil, "
            + "a.leaseToken = :token, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING_DELETION' and (a.leaseExpiresAt is null or a.leaseExpiresAt <= :now)")
    int claimDeletion(@Param("id") UUID id, @Param("worker") String worker, @Param("token") UUID token,
                      @Param("now") OffsetDateTime now, @Param("leaseUntil") OffsetDateTime leaseUntil);

    /** Fenced completion: only the lease holder can transition; stale workers write 0 rows. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'DELETED', a.ceRecordId = null, "
            + "a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING_DELETION' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int markDeletedFenced(@Param("id") UUID id, @Param("token") UUID token, @Param("now") OffsetDateTime now);

    /** Fenced failure: bounded backoff, sanitized class, lease released. */
    @Modifying
    @Query("update CertificateAsset a set a.cleanupAttempts = a.cleanupAttempts + 1, a.lastFailureClass = :failureClass, "
            + "a.nextRetryAt = :nextRetryAt, a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, "
            + "a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING_DELETION' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int registerCleanupFailureFenced(@Param("id") UUID id, @Param("token") UUID token, @Param("failureClass") String failureClass,
                                    @Param("nextRetryAt") OffsetDateTime nextRetryAt, @Param("now") OffsetDateTime now);

    /** Fenced terminal state after retry exhaustion: asset kept, owner investigation required. */
    @Modifying
    @Query("update CertificateAsset a set a.status = 'CLEANUP_FAILED', a.lastFailureClass = :failureClass, "
            + "a.lockedBy = null, a.lockedAt = null, a.leaseExpiresAt = null, a.leaseToken = null, a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING_DELETION' and a.leaseToken = :token and a.leaseExpiresAt > :now")
    int markCleanupFailedFenced(@Param("id") UUID id, @Param("token") UUID token, @Param("failureClass") String failureClass,
                                @Param("now") OffsetDateTime now);

    /** Unattached uploads older than the grace period (24 h default). Guarded so an attachment race loses. */
    @Query("select a from CertificateAsset a where a.status = 'PENDING' and a.ceRecordId is null and a.uploadedAt < :cutoff")
    List<CertificateAsset> findAbandonedPending(@Param("cutoff") OffsetDateTime cutoff, Pageable pageable);

    @Modifying
    @Query("update CertificateAsset a set a.status = 'PENDING_DELETION', a.updatedAt = :now "
            + "where a.id = :id and a.status = 'PENDING' and a.ceRecordId is null and a.uploadedAt < :cutoff")
    int expireAbandoned(@Param("id") UUID id, @Param("cutoff") OffsetDateTime cutoff, @Param("now") OffsetDateTime now);

    @Query("select a from CertificateAsset a where a.status = :status order by a.uploadedAt")
    List<CertificateAsset> findAllByStatus(@Param("status") AssetStatus status, Pageable pageable);
}
