package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CERecordRequestDto(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 180) String provider,
        @NotNull @DecimalMin("0.0") BigDecimal hours,
        @NotNull LocalDate dateCompleted,
        @Size(max = 500) String certificateUrl,
        @NotNull UUID credentialId,
        @NotNull UUID userId
) {
}
