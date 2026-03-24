package com.ccruce.backend.dto.response;

import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CEReportCredentialDto(
        UUID id,
        String name,
        CredentialType type,
        String issuingOrganization,
        LocalDate expirationDate,
        BigDecimal requiredCEHours,
        CredentialStatus status
) {
}
