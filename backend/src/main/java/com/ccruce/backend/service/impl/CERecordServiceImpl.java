package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.CERecordRequestDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.exception.BadRequestException;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.CredentialRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CERecordService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CERecordServiceImpl implements CERecordService {

    private final CERecordRepository ceRecordRepository;
    private final CredentialRepository credentialRepository;
    private final UserRepository userRepository;

    public CERecordServiceImpl(
            CERecordRepository ceRecordRepository,
            CredentialRepository credentialRepository,
            UserRepository userRepository
    ) {
        this.ceRecordRepository = ceRecordRepository;
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
    }

    @Override
    public CERecordResponseDto createCERecord(CERecordRequestDto requestDto) {
        Credential credential = getExistingCredential(requestDto.credentialId());
        User user = getAuthenticatedUser();
        ensureCredentialBelongsToUser(credential, user);

        CERecord ceRecord = new CERecord();
        applyRequest(ceRecord, requestDto, credential, user);

        return toResponse(ceRecordRepository.save(ceRecord));
    }

    @Override
    public List<CERecordResponseDto> getAllCERecords() {
        return ceRecordRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public CERecordResponseDto getCERecordById(UUID id) {
        return toResponse(getExistingCERecord(id));
    }

    @Override
    public CERecordResponseDto updateCERecord(UUID id, CERecordRequestDto requestDto) {
        CERecord ceRecord = getExistingCERecord(id);
        Credential credential = getExistingCredential(requestDto.credentialId());
        User user = getAuthenticatedUser();
        ensureCERecordBelongsToUser(ceRecord, user);
        ensureCredentialBelongsToUser(credential, user);
        applyRequest(ceRecord, requestDto, credential, user);

        return toResponse(ceRecordRepository.save(ceRecord));
    }

    @Override
    public void deleteCERecord(UUID id) {
        CERecord ceRecord = getExistingCERecord(id);
        ensureCERecordBelongsToUser(ceRecord, getAuthenticatedUser());
        ceRecordRepository.delete(ceRecord);
    }

    private CERecord getExistingCERecord(UUID id) {
        return ceRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CE record not found for id: " + id));
    }

    private Credential getExistingCredential(UUID id) {
        return credentialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Credential not found for id: " + id));
    }

    private User getExistingUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for id: " + id));
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return getExistingUser(currentUser.id());
    }

    private void ensureCredentialBelongsToUser(Credential credential, User user) {
        if (!credential.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Credential does not belong to the specified user.");
        }
    }

    private void ensureCERecordBelongsToUser(CERecord ceRecord, User user) {
        if (!ceRecord.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("CE record not found for id: " + ceRecord.getId());
        }
    }

    private void applyRequest(CERecord ceRecord, CERecordRequestDto requestDto, Credential credential, User user) {
        ceRecord.setTitle(requestDto.title());
        ceRecord.setProvider(requestDto.provider());
        ceRecord.setHours(requestDto.hours());
        ceRecord.setDateCompleted(requestDto.dateCompleted());
        ceRecord.setCertificateUrl(requestDto.certificateUrl());
        ceRecord.setCredential(credential);
        ceRecord.setUser(user);
    }

    private CERecordResponseDto toResponse(CERecord ceRecord) {
        return new CERecordResponseDto(
                ceRecord.getId(),
                ceRecord.getTitle(),
                ceRecord.getProvider(),
                ceRecord.getHours(),
                ceRecord.getDateCompleted(),
                ceRecord.getCertificateUrl()
        );
    }
}
