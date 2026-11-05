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
        String certificateOriginalFilename,
        // Phase 1 (#24): additive fields; existing URL fields stay until Phase 3 (safeguard 1).
        UUID certificateAssetId,
        String certificateClassification
) {
}
