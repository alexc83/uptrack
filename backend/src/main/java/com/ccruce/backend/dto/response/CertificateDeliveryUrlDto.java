package com.ccruce.backend.dto.response;

import java.time.Instant;

public record CertificateDeliveryUrlDto(
        String url,
        Instant expiresAt
) {
}
