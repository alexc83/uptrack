package com.ccruce.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

public record UserResponseDto(
        UUID id,
        String name,
        String email,
        Instant createdAt
) {
}
