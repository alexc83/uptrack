package com.ccruce.backend.dto.response;

public record AuthResponseDto(
        String token,
        UserResponseDto user
) {
}
