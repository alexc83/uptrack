package com.ccruce.backend.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record DashboardActivityResponseDto(
        UUID id,
        UUID credentialId,
        String title,
        String subtitle,
        String icon,
        LocalDate activityDate
) {
}
