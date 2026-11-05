package com.ccruce.backend.enums;

/**
 * Explicit classification of a CE record's certificate metadata (Phase 1 safeguard 2):
 * historical rows are never automatically trusted as verified managed assets.
 */
public enum CertificateClassification {
    /** Attached through the registry by asset UUID; server-verified. */
    MANAGED_VERIFIED,
    /** Historical URL/public-ID metadata not yet reconciled against the registry. */
    LEGACY_UNVERIFIED,
    /** Historical external HTTPS link, intentionally preserved. */
    EXTERNAL_LINK
}
