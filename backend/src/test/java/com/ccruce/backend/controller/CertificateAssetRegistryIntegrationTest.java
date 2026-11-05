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
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
                .andExpect(jsonPath("$.url").isString()) // safeguard 1: legacy fields kept
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
                .andExpect(jsonPath("$.certificateUrl").isString()) // safeguard 1: viewing keeps working
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

        // Replace: attach a new asset to the first record; the old one becomes PENDING_DELETION.
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

        // Delete the record: managed asset is marked PENDING_DELETION without a provider destroy call.
        mockMvc.perform(delete("/api/ce-records/{id}", firstId)
                        .header("Authorization", bearerToken(owner)))
                .andExpect(status().isNoContent());
        assertEquals(AssetStatus.PENDING_DELETION, assetById(assetId2).getStatus());
        verify(uploader, never()).destroy(anyString(), anyMap());
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

    @Test
    void uncertainUploadOutcomeIsReconciledByTheExistenceProbe() throws Exception {
        AuthSession session = registerUser("Uma Uncertain", "uma.uncertain@example.com");
        createCredential(session, "RN License");

        // Uncertain provider outcome: client gets 502, reservation stays RESERVED.
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

        // Probe says the asset exists (upload actually succeeded before the crash): adopt to PENDING.
        com.cloudinary.api.ApiResponse response = Mockito.mock(com.cloudinary.api.ApiResponse.class);
        when(response.get("secure_url")).thenReturn("https://res.example.test/raw/upload/" + stale.getPublicId() + ".pdf");
        org.mockito.Mockito.doReturn(response).when(api).resource(anyString(), anyMap());
        sweeper.reconcileOne(stale);
        assertEquals(AssetStatus.PENDING, assetById(stale.getId().toString()).getStatus());

        // Second uncertain upload; probe says the asset does NOT exist: UPLOAD_FAILED.
        org.mockito.Mockito.doThrow(new IOException("reset")).when(uploader).upload(any(), anyMap());
        mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway());
        CertificateAsset stale2 = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.RESERVED)
                .findFirst().orElseThrow();
        org.mockito.Mockito.doThrow(new NotFound("nope")).when(api).resource(anyString(), anyMap());
        sweeper.reconcileOne(stale2);
        assertEquals(AssetStatus.UPLOAD_FAILED, assetById(stale2.getId().toString()).getStatus());
    }
}
