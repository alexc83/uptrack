package com.ccruce.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import com.ccruce.backend.validation.BcryptPassword;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequestDto(
        @NotBlank @BcryptPassword String currentPassword,
        @NotBlank @Size(min = 8) @BcryptPassword String newPassword
) {
}
