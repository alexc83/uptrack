package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import com.ccruce.backend.enums.CredentialType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CredentialRequestDto(
        @NotBlank @Size(max = 180) String name,
        @NotNull CredentialType type,
        @NotBlank @Size(max = 180) String issuingOrganization,
        @NotNull LocalDate expirationDate,
        @NotNull @Min(1) @Max(1200) Integer renewalCycleMonths,
        @NotNull @DecimalMin("0.0") @Digits(integer = 3, fraction = 2) BigDecimal requiredCEHours
) {
}
