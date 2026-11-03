package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.ccruce.backend.validation.BcryptPassword;

public record AuthLoginRequestDto(
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @BcryptPassword String password
) {
}
