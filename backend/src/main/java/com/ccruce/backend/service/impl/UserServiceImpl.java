package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.UserRequestDto;
import com.ccruce.backend.dto.response.UserResponseDto;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.UserService;
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
    public UserResponseDto updateUser(UUID id, UserRequestDto requestDto) {
        User user = getExistingUser(id);
        ensureEmailAvailable(requestDto.email(), id);
        applyRequest(user, requestDto);

        return toResponse(userRepository.save(user));
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
                    throw new BadRequestException("Email is already in use.");
                });
    }

    private void applyRequest(User user, UserRequestDto requestDto) {
        user.setName(requestDto.name());
        user.setEmail(normalizeEmail(requestDto.email()));
        user.setPassword(passwordEncoder.encode(requestDto.password()));
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
