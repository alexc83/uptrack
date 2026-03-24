package com.ccruce.backend.service.impl;

import com.ccruce.backend.dto.response.CERecordResponseDto;
import com.ccruce.backend.dto.response.CredentialResponseDto;
import com.ccruce.backend.dto.response.DashboardActivityResponseDto;
import com.ccruce.backend.dto.response.DashboardResponseDto;
import com.ccruce.backend.dto.response.DashboardStatsResponseDto;
import com.ccruce.backend.entity.CERecord;
import com.ccruce.backend.entity.Credential;
import com.ccruce.backend.enums.CredentialStatus;
import com.ccruce.backend.exception.UnauthorizedException;
import com.ccruce.backend.repository.CERecordRepository;
import com.ccruce.backend.repository.CredentialRepository;
import com.ccruce.backend.security.AuthenticatedUser;
import com.ccruce.backend.service.DashboardService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final int EXPIRATION_THRESHOLD_DAYS = 90;

    private final CredentialRepository credentialRepository;
    private final CERecordRepository ceRecordRepository;

    public DashboardServiceImpl(
            CredentialRepository credentialRepository,
            CERecordRepository ceRecordRepository
    ) {
        this.credentialRepository = credentialRepository;
        this.ceRecordRepository = ceRecordRepository;
    }

    @Override
    public DashboardResponseDto getDashboard() {
        UUID userId = getAuthenticatedUserId();
        List<Credential> credentials = credentialRepository.findAllByUserId(userId);
        List<CERecord> ceRecords = ceRecordRepository.findAllByUserId(userId);
        Map<UUID, List<CERecord>> ceRecordsByCredentialId = ceRecords.stream()
                .collect(Collectors.groupingBy(record -> record.getCredential().getId()));

        List<CredentialResponseDto> credentialResponses = credentials.stream()
                .map(credential -> toCredentialResponse(credential, ceRecordsByCredentialId.getOrDefault(credential.getId(), List.of())))
                .toList();

        Map<UUID, CredentialResponseDto> credentialsById = credentialResponses.stream()
                .collect(Collectors.toMap(CredentialResponseDto::id, Function.identity()));

        return new DashboardResponseDto(
                buildStats(credentialResponses),
                buildUpcomingExpirations(credentialResponses),
                buildCeAttention(credentialResponses),
                buildRecentActivity(ceRecords, credentialsById)
        );
    }

    private UUID getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser currentUser)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return currentUser.id();
    }

    private DashboardStatsResponseDto buildStats(List<CredentialResponseDto> credentials) {
        int totalCredentials = credentials.size();
        int activeCount = countByStatus(credentials, CredentialStatus.ACTIVE);
        int expiringSoonCount = countByStatus(credentials, CredentialStatus.EXPIRING_SOON);
        int expiredCount = countByStatus(credentials, CredentialStatus.EXPIRED);
        int needsCEAttentionCount = (int) credentials.stream()
                .filter(this::needsCeAttention)
                .count();

        return new DashboardStatsResponseDto(
                totalCredentials,
                activeCount,
                expiringSoonCount,
                expiredCount,
                needsCEAttentionCount
        );
    }

    private int countByStatus(List<CredentialResponseDto> credentials, CredentialStatus status) {
        return (int) credentials.stream()
                .filter(credential -> credential.status() == status)
                .count();
    }

    private List<CredentialResponseDto> buildUpcomingExpirations(List<CredentialResponseDto> credentials) {
        return credentials.stream()
                .filter(credential -> {
                    long remainingDays = daysUntil(credential.expirationDate());
                    return remainingDays >= 0 && remainingDays <= EXPIRATION_THRESHOLD_DAYS;
                })
                .sorted(Comparator.comparing(CredentialResponseDto::expirationDate))
                .toList();
    }

    private List<CredentialResponseDto> buildCeAttention(List<CredentialResponseDto> credentials) {
        return credentials.stream()
                .filter(this::needsCeAttention)
                .sorted(Comparator
                        .comparing(CredentialResponseDto::expirationDate)
                        .thenComparing(CredentialResponseDto::ceProgress))
                .toList();
    }

    private boolean needsCeAttention(CredentialResponseDto credential) {
        return credential.requiredCEHours().compareTo(BigDecimal.ZERO) > 0
                && credential.ceHoursEarned().compareTo(credential.requiredCEHours()) < 0;
    }

    private List<DashboardActivityResponseDto> buildRecentActivity(
            List<CERecord> ceRecords,
            Map<UUID, CredentialResponseDto> credentialsById
    ) {
        return ceRecords.stream()
                .sorted(Comparator
                        .comparing(CERecord::getDateCompleted, Comparator.reverseOrder())
                        .thenComparing(this::hasCertificate, Comparator.reverseOrder())
                        .thenComparing(CERecord::getId))
                .map(record -> toActivityResponse(record, credentialsById.get(record.getCredential().getId())))
                .toList();
    }

    private boolean hasCertificate(CERecord record) {
        return record.getCertificateUrl() != null && !record.getCertificateUrl().isBlank();
    }

    private DashboardActivityResponseDto toActivityResponse(CERecord record, CredentialResponseDto credential) {
        String title = record.getCertificateUrl() != null && !record.getCertificateUrl().isBlank()
                ? "Uploaded certificate"
                : "Added CE record";
        String subtitle = record.getCertificateUrl() != null && !record.getCertificateUrl().isBlank()
                ? record.getTitle() + " (PDF)"
                : (credential != null ? credential.name() : "Credential") + " - " + formatHours(record.getHours()) + " hrs";
        String icon = record.getCertificateUrl() != null && !record.getCertificateUrl().isBlank()
                ? "pi pi-file"
                : "pi pi-plus";

        return new DashboardActivityResponseDto(
                record.getId(),
                record.getCredential().getId(),
                title,
                subtitle,
                icon,
                record.getDateCompleted()
        );
    }

    private CredentialResponseDto toCredentialResponse(Credential credential, List<CERecord> ceRecords) {
        BigDecimal ceHoursEarned = ceRecords.stream()
                .map(CERecord::getHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
                calculateCeProgress(ceHoursEarned, credential.getRequiredCEHours()),
                ceRecords.stream().map(this::toCeRecordResponse).toList()
        );
    }

    private CERecordResponseDto toCeRecordResponse(CERecord ceRecord) {
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

    private BigDecimal calculateCeProgress(BigDecimal ceHoursEarned, BigDecimal requiredCeHours) {
        if (requiredCeHours == null || requiredCeHours.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return ceHoursEarned.divide(requiredCeHours, 4, RoundingMode.HALF_UP);
    }

    private long daysUntil(LocalDate expirationDate) {
        return ChronoUnit.DAYS.between(LocalDate.now(), expirationDate);
    }

    private String formatHours(BigDecimal hours) {
        return hours.stripTrailingZeros().toPlainString();
    }
}
