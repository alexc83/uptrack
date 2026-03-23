package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;

import java.util.List;
import java.util.UUID;

public interface CredentialService {

    CredentialResponseDto createCredential(CredentialRequestDto requestDto);

    List<CredentialResponseDto> getAllCredentials(UUID userId, CredentialStatus status, CredentialType type, String search);

    CredentialResponseDto getCredentialById(UUID id);

    List<CERecordResponseDto> getCredentialCERecords(UUID id);

    CredentialResponseDto updateCredential(UUID id, CredentialRequestDto requestDto);

    void deleteCredential(UUID id);
}
