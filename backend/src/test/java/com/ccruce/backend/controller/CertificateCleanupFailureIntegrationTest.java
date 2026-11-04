package com.ccruce.backend.controller;

import com.ccruce.backend.exception.UploadBusyException;
import com.ccruce.backend.exception.UploadFailedException;
import com.ccruce.backend.service.CertificateUploadService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * D01-D characterization of CURRENT behaviour when the (mocked) Cloudinary service fails or is busy. These tests
 * document existing semantics; they do not endorse them. Findings are recorded in the D01-D report.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CertificateCleanupFailureIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private CertificateUploadService certificateUploadService;

    @Test
    void busyUploadServiceReturns503WithRetryAfterOverHttp() throws Exception {
        AuthSession session = registerUser("Busy User", "busy.user@example.com");
        when(certificateUploadService.uploadCertificate(any())).thenThrow(new UploadBusyException());

        mockMvc.perform(multipart("/api/uploads/certificates")
                        .file(new MockMultipartFile("file", "a.png", "image/png", new byte[]{1}))
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Retry-After", "5"))
                .andExpect(jsonPath("$.message").value("The upload service is busy. Please try again shortly."));
    }

    @Test
    void deleteCeRecordWhenCloudinaryCleanupFailsReturns502AndKeepsTheRecord() throws Exception {
        AuthSession session = registerUser("Delete Fail", "delete.fail@example.com");
        String credentialId = createCredential(session);
        String publicId = "uptrack/users/%s/certificates/doomed".formatted(session.userId());
        String recordId = createRecord(session, credentialId, publicId);
        doThrow(new UploadFailedException("Certificate cleanup failed."))
                .when(certificateUploadService).deleteCertificate(publicId, "raw");

        mockMvc.perform(delete("/api/ce-records/{id}", recordId).header("Authorization", bearerToken(session)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("Certificate cleanup failed."));

        // The remote cleanup runs before the row delete, so a failure leaves the record (and its metadata) intact.
        mockMvc.perform(get("/api/ce-records/{id}", recordId).header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificatePublicId").value(publicId));
    }

    @Test
    void replacingCertificateWhenCleanupOfThePreviousOneFailsReturns502AndRollsBackTheUpdate() throws Exception {
        AuthSession session = registerUser("Update Fail", "update.fail@example.com");
        String credentialId = createCredential(session);
        String oldId = "uptrack/users/%s/certificates/old".formatted(session.userId());
        String newId = "uptrack/users/%s/certificates/new".formatted(session.userId());
        String recordId = createRecord(session, credentialId, oldId);
        doThrow(new UploadFailedException("Certificate cleanup failed."))
                .when(certificateUploadService).deleteCertificate(oldId, "raw");

        mockMvc.perform(put("/api/ce-records/{id}", recordId)
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(recordJson(credentialId, "Renamed Title", newId)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("Certificate cleanup failed."));

        // The save happens before the cleanup inside one transaction; the failure rolls the whole update back.
        mockMvc.perform(get("/api/ce-records/{id}", recordId).header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Original Title"))
                .andExpect(jsonPath("$.certificatePublicId").value(oldId));
    }

    @Test
    void cleanupFailureResponseDoesNotLeakProviderDetail() throws Exception {
        AuthSession session = registerUser("Leak Check", "leak.check@example.com");
        String credentialId = createCredential(session);
        String publicId = "uptrack/users/%s/certificates/leak".formatted(session.userId());
        String recordId = createRecord(session, credentialId, publicId);
        doThrow(new RuntimeException("cloudinary://key:secret@cloud api error"))
                .when(certificateUploadService).deleteCertificate(anyString(), anyString());

        mockMvc.perform(delete("/api/ce-records/{id}", recordId).header("Authorization", bearerToken(session)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
                .andExpect(content().string(not(containsString("secret"))));
    }

    /**
     * Characterizes a gap rather than a requirement: deleting a credential cascades to its CE records in the
     * database but never asks Cloudinary to remove their certificate files.
     */
    @Test
    void deletingCredentialCascadesCeRecordsWithoutDeletingCloudinaryAssets() throws Exception {
        AuthSession session = registerUser("Cascade User", "cascade.user@example.com");
        String credentialId = createCredential(session);
        String publicId = "uptrack/users/%s/certificates/cascade".formatted(session.userId());
        String recordId = createRecord(session, credentialId, publicId);

        mockMvc.perform(delete("/api/credentials/{id}", credentialId).header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/ce-records/{id}", recordId).header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
        verify(certificateUploadService, never()).deleteCertificate(anyString(), anyString());
    }

    private String createCredential(AuthSession session) throws Exception {
        String response = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "ACLS", "type": "CERTIFICATION", "issuingOrganization": "AHA",
                                 "expirationDate": "%s", "renewalCycleMonths": 24, "requiredCEHours": 8.0}
                                """.formatted(LocalDate.now().plusDays(180))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String createRecord(AuthSession session, String credentialId, String publicId) throws Exception {
        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(recordJson(credentialId, "Original Title", publicId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String recordJson(String credentialId, String title, String publicId) {
        return """
                {"title": "%s", "provider": "AHA", "hours": 2.0, "dateCompleted": "2026-03-12",
                 "certificateUrl": "https://example.com/certificates/c.pdf", "certificatePublicId": "%s",
                 "certificateResourceType": "raw", "certificateOriginalFilename": "c.pdf",
                 "credentialId": "%s"}
                """.formatted(title, publicId, credentialId);
    }
}
