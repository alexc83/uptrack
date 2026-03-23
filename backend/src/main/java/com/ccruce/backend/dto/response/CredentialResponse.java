package com.ccruce.backend.dto.response;

import com.ccruce.backend.enums.CredentialType;

import java.time.LocalDate;
import java.util.UUID;

public record CredentialResponse(
        UUID id,
        String name,
        CredentialType type,
        String issuingOrganization,
        LocalDate expirationDate,
        Integer renewalCycleMonths,
        Integer requiredCEHours
) {
}
