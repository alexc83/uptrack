package com.ccruce.backend.enums;

/**
 * Sanitized cleanup/upload failure classification. Never store raw provider messages;
 * only this enum is persisted in {@code last_failure_class}.
 */
public enum FailureClass {
    PROVIDER_TIMEOUT,
    PROVIDER_5XX,
    PROVIDER_4XX,
    NETWORK,
    UNKNOWN
}
