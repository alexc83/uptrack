package com.ccruce.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CERecordResponse(
        UUID id,
        String title,
        String provider,
        BigDecimal hours,
        LocalDate dateCompleted,
        String certificateUrl,
        UUID credentialId
) {
}
