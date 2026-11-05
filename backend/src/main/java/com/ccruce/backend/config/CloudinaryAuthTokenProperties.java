package com.ccruce.backend.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Separate token-authentication key, never an API-secret fallback or a diagnostic value. */
@ConfigurationProperties(prefix = "cloudinary.auth-token")
public record CloudinaryAuthTokenProperties(@JsonIgnore String key) {

    public void validateFor(CertificateDeliveryProperties delivery) {
        // Validate after binding: binding/Bean Validation errors can echo rejected secret values.
        if (delivery.enabled() && (key == null || !key.matches("(?:[0-9a-fA-F]{2}){16,64}"))) {
            throw new IllegalStateException("Cloudinary token-authentication key must be 16–64 bytes encoded as hex when certificate delivery is enabled.");
        }
    }

    @Override
    public String toString() {
        return "CloudinaryAuthTokenProperties[key=REDACTED]";
    }
}
