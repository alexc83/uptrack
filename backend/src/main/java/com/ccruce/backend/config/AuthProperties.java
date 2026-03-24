package com.ccruce.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.jwt")
public record AuthProperties(
        String secret,
        long expirationSeconds
) {
}
