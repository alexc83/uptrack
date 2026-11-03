package com.ccruce.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.jwt")
public record AuthProperties(
        String secret,
        long expirationSeconds
) {
    public static final long MAX_LIFETIME_SECONDS = 3600;

    public AuthProperties {
        if (secret == null || secret.isBlank()
                || secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT signing secret must contain at least 32 UTF-8 bytes.");
        }
        if (expirationSeconds < 1 || expirationSeconds > MAX_LIFETIME_SECONDS) {
            throw new IllegalStateException("JWT lifetime must be between 1 and 3600 seconds.");
        }
    }
}
