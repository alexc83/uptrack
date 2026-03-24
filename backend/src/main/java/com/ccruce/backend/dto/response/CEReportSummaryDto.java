package com.ccruce.backend.dto.response;

import java.math.BigDecimal;

public record CEReportSummaryDto(
        BigDecimal totalHoursEarned,
        BigDecimal remainingHours,
        Integer recordCount,
        BigDecimal progress
) {
}
