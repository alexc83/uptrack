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
import com.ccruce.backend.service.CertificateUploadService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class CERecordServiceImpl implements CERecordService {

    private static final Set<String> ALLOWED_CERTIFICATE_RESOURCE_TYPES = Set.of("raw", "image");

    private final CERecordRepository ceRecordRepository;
    private final CredentialRepository credentialRepository;
    private final UserRepository userRepository;
    private final CertificateUploadService certificateUploadService;

    public CERecordServiceImpl(
            CERecordRepository ceRecordRepository,
            CredentialRepository credentialRepository,
            UserRepository userRepository,
            CertificateUploadService certificateUploadService
    ) {
        this.ceRecordRepository = ceRecordRepository;
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
        this.certificateUploadService = certificateUploadService;
    }

    @Override
    @Transactional
    public CERecordResponseDto createCERecord(CERecordRequestDto requestDto) {
        Credential credential = getExistingCredential(requestDto.credentialId());
        User user = getAuthenticatedUser();
        ensureCredentialBelongsToUser(credential, user);
        validateCertificateMetadata(requestDto, user.getId());

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
    @Transactional
    public CERecordResponseDto updateCERecord(UUID id, CERecordRequestDto requestDto) {
        CERecord ceRecord = getExistingCERecord(id);
        Credential credential = getExistingCredential(requestDto.credentialId());
        User user = getAuthenticatedUser();
        ensureCERecordBelongsToUser(ceRecord, user);
        ensureCredentialBelongsToUser(credential, user);
        validateCertificateMetadata(requestDto, user.getId());

        String previousCertificatePublicId = normalizeCertificateValue(ceRecord.getCertificatePublicId());
        String previousCertificateResourceType = normalizeCertificateValue(ceRecord.getCertificateResourceType());
        applyRequest(ceRecord, requestDto, credential, user);
        CERecordResponseDto response = toResponse(ceRecordRepository.save(ceRecord));
        deletePriorCertificateIfReplacedOrRemoved(
                previousCertificatePublicId,
                previousCertificateResourceType,
                requestDto
        );

        return response;
    }

    @Override
    @Transactional
    public void deleteCERecord(UUID id) {
        CERecord ceRecord = getExistingCERecord(id);
        ensureCERecordBelongsToUser(ceRecord, getAuthenticatedUser());
        deleteStoredCertificateIfPresent(ceRecord);
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
        ceRecord.setCertificateUrl(normalizeCertificateValue(requestDto.certificateUrl()));
        ceRecord.setCertificatePublicId(normalizeCertificateValue(requestDto.certificatePublicId()));
        ceRecord.setCertificateResourceType(normalizeCertificateValue(requestDto.certificateResourceType()));
        ceRecord.setCertificateOriginalFilename(normalizeCertificateValue(requestDto.certificateOriginalFilename()));
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
                ceRecord.getCertificateUrl(),
                ceRecord.getCertificatePublicId(),
                ceRecord.getCertificateResourceType(),
                ceRecord.getCertificateOriginalFilename()
        );
    }

    private void validateCertificateMetadata(CERecordRequestDto requestDto, UUID userId) {
        String certificateUrl = normalizeCertificateValue(requestDto.certificateUrl());
        String certificatePublicId = normalizeCertificateValue(requestDto.certificatePublicId());
        String certificateResourceType = normalizeCertificateValue(requestDto.certificateResourceType());

        if (certificatePublicId == null && certificateResourceType == null) {
            return;
        }

        if (certificateUrl == null || certificatePublicId == null || certificateResourceType == null) {
            throw new BadRequestException("Certificate metadata is incomplete.");
        }

        if (!certificatePublicId.startsWith("uptrack/users/%s/certificates/".formatted(userId))) {
            throw new BadRequestException("Certificate asset does not belong to the authenticated user.");
        }

        if (!ALLOWED_CERTIFICATE_RESOURCE_TYPES.contains(certificateResourceType)) {
            throw new BadRequestException("Unsupported certificate resource type.");
        }
    }

    private void deletePriorCertificateIfReplacedOrRemoved(
            String previousCertificatePublicId,
            String previousCertificateResourceType,
            CERecordRequestDto requestDto
    ) {
        if (previousCertificatePublicId == null || previousCertificateResourceType == null) {
            return;
        }

        String nextCertificatePublicId = normalizeCertificateValue(requestDto.certificatePublicId());
        if (previousCertificatePublicId.equals(nextCertificatePublicId)) {
            return;
        }

        certificateUploadService.deleteCertificate(previousCertificatePublicId, previousCertificateResourceType);
    }

    private void deleteStoredCertificateIfPresent(CERecord ceRecord) {
        String certificatePublicId = normalizeCertificateValue(ceRecord.getCertificatePublicId());
        String certificateResourceType = normalizeCertificateValue(ceRecord.getCertificateResourceType());
        if (certificatePublicId == null || certificateResourceType == null) {
            return;
        }

        certificateUploadService.deleteCertificate(certificatePublicId, certificateResourceType);
    }

    private String normalizeCertificateValue(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
