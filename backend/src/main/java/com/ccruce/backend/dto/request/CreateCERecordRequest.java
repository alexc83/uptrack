package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateCERecordRequest(
        @NotBlank String title,
        @NotBlank String provider,
        @NotNull @DecimalMin("0.0") BigDecimal hours,
        @NotNull LocalDate dateCompleted,
        String certificateUrl,
        @NotNull UUID credentialId
) {
}
