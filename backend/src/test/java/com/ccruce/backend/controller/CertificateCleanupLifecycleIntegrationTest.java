package com.ccruce.backend.controller;

import com.ccruce.backend.CertificateFixtures;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateCleanupWorker;
import com.ccruce.backend.service.impl.CertificateReconciliationService;
import com.cloudinary.Api;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.api.exceptions.NotFound;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 2 (issue #20) durable lifecycle, Cloudinary fully mocked: worker deletion with fenced
 * leases, backoff/exhaustion, not-found success, 24 h abandoned expiry with attach race,
 * credential cascade, legacy unverified protection, and dry-run-only reconciliation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CertificateCleanupLifecycleIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private Cloudinary cloudinary;

    private Uploader uploader;
    private Api api;

    @Autowired
    private CertificateAssetRepository assetRepository;

    @Autowired
    private CertificateCleanupWorker cleanupWorker;

    @Autowired
    private CertificateReconciliationService reconciliationService;

    @BeforeEach
    void setUpCloudinaryMock() {
        uploader = Mockito.mock(Uploader.class);
        api = Mockito.mock(Api.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(cloudinary.api()).thenReturn(api);
    }

    private void stubSuccessfulUpload() throws IOException {
        when(uploader.upload(any(), anyMap())).thenAnswer(invocation -> {
            Map<String, Object> options = invocation.getArgument(1);
            return Map.of(
                    "resource_type", options.get("resource_type"),
                    "public_id", options.get("public_id"),
                    "secure_url", "https://res.example.test/%s/upload/%s".formatted(options.get("resource_type"), options.get("public_id")),
                    "format", "pdf");
        });
    }

    private String createCredential(AuthSession session, String name) throws Exception {
        String payload = """
                {"name":"%s","type":"CERTIFICATION","issuingOrganization":"AHA","expirationDate":"%s","renewalCycleMonths":24,"requiredCEHours":8.0}
                """.formatted(name, LocalDate.now().plusDays(180));
        String response = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String uploadCertificate(AuthSession session) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "cert.pdf", "application/pdf", CertificateFixtures.pdf());
        String response = mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("assetId").asText();
    }

    private String createCERecord(AuthSession session, String credentialId, String assetId) throws Exception {
        String certificateFields = assetId != null
                ? ",\"certificateAssetId\":\"%s\"".formatted(assetId)
                : ",\"certificateUrl\":\"https://example.com/legacy.pdf\",\"certificatePublicId\":\"uptrack/users/%s/certificates/legacy-1\",\"certificateResourceType\":\"raw\"".formatted(session.userId());
        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s"%s}
                                """.formatted(credentialId, certificateFields)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private CertificateAsset assetById(String assetId) {
        return assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
    }

    @Test
    void credentialCascadeMarksManagedAssetsAndLeavesLegacyUnverifiedUntouched() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Carl Cascade", "carl.cascade@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetA = uploadCertificate(session);
        String assetB = uploadCertificate(session);
        createCERecord(session, credentialId, assetA);
        createCERecord(session, credentialId, assetB);
        String legacyRecordId = createCERecord(session, credentialId, null); // LEGACY_UNVERIFIED, no registry row

        mockMvc.perform(delete("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        // Managed assets are durably marked for cleanup; no provider call during the request.
        assertEquals(AssetStatus.PENDING_DELETION, assetById(assetA).getStatus());
        assertEquals(AssetStatus.PENDING_DELETION, assetById(assetB).getStatus());
        assertNull(assetById(assetA).getCeRecordId());
        verify(uploader, never()).destroy(anyString(), anyMap());

        // CE records are gone (cascade), legacy record had no registry asset and was not deleted at the provider.
        mockMvc.perform(delete("/api/ce-records/{id}", legacyRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound()); // already cascaded

        // Worker cleans up the marked assets (provider confirms result=ok). Assert per-asset:
        // the shared PostgreSQL test database may contain other PENDING_DELETION rows.
        Mockito.doReturn(Map.of("result", "ok")).when(uploader).destroy(anyString(), anyMap());
        String publicIdA = assetById(assetA).getPublicId();
        String publicIdB = assetById(assetB).getPublicId();
        cleanupWorker.processDeletionBatch();
        assertEquals(AssetStatus.DELETED, assetById(assetA).getStatus());
        assertEquals(AssetStatus.DELETED, assetById(assetB).getStatus());
        verify(uploader).destroy(eq(publicIdA), anyMap());
        verify(uploader).destroy(eq(publicIdB), anyMap());
    }

    @Test
    void abandonedUploadsExpireAfter24hAndAttachAfterExpiryIsRejected() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Abby Abandoned", "abby.abandoned@example.com");
        String credentialId = createCredential(session, "RN License");

        String oldAsset = uploadCertificate(session);
        String freshAsset = uploadCertificate(session);

        // Age the first asset beyond the 24 h grace; keep the second fresh.
        CertificateAsset old = assetById(oldAsset);
        old.setUploadedAt(OffsetDateTime.now().minusHours(25));
        assetRepository.save(old);

        int expired = cleanupWorker.expireAbandonedUploads();
        assertEquals(1, expired);
        assertEquals(AssetStatus.PENDING_DELETION, assetById(oldAsset).getStatus());
        assertEquals(AssetStatus.PENDING, assetById(freshAsset).getStatus(), "fresh uploads are not expired");

        // Delayed attachment after expiration is rejected (409), and the worker deletes the old asset.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Late","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, oldAsset)))
                .andExpect(status().isConflict());

        Mockito.doReturn(Map.of("result", "ok")).when(uploader).destroy(anyString(), anyMap());
        cleanupWorker.processDeletionBatch();
        assertEquals(AssetStatus.DELETED, assetById(oldAsset).getStatus());

        // The fresh asset can still be attached normally.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Ok","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, freshAsset)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateClassification").value("MANAGED_VERIFIED"));
    }

    @Test
    void providerNotFoundCountsAsSuccessfulCleanup() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Nora NotFound", "nora.notfound@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        String recordId = createCERecord(session, credentialId, assetId);

        mockMvc.perform(delete("/api/ce-records/{id}", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());
        assertEquals(AssetStatus.PENDING_DELETION, assetById(assetId).getStatus());

        // Phase 1 crash-between-destroy-and-mark scenario: provider already lacks the asset.
        Mockito.doThrow(new IOException("wrapped", new NotFound("gone"))).when(uploader).destroy(anyString(), anyMap());
        cleanupWorker.processDeletionBatch();
        assertEquals(AssetStatus.DELETED, assetById(assetId).getStatus());
    }

    @Test
    void retryExhaustionMarksCleanupFailedAndKeepsAsset() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Evan Exhausted", "evan.exhausted@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        createCERecord(session, credentialId, assetId);

        CertificateAsset asset = assetById(assetId);
        asset.setStatus(AssetStatus.PENDING_DELETION);
        asset.setCleanupAttempts(9); // next failure reaches the default max of 10
        assetRepository.save(asset);

        Mockito.doThrow(new IOException("persistent outage")).when(uploader).destroy(anyString(), anyMap());
        cleanupWorker.processDeletionBatch();

        CertificateAsset after = assetById(assetId);
        assertEquals(AssetStatus.CLEANUP_FAILED, after.getStatus());
        assertEquals("NETWORK", after.getLastFailureClass());

        // Terminal state: the worker no longer selects it.
        assertTrue(assetRepository.findEligibleDeletions(OffsetDateTime.now(), org.springframework.data.domain.PageRequest.of(0, 50)).isEmpty());
    }

    @Test
    void backoffScheduleIsBoundedAndRetryGated() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Beth Backoff", "beth.backoff@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        createCERecord(session, credentialId, assetId);
        CertificateAsset asset = assetById(assetId);
        asset.setStatus(AssetStatus.PENDING_DELETION);
        assetRepository.save(asset);

        Mockito.doThrow(new java.net.SocketTimeoutException("slow")).when(uploader).destroy(anyString(), anyMap());
        cleanupWorker.processDeletionBatch();

        CertificateAsset after = assetById(assetId);
        assertEquals(AssetStatus.PENDING_DELETION, after.getStatus());
        assertEquals(1, after.getCleanupAttempts());
        assertEquals("PROVIDER_TIMEOUT", after.getLastFailureClass());
        assertNotNull(after.getNextRetryAt());
        long delay = java.time.Duration.between(OffsetDateTime.now(), after.getNextRetryAt()).getSeconds();
        assertTrue(delay > 250 && delay <= 300, "first backoff is 5 minutes, got " + delay);

        // Retry not yet due: the worker must not select it.
        assertTrue(assetRepository.findEligibleDeletions(OffsetDateTime.now(), org.springframework.data.domain.PageRequest.of(0, 50)).isEmpty());
    }

    @Test
    void reconciliationDryRunClassifiesAndNeverDeletes() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Rita Recon", "rita.recon@example.com");
        String assetId = uploadCertificate(session);
        CertificateAsset known = assetById(assetId);

        // Provider lists the known asset plus one unknown orphan-looking asset.
        com.cloudinary.api.ApiResponse response = Mockito.mock(com.cloudinary.api.ApiResponse.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> resources = List.of(
                Map.of("public_id", known.getPublicId()),
                Map.of("public_id", "uptrack/users/%s/certificates/orphan-1".formatted(session.userId())));
        Mockito.doReturn(resources).when(response).get("resources");
        Mockito.doReturn(null).when(response).get("next_cursor");
        Mockito.doReturn(response).when(api).resources(anyMap());

        CertificateReconciliationService.InventoryReport report = reconciliationService.dryRunInventory();

        assertNotNull(report);
        assertTrue(report.unknownProviderAssets().stream().anyMatch(k -> k.contains("orphan-1")),
                "unknown provider asset must be classified as such");
        assertTrue(report.missingInCloudinary().stream().noneMatch(k -> k.contains(known.getPublicId())),
                "the listed known asset must not be reported missing");
        verify(uploader, never()).destroy(anyString(), anyMap());
        // Unknown assets stay untouched and out of automatic deletion.
        assertEquals(AssetStatus.PENDING, assetById(assetId).getStatus());
    }

    @Test
    void reconciliationAbortsOnIncompleteInventory() throws Exception {
        when(api.resources(anyMap())).thenThrow(new RuntimeException("listing failed"));
        assertNull(reconciliationService.dryRunInventory(), "incomplete inventory must abort, never act on it");
    }
}
