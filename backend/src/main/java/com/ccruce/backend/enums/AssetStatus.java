package com.ccruce.backend.enums;

/**
 * Lifecycle of a managed certificate asset in the {@code certificate_assets} registry.
 *
 * <p>RESERVED: identity persisted before the provider call; the provider outcome is unknown.
 * PENDING: confirmed uploaded, not attached to a CE record (24 h grace applies before cleanup eligibility).
 * ATTACHED: referenced by exactly one CE record (unique ce_record_id).
 * SUPERSEDED: replaced by a migrated authenticated copy (Phase 4); retired after the verification window.
 * PENDING_DELETION: confirmed deletion requested; durable cleanup processes it (Phase 2 worker).
 * DELETED / UPLOAD_FAILED / CLEANUP_FAILED: terminal states.
 */
public enum AssetStatus {
    RESERVED,
    PENDING,
    ATTACHED,
    SUPERSEDED,
    PENDING_DELETION,
    DELETED,
    UPLOAD_FAILED,
    CLEANUP_FAILED
}
