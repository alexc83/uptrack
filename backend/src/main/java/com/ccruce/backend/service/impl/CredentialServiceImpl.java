package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.request.CredentialRequestDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.enums.CredentialType;
import com.ccruce.backend.exception.ResourceNotFoundException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.CredentialRepository;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.service.CredentialService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class CredentialServiceImpl implements CredentialService {

    private static final int EXPIRATION_THRESHOLD_DAYS = 90;

    private final CredentialRepository credentialRepository;
    private final CERecordRepository ceRecordRepository;
    private final UserRepository userRepository;

    public CredentialServiceImpl(
            CredentialRepository credentialRepository,
            CERecordRepository ceRecordRepository,
            UserRepository userRepository
    ) {
        this.credentialRepository = credentialRepository;
        this.ceRecordRepository = ceRecordRepository;
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
    public List<CredentialResponseDto> getAllCredentials(
            UUID userId,
            CredentialStatus status,
            CredentialType type,
            String search
    ) {
        return getCredentialsForQuery(userId, type)
                .stream()
                .filter(credential -> status == null || deriveStatus(credential.getExpirationDate()) == status)
                .filter(credential -> matchesSearch(credential, search))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public CredentialResponseDto getCredentialById(UUID id) {
        return toResponse(getExistingCredential(id));
    }

    @Override
    public List<CERecordResponseDto> getCredentialCERecords(UUID id) {
        Credential credential = getExistingCredential(id);
        return getCERecordsForCredential(credential)
                .stream()
                .map(this::toCERecordResponse)
                .toList();
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
        if (userId != null && type != null) {
            return credentialRepository.findAllByUserIdAndType(userId, type);
        }

        if (userId != null) {
            return credentialRepository.findAllByUserId(userId);
        }

        return credentialRepository.findAll()
                .stream()
                .filter(credential -> type == null || credential.getType() == type)
                .toList();
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

    private CERecordResponseDto toCERecordResponse(CERecord ceRecord) {
        return new CERecordResponseDto(
                ceRecord.getId(),
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
