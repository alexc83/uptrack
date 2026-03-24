package com.ccruce.backend.dto.response;

public record DashboardStatsResponseDto(
        int totalCredentials,
        int activeCount,
        int expiringSoonCount,
        int expiredCount,
        int needsCEAttentionCount
) {
}
