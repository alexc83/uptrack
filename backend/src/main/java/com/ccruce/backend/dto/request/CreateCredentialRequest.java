package com.ccruce.backend.dto.request;

import com.ccruce.backend.enums.CredentialType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateCredentialRequest(
        @NotBlank String name,
        @NotNull CredentialType type,
        @NotBlank String issuingOrganization,
        @NotNull LocalDate expirationDate,
        @NotNull @Min(1) Integer renewalCycleMonths,
        @NotNull @Min(0) Integer requiredCEHours
) {
}
