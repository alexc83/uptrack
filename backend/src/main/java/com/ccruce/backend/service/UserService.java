package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.ChangePasswordRequestDto;
import com.ccruce.backend.dto.request.UpdateProfileRequestDto;
import com.ccruce.backend.dto.response.UserResponseDto;

public interface UserService {

    UserResponseDto getCurrentUserProfile();

    UserResponseDto updateCurrentUserProfile(UpdateProfileRequestDto requestDto);

    void changeCurrentUserPassword(ChangePasswordRequestDto requestDto);
}
