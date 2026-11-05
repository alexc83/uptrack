package com.ccruce.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Phase 3 (#23) rollout gate — server-controlled, default OFF.
 * enabled=false (default): uploads use delivery type 'upload', permanent URLs stay in
 * upload/CE/report responses, and the authenticated delivery endpoint issues nothing.
 * enabled=true (only after the non-production pilot passes): new uploads are 'authenticated'.
 */
@ConfigurationProperties(prefix = "app.certificates.delivery")
public record CertificateDeliveryProperties(
        boolean enabled,
        long ttlSeconds
) {
    public CertificateDeliveryProperties {
        if (ttlSeconds < 1 || ttlSeconds > 3600) {
            throw new IllegalStateException("Certificate delivery TTL must be between 1 and 3600 seconds.");
        }
    }
}
