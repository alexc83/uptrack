package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;

import java.util.List;
import java.util.UUID;

public interface CredentialService {

    CredentialResponseDto createCredential(CredentialRequestDto requestDto);

    List<CredentialResponseDto> getAllCredentials();

    CredentialResponseDto getCredentialById(UUID id);

    CredentialResponseDto updateCredential(UUID id, CredentialRequestDto requestDto);

    void deleteCredential(UUID id);
}
