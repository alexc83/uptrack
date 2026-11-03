package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.ccruce.backend.validation.BcryptPassword;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequestDto(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8) @BcryptPassword String password
) {
}
