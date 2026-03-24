package com.ccruce.backend.dto.response;

import java.util.List;

public record DashboardResponseDto(
        DashboardStatsResponseDto stats,
        List<CredentialResponseDto> upcomingExpirations,
        List<CredentialResponseDto> ceAttention,
        List<DashboardActivityResponseDto> recentActivity
) {
}
