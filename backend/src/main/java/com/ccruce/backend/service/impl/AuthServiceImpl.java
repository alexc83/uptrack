package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.AuthLoginRequestDto;
import com.ccruce.backend.dto.request.AuthRegisterRequestDto;
import com.ccruce.backend.dto.response.AuthResponseDto;
import com.ccruce.backend.dto.response.UserResponseDto;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.security.JwtService;
import com.ccruce.backend.service.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String dummyPasswordHash;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.dummyPasswordHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
    }

    @Override
    public AuthResponseDto register(AuthRegisterRequestDto requestDto) {
        String normalizedEmail = normalizeEmail(requestDto.email());
        userRepository.findByEmail(normalizedEmail)
                .ifPresent(user -> {
                    throw new BadRequestException("Email is already in use.");
                });

        User user = new User();
        user.setName(requestDto.name().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(requestDto.password()));

        User savedUser = userRepository.save(user);
        return buildAuthResponse(savedUser);
    }

    @Override
    public AuthResponseDto login(AuthLoginRequestDto requestDto) {
        String normalizedEmail = normalizeEmail(requestDto.email());

        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        boolean matches = passwordEncoder.matches(requestDto.password(), user == null ? dummyPasswordHash : user.getPassword());
        if (user == null || !matches) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        return buildAuthResponse(user);
    }

    @Override
    public UserResponseDto getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        User user = userRepository.findById(currentUser.id())
                .orElseThrow(() -> new UnauthorizedException("Authentication is required."));

        return toUserResponse(user);
    }

    private AuthResponseDto buildAuthResponse(User user) {
        return new AuthResponseDto(jwtService.generateToken(user), toUserResponse(user));
    }

    private UserResponseDto toUserResponse(User user) {
        return new UserResponseDto(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
