package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.repository.CredentialRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.CredentialService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class CredentialServiceImpl implements CredentialService {

    private static final int EXPIRATION_THRESHOLD_DAYS = 90;

    private final CredentialRepository credentialRepository;
    private final UserRepository userRepository;

    public CredentialServiceImpl(CredentialRepository credentialRepository, UserRepository userRepository) {
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
    }

    @Override
    public CredentialResponseDto createCredential(CredentialRequestDto requestDto) {
        User user = getExistingUser(requestDto.userId());

        Credential credential = new Credential();
        applyRequest(credential, requestDto, user);

        return toResponse(credentialRepository.save(credential));
    }

    @Override
    public List<CredentialResponseDto> getAllCredentials() {
        return credentialRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public CredentialResponseDto getCredentialById(UUID id) {
        return toResponse(getExistingCredential(id));
    }

    @Override
    public CredentialResponseDto updateCredential(UUID id, CredentialRequestDto requestDto) {
        Credential credential = getExistingCredential(id);
        User user = getExistingUser(requestDto.userId());
        applyRequest(credential, requestDto, user);

        return toResponse(credentialRepository.save(credential));
    }

    @Override
    public void deleteCredential(UUID id) {
        Credential credential = getExistingCredential(id);
        credentialRepository.delete(credential);
    }

    private Credential getExistingCredential(UUID id) {
        return credentialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Credential not found for id: " + id));
    }

    private User getExistingUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + id));
    }

    private void applyRequest(Credential credential, CredentialRequestDto requestDto, User user) {
        credential.setName(requestDto.name());
        credential.setType(requestDto.type());
        credential.setIssuingOrganization(requestDto.issuingOrganization());
        credential.setExpirationDate(requestDto.expirationDate());
        credential.setRenewalCycleMonths(requestDto.renewalCycleMonths());
        credential.setRequiredCEHours(requestDto.requiredCEHours());
        credential.setUser(user);
    }

    private CredentialResponseDto toResponse(Credential credential) {
        return new CredentialResponseDto(
                credential.getId(),
                credential.getName(),
                credential.getType(),
                credential.getIssuingOrganization(),
                credential.getExpirationDate(),
                credential.getRenewalCycleMonths(),
                credential.getRequiredCEHours(),
                deriveStatus(credential.getExpirationDate())
        );
    }

    private CredentialStatus deriveStatus(LocalDate expirationDate) {
        LocalDate today = LocalDate.now();

        if (expirationDate.isBefore(today)) {
            return CredentialStatus.EXPIRED;
        }

        if (!expirationDate.isAfter(today.plusDays(EXPIRATION_THRESHOLD_DAYS))) {
            return CredentialStatus.EXPIRING_SOON;
        }

        return CredentialStatus.ACTIVE;
    }
}
