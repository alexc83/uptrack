package com.ccruce.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CEReportRecordDto(
        String title,
        String provider,
        BigDecimal hours,
        LocalDate dateCompleted,
        String certificateUrl
) {
}
