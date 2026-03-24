package com.ccruce.backend.dto.request;

import com.ccruce.backend.enums.CredentialType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CredentialRequestDto(
        @NotBlank String name,
        @NotNull CredentialType type,
        @NotBlank String issuingOrganization,
        @NotNull LocalDate expirationDate,
        @NotNull @Min(1) Integer renewalCycleMonths,
        @NotNull @DecimalMin("0.0") BigDecimal requiredCEHours
) {
}
