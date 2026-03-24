package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.AuthLoginRequestDto;
import com.ccruce.backend.dto.request.AuthRegisterRequestDto;
import com.ccruce.backend.dto.response.AuthResponseDto;
import com.ccruce.backend.dto.response.UserResponseDto;

public interface AuthService {

    AuthResponseDto register(AuthRegisterRequestDto requestDto);

    AuthResponseDto login(AuthLoginRequestDto requestDto);

    UserResponseDto getCurrentUser();
}
