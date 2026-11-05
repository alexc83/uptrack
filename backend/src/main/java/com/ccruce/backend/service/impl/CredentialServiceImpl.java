package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CEReportCredentialDto;
import com.ccruce.backend.dto.response.CEReportRecordDto;
import com.ccruce.backend.dto.response.CEReportResponseDto;
import com.ccruce.backend.dto.response.CEReportSummaryDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.CredentialRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.CertificateAssetService;
import com.ccruce.backend.service.CredentialService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class CredentialServiceImpl implements CredentialService {

    private static final int EXPIRATION_THRESHOLD_DAYS = 90;

    private final CredentialRepository credentialRepository;
    private final CERecordRepository ceRecordRepository;
    private final UserRepository userRepository;
    private final CertificateAssetService certificateAssetService;

    public CredentialServiceImpl(
            CredentialRepository credentialRepository,
            CERecordRepository ceRecordRepository,
            UserRepository userRepository,
            CertificateAssetService certificateAssetService
    ) {
        this.credentialRepository = credentialRepository;
        this.ceRecordRepository = ceRecordRepository;
        this.userRepository = userRepository;
        this.certificateAssetService = certificateAssetService;
    }

    @Override
    public CredentialResponseDto createCredential(CredentialRequestDto requestDto) {
        User user = getAuthenticatedUser();

        Credential credential = new Credential();
        applyRequest(credential, requestDto, user);

        return toResponse(credentialRepository.save(credential));
    }

    @Override
    public List<CredentialResponseDto> getAllCredentials(
            CredentialStatus status,
            CredentialType type,
            String search
    ) {
        return getCredentialsForQuery(getAuthenticatedUser().getId(), type)
                .stream()
                .filter(credential -> status == null || deriveStatus(credential.getExpirationDate()) == status)
                .filter(credential -> matchesSearch(credential, search))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public CredentialResponseDto getCredentialById(UUID id) {
        Credential credential = getExistingCredential(id);
        ensureCredentialBelongsToAuthenticatedUser(credential);
        return toResponse(credential);
    }

    @Override
    public List<CERecordResponseDto> getCredentialCERecords(UUID id) {
        Credential credential = getExistingCredential(id);
        ensureCredentialBelongsToAuthenticatedUser(credential);
        return getCERecordsForCredential(credential)
                .stream()
                .map(this::toCERecordResponse)
                .toList();
    }

    @Override
    public CEReportResponseDto getCredentialCEReport(UUID id) {
        Credential credential = getExistingCredential(id);
        ensureCredentialBelongsToAuthenticatedUser(credential);

        List<CERecord> orderedRecords = getCERecordsForCredential(credential)
                .stream()
                .sorted(Comparator.comparing(CERecord::getDateCompleted).reversed())
                .toList();
        BigDecimal ceHoursEarned = calculateCEHoursEarned(orderedRecords);
        BigDecimal progress = calculateCEProgress(ceHoursEarned, credential.getRequiredCEHours());

        return new CEReportResponseDto(
                new CEReportCredentialDto(
                        credential.getId(),
                        credential.getName(),
                        credential.getType(),
                        credential.getIssuingOrganization(),
                        credential.getExpirationDate(),
                        credential.getRequiredCEHours(),
                        deriveStatus(credential.getExpirationDate())
                ),
                new CEReportSummaryDto(
                        ceHoursEarned,
                        calculateRemainingHours(ceHoursEarned, credential.getRequiredCEHours()),
                        orderedRecords.size(),
                        progress
                ),
                orderedRecords.stream()
                        .map(this::toCEReportRecord)
                        .toList()
        );
    }

    @Override
    public CredentialResponseDto updateCredential(UUID id, CredentialRequestDto requestDto) {
        Credential credential = getExistingCredential(id);
        User user = getAuthenticatedUser();
        ensureCredentialBelongsToUser(credential, user);
        applyRequest(credential, requestDto, user);

        return toResponse(credentialRepository.save(credential));
    }

    /**
     * Phase 2 (issue #20, D01-W04): before the JPA cascade removes the credential's CE records, mark
     * their MANAGED certificate assets PENDING_DELETION in the same transaction, so the durable cleanup
     * worker removes them independently of the deleted rows. Legacy publicId-only metadata stays
     * LEGACY_UNVERIFIED and is never auto-registered or auto-deleted here — historical assets are
     * reconciled only in Phase 4 with owner approval.
     */
    @Override
    @Transactional
    public void deleteCredential(UUID id) {
        Credential credential = getExistingCredential(id);
        ensureCredentialBelongsToAuthenticatedUser(credential);
        for (CERecord ceRecord : ceRecordRepository.findAllByCredentialId(credential.getId())) {
            if (ceRecord.getCertificateAssetId() != null) {
                certificateAssetService.markPendingDeletion(ceRecord.getCertificateAssetId(), ceRecord.getId());
            }
        }
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

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return getExistingUser(currentUser.id());
    }

    private void ensureCredentialBelongsToAuthenticatedUser(Credential credential) {
        ensureCredentialBelongsToUser(credential, getAuthenticatedUser());
    }

    private void ensureCredentialBelongsToUser(Credential credential, User user) {
        if (!credential.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Credential not found for id: " + credential.getId());
        }
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
        List<CERecord> ceRecords = getCERecordsForCredential(credential);
        BigDecimal ceHoursEarned = calculateCEHoursEarned(ceRecords);

        return new CredentialResponseDto(
                credential.getId(),
                credential.getName(),
                credential.getType(),
                credential.getIssuingOrganization(),
                credential.getExpirationDate(),
                credential.getRenewalCycleMonths(),
                credential.getRequiredCEHours(),
                deriveStatus(credential.getExpirationDate()),
                ceHoursEarned,
                calculateCEProgress(ceHoursEarned, credential.getRequiredCEHours()),
                ceRecords.stream().map(this::toCERecordResponse).toList()
        );
    }

    private List<Credential> getCredentialsForQuery(UUID userId, CredentialType type) {
        if (type != null) {
            return credentialRepository.findAllByUserIdAndType(userId, type);
        }

        return credentialRepository.findAllByUserId(userId);
    }

    private boolean matchesSearch(Credential credential, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }

        String normalizedSearch = search.toLowerCase();
        return credential.getName().toLowerCase().contains(normalizedSearch)
                || credential.getIssuingOrganization().toLowerCase().contains(normalizedSearch);
    }

    private List<CERecord> getCERecordsForCredential(Credential credential) {
        return ceRecordRepository.findAllByCredentialId(credential.getId());
    }

    private BigDecimal calculateCEHoursEarned(List<CERecord> ceRecords) {
        return ceRecords.stream()
                .map(CERecord::getHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateCEProgress(BigDecimal ceHoursEarned, BigDecimal requiredCEHours) {
        if (requiredCEHours == null || requiredCEHours.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return ceHoursEarned.divide(requiredCEHours, 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateRemainingHours(BigDecimal ceHoursEarned, BigDecimal requiredCEHours) {
        if (requiredCEHours == null || requiredCEHours.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal remainingHours = requiredCEHours.subtract(ceHoursEarned);
        return remainingHours.max(BigDecimal.ZERO);
    }

    private CERecordResponseDto toCERecordResponse(CERecord ceRecord) {
        return new CERecordResponseDto(
                ceRecord.getId(),
                ceRecord.getTitle(),
                ceRecord.getProvider(),
                ceRecord.getHours(),
                ceRecord.getDateCompleted(),
                ceRecord.getCertificateUrl(),
                ceRecord.getCertificatePublicId(),
                ceRecord.getCertificateResourceType(),
                ceRecord.getCertificateOriginalFilename(),
                ceRecord.getCertificateAssetId(),
                ceRecord.getCertificateClassification()
        );
    }

    private CEReportRecordDto toCEReportRecord(CERecord ceRecord) {
        return new CEReportRecordDto(
                ceRecord.getTitle(),
                ceRecord.getProvider(),
                ceRecord.getHours(),
                ceRecord.getDateCompleted(),
                ceRecord.getCertificateUrl()
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
