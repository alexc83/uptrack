package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthLoginRequestDto(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
