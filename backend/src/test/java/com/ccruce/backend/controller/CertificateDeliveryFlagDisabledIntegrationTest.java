package com.ccruce.backend.controller;

import com.ccruce.backend.CertificateFixtures;
import com.ccruce.backend.entity.CertificateAsset;
import com.ccruce.backend.enums.AssetStatus;
import com.ccruce.backend.repository.CertificateAssetRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Strategy A gate, flag OFF (default, no property override): Phase 2 behavior is preserved exactly —
 * uploads are type 'upload' with the URL in the response, managed CE responses keep certificateUrl,
 * and the authenticated delivery endpoint issues nothing (404).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CertificateDeliveryFlagDisabledIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private Cloudinary cloudinary;

    private Uploader uploader;

    @Autowired
    private CertificateAssetRepository assetRepository;

    @BeforeEach
    void setUpCloudinaryMock() throws Exception {
        uploader = Mockito.mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenAnswer(invocation -> {
            Map<String, Object> options = invocation.getArgument(1);
            return Map.of(
                    "resource_type", options.get("resource_type"),
                    "public_id", options.get("public_id"),
                    "secure_url", "https://res.example.test/%s/upload/%s".formatted(options.get("resource_type"), options.get("public_id")),
                    "format", "pdf");
        });
    }

    @Test
    void flagOffPreservesPhase2UploadAttachViewContractAndDisablesTheEndpoint() throws Exception {
        AuthSession session = registerUser("Fiona Flagoff", "fiona.flagoff@example.com");
        String credentialPayload = """
                {"name":"RN","type":"CERTIFICATION","issuingOrganization":"AHA","expirationDate":"%s","renewalCycleMonths":24,"requiredCEHours":8.0}
                """.formatted(LocalDate.now().plusDays(180));
        String credentialId = objectMapper.readTree(mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON).content(credentialPayload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("id").asText();

        // Upload: type=upload (no 'type' option), response carries the permanent URL.
        MockMultipartFile file = new MockMultipartFile("file", "cert.pdf", "application/pdf", CertificateFixtures.pdf());
        String uploadResponse = mockMvc.perform(multipart("/api/uploads/certificates").file(file)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").isString())
                .andExpect(jsonPath("$.assetId").isString())
                .andReturn().getResponse().getContentAsString();
        String assetId = objectMapper.readTree(uploadResponse).get("assetId").asText();
        CertificateAsset asset = assetRepository.findById(UUID.fromString(assetId)).orElseThrow();
        assertEquals("upload", asset.getDeliveryType(), "flag off must keep delivery type 'upload'");
        org.mockito.ArgumentCaptor<Map<String, Object>> options = org.mockito.ArgumentCaptor.forClass(Map.class);
        org.mockito.Mockito.verify(uploader).upload(any(), options.capture());
        assertEquals(false, options.getValue().containsKey("type"), "no authenticated type while disabled");

        // Attach: managed CE response keeps certificateUrl (Phase 2 contract).
        String recordId = objectMapper.readTree(mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T","provider":"P","hours":1.0,"dateCompleted":"2026-03-01","credentialId":"%s","certificateAssetId":"%s"}
                                """.formatted(credentialId, assetId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.certificateUrl").isString())
                .andReturn().getResponse().getContentAsString()).get("id").asText();
        assertEquals(AssetStatus.ATTACHED, assetRepository.findById(UUID.fromString(assetId)).orElseThrow().getStatus());

        // Delivery endpoint is inert while the flag is off.
        mockMvc.perform(get("/api/ce-records/{id}/certificate-url", recordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
    }
}
