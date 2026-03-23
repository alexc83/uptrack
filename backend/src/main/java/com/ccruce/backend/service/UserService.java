package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.UserRequestDto;
import com.ccruce.backend.dto.response.UserResponseDto;

import java.util.List;
import java.util.UUID;

public interface UserService {

    UserResponseDto createUser(UserRequestDto requestDto);

    List<UserResponseDto> getAllUsers();

    UserResponseDto getUserById(UUID id);

    UserResponseDto updateUser(UUID id, UserRequestDto requestDto);

    void deleteUser(UUID id);
}
