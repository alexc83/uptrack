package com.ccruce.backend.controller;

import com.ccruce.backend.dto.request.ChangePasswordRequestDto;
import com.ccruce.backend.dto.request.UpdateProfileRequestDto;
import com.ccruce.backend.dto.response.UserResponseDto;
import com.ccruce.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getCurrentUserProfile() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponseDto> updateCurrentUserProfile(
            @Valid @RequestBody UpdateProfileRequestDto requestDto
    ) {
        return ResponseEntity.ok(userService.updateCurrentUserProfile(requestDto));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changeCurrentUserPassword(
            @Valid @RequestBody ChangePasswordRequestDto requestDto
    ) {
        userService.changeCurrentUserPassword(requestDto);
        return ResponseEntity.noContent().build();
    }
}
