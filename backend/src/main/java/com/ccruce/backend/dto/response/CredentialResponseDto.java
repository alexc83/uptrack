package com.ccruce.backend.dto.response;

import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CredentialResponseDto(
        UUID id,
        String name,
        CredentialType type,
        String issuingOrganization,
        LocalDate expirationDate,
        Integer renewalCycleMonths,
        BigDecimal requiredCEHours,
        CredentialStatus status,
        BigDecimal ceHoursEarned,
        BigDecimal ceProgress,
        List<CERecordResponseDto> ceRecords
) {
}
