package com.ccruce.backend.controller;

import com.ccruce.backend.CertificateFixtures;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.fasterxml.jackson.databind.JsonNode;
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

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 3 (issue #23) delivery endpoint, Cloudinary fully mocked: authorized issuance, cross-user 404,
 * missing record/asset, inactive state, managed URLs removed from ordinary responses, legacy compatibility.
 */
@SpringBootTest(properties = "app.certificates.delivery.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CertificateDeliveryIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private Cloudinary cloudinary;

    private Uploader uploader;

    @Autowired
    private CertificateAssetRepository assetRepository;

    @BeforeEach
    void setUpCloudinaryMock() throws Exception {
        uploader = Mockito.mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(cloudinary.privateDownload(anyString(), org.mockito.ArgumentMatchers.nullable(String.class), anyMap()))
                .thenAnswer(invocation -> "https://api.example.test/download?public_id=" + invocation.getArgument(0));
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

    private String createCERecordWithAsset(AuthSession session, String credentialId, String assetId) throws Exception {
        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    @Test
    void authorizedDeliveryIssuesShortLivedUrlAndHidesPermanentUrlFromResponses() throws Exception {
        AuthSession session = registerUser("Dana Delivery", "dana.delivery@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        String recordId = createCERecordWithAsset(session, credentialId, assetId);
        // Flag-on uploads already use authenticated storage; the registry remains authoritative.
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        asset.setDeliveryType("authenticated");
        assetRepository.save(asset);

        // Ordinary CE-record responses no longer expose the managed permanent URL.
        mockMvc.perform(get("/api/ce-records/{id}", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateAssetId").value(assetId))
                .andExpect(jsonPath("$.certificateUrl").doesNotExist())
                .andExpect(jsonPath("$.certificateClassification").value("MANAGED_VERIFIED"));

        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").isString())
                .andExpect(jsonPath("$.expiresAt").isString())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void crossUserAndUnknownRequestsReturn404() throws Exception {
        AuthSession owner = registerUser("Olga Owner", "olga.owner2@example.com");
        AuthSession other = registerUser("Peter Other", "peter.other2@example.com");
        String credentialId = createCredential(owner, "RN License");
        String assetId = uploadCertificate(owner);
        String recordId = createCERecordWithAsset(owner, credentialId, assetId);

        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(other)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", UUID.randomUUID())
                        .header("Authorization", bearerToken(owner)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void flagOnUploadsAuthenticatedAssetsAndSuppressesUrl() throws Exception {
        AuthSession session = registerUser("Eric Enabled", "eric.enabled@example.com");
        String credentialId = createCredential(session, "RN License");

        MockMultipartFile file = new MockMultipartFile("file", "cert.pdf", "application/pdf", CertificateFixtures.pdf());
        String uploadResponse = mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.nullValue())) // suppressed when enabled
                .andExpect(jsonPath("$.assetId").isString())
                .andReturn().getResponse().getContentAsString();
        String assetId = objectMapper.readTree(uploadResponse).get("assetId").asText();

        // Registry records delivery type 'authenticated' and the upload carried type=authenticated.
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        assertEquals("authenticated", asset.getDeliveryType());
        org.junit.jupiter.api.Assertions.assertTrue(asset.getPublicId().endsWith(".pdf"));
        org.mockito.ArgumentCaptor<Map<String, Object>> options = org.mockito.ArgumentCaptor.forClass(Map.class);
        org.mockito.Mockito.verify(uploader).upload(any(), options.capture());
        assertEquals("authenticated", options.getValue().get("type"));
        assertEquals(asset.getPublicId(), options.getValue().get("public_id"));

        // Attach: managed CE response suppresses the permanent URL when the asset is authenticated.
        String recordId = createCERecordWithAsset(session, credentialId, assetId);
        mockMvc.perform(get("/api/ce-records/{id}", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateUrl").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.certificateAssetId").value(assetId));

        // Endpoint issues for the authenticated asset.
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").isString());
    }

    @Test
    void existingUploadTypeAssetsStayViewableViaUrlWhenEnabled() throws Exception {
        // Mixed population: an upload-type managed asset created before activation keeps its URL
        // (temporary compatibility policy) and is refused by the authenticated endpoint (409).
        AuthSession session = registerUser("Mia Mixed", "mia.mixed@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session); // enabled=true here, so this is authenticated;
        // simulate a pre-activation upload-type asset instead:
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        asset.setDeliveryType("upload");
        assetRepository.save(asset);
        String recordId = createCERecordWithAsset(session, credentialId, assetId);

        mockMvc.perform(get("/api/ce-records/{id}", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateUrl").isString()) // public asset: URL stays (documented policy)
                .andExpect(jsonPath("$.certificateAssetId").value(assetId));
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isConflict()); // never an authenticated URL for a public asset
    }

    @Test
    void uploadTypeAssetIsRefusedUntilMigrated() throws Exception {
        AuthSession session = registerUser("Uma UploadType", "uma.uploadtype@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        String recordId = createCERecordWithAsset(session, credentialId, assetId);
        // Simulate a pre-activation asset: delivery type 'upload' -> 409, no URL issued.
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        asset.setDeliveryType("upload");
        assetRepository.save(asset);
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isConflict());
    }

    @Test
    void inactiveAssetStateIsNotDeliveredAndLegacyRecordsKeepTheirOwnUrl() throws Exception {
        AuthSession session = registerUser("Ivy Inactive", "ivy.inactive@example.com");
        String credentialId = createCredential(session, "RN License");
        String assetId = uploadCertificate(session);
        String recordId = createCERecordWithAsset(session, credentialId, assetId);

        // Asset not in an active state → 409, no URL generated.
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        asset.setDeliveryType("authenticated");
        asset.setStatus(AssetStatus.PENDING_DELETION);
        assetRepository.save(asset);
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isConflict());

        // Legacy external link: keeps certificateUrl in responses, delivery endpoint has no managed asset.
        String legacy = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Legacy","provider":"P","hours":1.0,"dateCompleted":"2026-01-01","credentialId":"%s",
                                 "certificateUrl":"https://example.com/ext.pdf"}
                                """.formatted(credentialId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String legacyId = objectMapper.readTree(legacy).get("id").asText();
        mockMvc.perform(get("/api/ce-records/{id}", legacyId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateUrl").value("https://example.com/ext.pdf"))
                .andExpect(jsonPath("$.certificateClassification").value("EXTERNAL_LINK"));
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", legacyId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
    }
}
