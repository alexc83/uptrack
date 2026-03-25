package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.ChangePasswordRequestDto;
import com.ccruce.backend.dto.request.UpdateProfileRequestDto;
import com.ccruce.backend.dto.request.UserRequestDto;
import com.ccruce.backend.dto.response.UserResponseDto;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.ConflictException;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserResponseDto createUser(UserRequestDto requestDto) {
        ensureEmailAvailable(requestDto.email(), null);

        User user = new User();
        applyRequest(user, requestDto);

        return toResponse(userRepository.save(user));
    }

    @Override
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public UserResponseDto getUserById(UUID id) {
        return toResponse(getExistingUser(id));
    }

    @Override
    public UserResponseDto getCurrentUserProfile() {
        return toResponse(getAuthenticatedUser());
    }

    @Override
    public UserResponseDto updateUser(UUID id, UserRequestDto requestDto) {
        User user = getExistingUser(id);
        ensureEmailAvailable(requestDto.email(), id);
        applyRequest(user, requestDto);

        return toResponse(userRepository.save(user));
    }

    @Override
    public UserResponseDto updateCurrentUserProfile(UpdateProfileRequestDto requestDto) {
        User user = getAuthenticatedUser();
        ensureEmailAvailable(requestDto.email(), user.getId());
        applyProfileUpdate(user, requestDto);

        return toResponse(userRepository.save(user));
    }

    @Override
    public void changeCurrentUserPassword(ChangePasswordRequestDto requestDto) {
        User user = getAuthenticatedUser();

        if (!passwordEncoder.matches(requestDto.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }

        if (requestDto.currentPassword().equals(requestDto.newPassword())) {
            throw new BadRequestException("New password must be different from the current password.");
        }

        user.setPassword(passwordEncoder.encode(requestDto.newPassword()));
        userRepository.save(user);
    }

    @Override
    public void deleteUser(UUID id) {
        User user = getExistingUser(id);
        userRepository.delete(user);
    }

    private User getExistingUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + id));
    }

    private void ensureEmailAvailable(String email, UUID currentUserId) {
        userRepository.findByEmail(normalizeEmail(email))
                .filter(user -> !user.getId().equals(currentUserId))
                .ifPresent(user -> {
                    throw new ConflictException("Email is already in use.");
                });
    }

    private void applyRequest(User user, UserRequestDto requestDto) {
        user.setName(normalizeName(requestDto.name()));
        user.setEmail(normalizeEmail(requestDto.email()));
        user.setPassword(passwordEncoder.encode(requestDto.password()));
    }

    private void applyProfileUpdate(User user, UpdateProfileRequestDto requestDto) {
        user.setName(normalizeName(requestDto.name()));
        user.setEmail(normalizeEmail(requestDto.email()));
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return getExistingUser(currentUser.id());
    }

    private String normalizeName(String name) {
        return name.trim();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private UserResponseDto toResponse(User user) {
        return new UserResponseDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt()
        );
    }
}
