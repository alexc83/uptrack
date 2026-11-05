package com.ccruce.backend.controller;

import com.ccruce.backend.CertificateFixtures;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.ccruce.backend.service.impl.CertificateReservationSweeper;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.Api;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 1 (#24) end-to-end with Cloudinary fully mocked: reserve-first upload, ownership-validated
 * attachment by asset UUID, explicit classifications, reconciliation probe, and durable
 * PENDING_DELETION marking on replace/delete (the provider call itself is Phase 2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CertificateAssetRegistryIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private Cloudinary cloudinary;

    private Uploader uploader;
    private Api api;

    @Autowired
    private CertificateAssetRepository assetRepository;

    @Autowired
    private CertificateReservationSweeper sweeper;

    @Autowired
    private com.ccruce.backend.service.impl.CertificateCleanupWorker cleanupWorker;

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
                    "type", options.getOrDefault("type", "upload"),
                    "public_id", options.get("public_id"),
                    "secure_url", "https://res.example.test/%s/upload/%s".formatted(options.get("resource_type"), options.get("public_id")),
                    "format", "pdf");
        });
    }

    private String createCredential(AuthSession session, String name) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "type": "CERTIFICATION",
                  "issuingOrganization": "AHA",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": 8.0
                }
                """.formatted(name, LocalDate.now().plusDays(180));
        String response = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String uploadCertificate(AuthSession session) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cert.pdf", "application/pdf", CertificateFixtures.pdf());
        String response = mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assetId").isString())
                .andExpect(jsonPath("$.url").isString()) // flag OFF: Phase 2 response contract preserved
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("assetId").asText();
    }

    private CertificateAsset assetById(String assetId) {
        return assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
    }

    @Test
    void uploadReservesThenStoresAssetAndAttachmentByUuidBindsOwnership() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Ada Registry", "ada.registry@example.com");
        String credentialId = createCredential(session, "RN License");

        String assetId = uploadCertificate(session);
        CertificateAsset asset = assetById(assetId);
        assertEquals(AssetStatus.PENDING, asset.getStatus());
        assertEquals(UUID.fromString(session.userId()), asset.getUserId());
        assertNotNull(asset.getPublicId());
        assertEquals("raw", asset.getResourceType());

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Trauma Update","provider":"AACN","hours":4.5,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateAssetId").value(assetId));

        CertificateAsset attached = assetById(assetId);
        assertEquals(AssetStatus.ATTACHED, attached.getStatus());
        assertNotNull(attached.getCeRecordId());
    }

    @Test
    void managedAttachClassifiesManagedVerifiedAndPopulatesLegacyFields() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Mia Managed", "mia.managed@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Trauma Update","provider":"AACN","hours":4.5,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateAssetId").value(assetId))
                .andExpect(jsonPath("$.certificateClassification").value("MANAGED_VERIFIED"))
                .andExpect(jsonPath("$.certificateUrl").isString()) // flag OFF: URL preserved
                .andExpect(jsonPath("$.certificatePublicId").isString());

        CertificateAsset asset = assetById(assetId);
        assertEquals(AssetStatus.ATTACHED, asset.getStatus());
        assertNotNull(asset.getCeRecordId());
    }

    @Test
    void crossUserAndUnknownAssetIdsReturn404AndDuplicateAttachReturns409() throws Exception {
        stubSuccessfulUpload();
        AuthSession owner = registerUser("Olga Owner", "olga.owner@example.com");
        AuthSession other = registerUser("Peter Other", "peter.other@example.com");
        String ownerCredential = createCredential(owner, "RN License");
        String otherCredential = createCredential(other, "RN License");
        String assetId = uploadCertificate(owner);

        // Cross-user attachment attempt: 404, indistinguishable from nonexistent.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(otherCredential, assetId)))
                .andExpect(status().isNotFound());

        // Unknown asset id: 404.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(ownerCredential, UUID.randomUUID())))
                .andExpect(status().isNotFound());

        // Owner attaches successfully.
        String first = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T1","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(ownerCredential, assetId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String firstId = objectMapper.readTree(first).get("id").asText();

        // Duplicate attachment of the same asset to a second record: 409.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T2","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(ownerCredential, assetId)))
                .andExpect(status().isConflict());

        // Replace (Phase 2): the old managed asset is marked PENDING_DELETION in the CE-record
        // transaction; the provider destroy is owned by the durable cleanup worker, not the request.
        String oldPublicId = assetById(assetId).getPublicId();
        String assetId2 = uploadCertificate(owner);
        mockMvc.perform(put("/api/ce-records/{id}", firstId)
                        .header("Authorization", bearerToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T1","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(ownerCredential, assetId2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateAssetId").value(assetId2));

        CertificateAsset oldAsset = assetById(assetId);
        assertEquals(AssetStatus.PENDING_DELETION, oldAsset.getStatus());
        assertNull(oldAsset.getCeRecordId());
        assertEquals(AssetStatus.ATTACHED, assetById(assetId2).getStatus());
        verify(uploader, never()).destroy(anyString(), anyMap());

        // Delete the record: asset marked PENDING_DELETION, still no provider call in the request.
        mockMvc.perform(delete("/api/ce-records/{id}", firstId)
                        .header("Authorization", bearerToken(owner)))
                .andExpect(status().isNoContent());
        assertEquals(AssetStatus.PENDING_DELETION, assetById(assetId2).getStatus());
        verify(uploader, never()).destroy(anyString(), anyMap());

        // The durable worker performs the destroys and marks both DELETED. Assert per-asset (the shared
        // PostgreSQL test database may contain other PENDING_DELETION rows from earlier tests).
        String newPublicId = assetById(assetId2).getPublicId();
        org.mockito.Mockito.doReturn(Map.of("result", "ok")).when(uploader).destroy(anyString(), anyMap());
        cleanupWorker.processDeletionBatch();
        assertEquals(AssetStatus.DELETED, assetById(assetId).getStatus());
        assertEquals(AssetStatus.DELETED, assetById(assetId2).getStatus());
        verify(uploader).destroy(eq(oldPublicId), anyMap());
        verify(uploader).destroy(eq(newPublicId), anyMap());
    }

    @Test
    void managedDeleteNeverDependsOnCloudinaryAvailability() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Fiona Failure", "fiona.failure@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);

        String created = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String ceRecordId = objectMapper.readTree(created).get("id").asText();

        // Phase 2: even with the provider completely down, CE delete succeeds and durably records
        // PENDING_DELETION; the worker retries later.
        org.mockito.Mockito.doThrow(new IOException("outage")).when(uploader).destroy(anyString(), anyMap());
        mockMvc.perform(delete("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());
        verify(uploader, never()).destroy(anyString(), anyMap());

        mockMvc.perform(get("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
        CertificateAsset asset = assetById(assetId);
        assertEquals(AssetStatus.PENDING_DELETION, asset.getStatus());
        assertNull(asset.getCeRecordId());

        // Worker run during the outage: failure is recorded with backoff, still PENDING_DELETION.
        cleanupWorker.processDeletionBatch();
        CertificateAsset afterFailure = assetById(assetId);
        assertEquals(AssetStatus.PENDING_DELETION, afterFailure.getStatus());
        assertEquals(1, afterFailure.getCleanupAttempts());
        assertNotNull(afterFailure.getNextRetryAt());
        assertEquals("NETWORK", afterFailure.getLastFailureClass());

        // Provider recovers: worker destroys and marks DELETED.
        org.mockito.Mockito.doReturn(Map.of("result", "ok")).when(uploader).destroy(anyString(), anyMap());
        assetRepository.save(withRetryDue(afterFailure));
        cleanupWorker.processDeletionBatch();
        assertEquals(AssetStatus.DELETED, assetById(assetId).getStatus());
    }

    private CertificateAsset withRetryDue(CertificateAsset asset) {
        asset.setNextRetryAt(OffsetDateTime.now().minusMinutes(1));
        return asset;
    }

    @Test
    void rollbackBeforeCommitNeverCallsTheProvider() throws Exception {
        stubSuccessfulUpload();
        AuthSession session = registerUser("Rita Rollback", "rita.rollback@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetA = uploadCertificate(session);
        String assetB = uploadCertificate(session);

        String first = createCERecordWithAsset(session, credentialId, assetA);
        String second = createCERecordWithAsset(session, credentialId, assetB);
        String firstId = objectMapper.readTree(first).get("id").asText();

        // Replace record 1 with asset B, which is already ATTACHED to record 2 -> 409 -> full rollback.
        // The provider destroy of asset A must NEVER have been called: the pending-deletion mark only
        // becomes durable at commit, and the destroy is scheduled afterCommit.
        mockMvc.perform(put("/api/ce-records/{id}", firstId)
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T1","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetB)))
                .andExpect(status().isConflict());

        verify(uploader, never()).destroy(anyString(), anyMap());
        assertEquals(AssetStatus.ATTACHED, assetById(assetA).getStatus());
        assertEquals(firstId, assetById(assetA).getCeRecordId().toString());
        mockMvc.perform(get("/api/ce-records/{id}", firstId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateAssetId").value(assetA));
    }

    private String createCERecordWithAsset(AuthSession session, String credentialId, String assetId) throws Exception {
        return mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void legacyMetadataIsClassifiedUnverifiedAndExternalLinksPreserved() throws Exception {
        AuthSession session = registerUser("Lara Legacy", "lara.legacy@example.com");
        String credentialId = createCredential(session, "RN License");

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Old","provider":"P","hours":2.0,"dateCompleted":"2026-01-01","credentialId":"%s",
                                 "certificateUrl":"https://example.com/c.pdf",
                                 "certificatePublicId":"uptrack/users/%s/certificates/old",
                                 "certificateResourceType":"raw"}
                                """.formatted(credentialId, session.userId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateClassification").value("LEGACY_UNVERIFIED"))
                .andExpect(jsonPath("$.certificateAssetId").doesNotExist());

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Link","provider":"P","hours":2.0,"dateCompleted":"2026-01-02","credentialId":"%s",
                                 "certificateUrl":"https://example.com/ext.pdf"}
                                """.formatted(credentialId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateClassification").value("EXTERNAL_LINK"));
    }

    private void makeProbeEligible(CertificateAsset asset) {
        asset.setNextRetryAt(OffsetDateTime.now().minusMinutes(1));
        assetRepository.save(asset);
    }

    @Test
    void uncertainUploadOutcomeIsReconciledByTheExistenceProbe() throws Exception {
        AuthSession session = registerUser("Uma Uncertain", "uma.uncertain@example.com");
        createCredential(session, "RN License");

        // Uncertain provider outcome: client gets 502, reservation stays RESERVED with a scheduled retry.
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("read timeout"));
        MockMultipartFile file = new MockMultipartFile(
                "file", "cert.pdf", "application/pdf", CertificateFixtures.pdf());
        mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway());
        CertificateAsset stale = assetRepository.findAll().stream()
                .filter(a -> a.getUserId().equals(UUID.fromString(session.userId())))
                .findFirst().orElseThrow();
        assertEquals(AssetStatus.RESERVED, stale.getStatus());
        assertEquals("cert.pdf", stale.getOriginalFilename(), "Finding 3: filename persisted at reservation");
        assertNotNull(stale.getNextRetryAt(), "uncertain outcome must schedule a retry");

        // Finding 2: before the retry is due, the sweeper must not select the reservation.
        assertTrue(assetRepository.findEligibleReservations(
                OffsetDateTime.now(), OffsetDateTime.now(), PageRequest.of(0, 20)).isEmpty());

        // Retry becomes due; probe says the asset exists (upload succeeded before the crash): adopt.
        makeProbeEligible(stale);
        com.cloudinary.api.ApiResponse response = Mockito.mock(com.cloudinary.api.ApiResponse.class);
        when(response.get("public_id")).thenReturn(stale.getPublicId());
        when(response.get("resource_type")).thenReturn(stale.getResourceType());
        when(response.get("type")).thenReturn(stale.getDeliveryType());
        when(response.get("secure_url")).thenReturn("https://res.example.test/raw/upload/" + stale.getPublicId());
        when(response.get("format")).thenReturn("pdf");
        org.mockito.Mockito.doReturn(response).when(api).resource(anyString(), anyMap());
        sweeper.reconcileBatch();
        CertificateAsset recovered = assetById(stale.getId().toString());
        assertEquals(AssetStatus.PENDING, recovered.getStatus());
        assertEquals("https://res.example.test/raw/upload/" + stale.getPublicId(), recovered.getDeliveryUrl(),
                "recovered raw asset retains the provider URL and exact reserved identity");
        assertEquals("cert.pdf", recovered.getOriginalFilename());

        // Second uncertain upload; probe says the asset does NOT exist: UPLOAD_FAILED.
        org.mockito.Mockito.doThrow(new IOException("reset")).when(uploader).upload(any(), anyMap());
        mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway());
        CertificateAsset stale2 = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.RESERVED)
                .findFirst().orElseThrow();
        makeProbeEligible(stale2);
        org.mockito.Mockito.doThrow(new NotFound("nope")).when(api).resource(anyString(), anyMap());
        sweeper.reconcileBatch();
        assertEquals(AssetStatus.UPLOAD_FAILED, assetById(stale2.getId().toString()).getStatus());
    }

    @Test
    void probeFailureBacksOffAndRecoveryThenAttachesWithFullMetadataForViewing() throws Exception {
        AuthSession session = registerUser("Rita Recovery", "rita.recovery@example.com");
        String credentialId = createCredential(session, "RN License");

        // Cloudinary success followed by application interruption: upload throws, row stays RESERVED.
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("connection reset"));
        MockMultipartFile file = new MockMultipartFile(
                "file", "recovered-cert.pdf", "application/pdf", CertificateFixtures.pdf());
        mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway());
        CertificateAsset stale = assetRepository.findAll().stream()
                .filter(a -> a.getUserId().equals(UUID.fromString(session.userId())))
                .findFirst().orElseThrow();
        assertEquals(AssetStatus.RESERVED, stale.getStatus());

        // Provider Admin API unavailable: probe fails, bounded retry scheduled, no tight loop.
        makeProbeEligible(stale);
        org.mockito.Mockito.doThrow(new RuntimeException("admin api down")).when(api).resource(anyString(), anyMap());
        sweeper.reconcileBatch();
        CertificateAsset afterFailure = assetById(stale.getId().toString());
        assertEquals(AssetStatus.RESERVED, afterFailure.getStatus());
        assertEquals(1, afterFailure.getCleanupAttempts());
        assertNotNull(afterFailure.getNextRetryAt());
        assertTrue(afterFailure.getNextRetryAt().isAfter(OffsetDateTime.now().plusSeconds(30)),
                "probe failure must back off");
        assertTrue(assetRepository.findEligibleReservations(
                OffsetDateTime.now(), OffsetDateTime.now(), PageRequest.of(0, 20)).isEmpty(),
                "backed-off reservation must not be re-probed immediately");

        // Provider recovers and the probe confirms the asset: adopt with full metadata.
        makeProbeEligible(afterFailure);
        com.cloudinary.api.ApiResponse response = Mockito.mock(com.cloudinary.api.ApiResponse.class);
        when(response.get("public_id")).thenReturn(stale.getPublicId());
        when(response.get("resource_type")).thenReturn(stale.getResourceType());
        when(response.get("type")).thenReturn(stale.getDeliveryType());
        when(response.get("secure_url")).thenReturn("https://res.example.test/raw/upload/" + stale.getPublicId());
        when(response.get("format")).thenReturn("pdf");
        org.mockito.Mockito.doReturn(response).when(api).resource(anyString(), anyMap());
        sweeper.reconcileBatch();
        String assetId = stale.getId().toString();
        CertificateAsset recovered = assetById(assetId);
        assertEquals(AssetStatus.PENDING, recovered.getStatus());

        // Recovered asset attaches and supports viewing: CE response carries URL + filename.
        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Recovered","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateClassification").value("MANAGED_VERIFIED"))
                .andExpect(jsonPath("$.certificateUrl").isString()) // flag OFF: URL preserved
                .andExpect(jsonPath("$.certificateOriginalFilename").value("recovered-cert.pdf"));
        assertEquals(AssetStatus.ATTACHED, assetById(assetId).getStatus());
    }
}
