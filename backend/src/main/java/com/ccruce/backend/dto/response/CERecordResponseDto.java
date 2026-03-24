package com.ccruce.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CERecordResponseDto(
        UUID id,
        String title,
        String provider,
        BigDecimal hours,
        LocalDate dateCompleted,
        String certificateUrl,
        String certificatePublicId,
        String certificateResourceType,
        String certificateOriginalFilename
) {
}
