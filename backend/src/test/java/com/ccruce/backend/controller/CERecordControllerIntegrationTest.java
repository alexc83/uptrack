package com.ccruce.backend.controller;

import com.ccruce.backend.service.CertificateUploadService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.hamcrest.Matchers.hasItem;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CERecordControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @MockBean
    private CertificateUploadService certificateUploadService;

    @Test
    void shouldPerformFullCERecordCrudFlow() throws Exception {
        AuthSession session = registerUser("Jamie Carter", "jamie.carter@example.com");
        String credentialId = createCredential(session, "RN License - Texas");

        String createPayload = """
                {
                  "title": "Trauma Update",
                  "provider": "AACN",
                  "hours": 4.5,
                  "dateCompleted": "2026-03-01",
                  "certificateUrl": "https://example.com/certificates/trauma-update.pdf",
                  "certificatePublicId": "uptrack/users/%s/certificates/trauma-update",
                  "certificateResourceType": "raw",
                  "certificateOriginalFilename": "trauma-update.pdf",
                  "credentialId": "%s"
                }
                """.formatted(session.userId(), credentialId);

        String createResponse = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Trauma Update"))
                .andExpect(jsonPath("$.provider").value("AACN"))
                .andExpect(jsonPath("$.hours").value(4.5))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRecord = objectMapper.readTree(createResponse);
        String ceRecordId = createdRecord.get("id").asText();

        mockMvc.perform(get("/api/ce-records")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(ceRecordId)));

        mockMvc.perform(get("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateUrl").value("https://example.com/certificates/trauma-update.pdf"))
                .andExpect(jsonPath("$.certificatePublicId").value("uptrack/users/%s/certificates/trauma-update".formatted(session.userId())))
                .andExpect(jsonPath("$.certificateResourceType").value("raw"))
                .andExpect(jsonPath("$.certificateOriginalFilename").value("trauma-update.pdf"));

        String updatePayload = """
                {
                  "title": "Trauma Update Advanced",
                  "provider": "AACN NTI",
                  "hours": 6.0,
                  "dateCompleted": "2026-03-10",
                  "certificateUrl": null,
                  "credentialId": "%s"
                }
                """.formatted(credentialId);

        mockMvc.perform(put("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Trauma Update Advanced"))
                .andExpect(jsonPath("$.provider").value("AACN NTI"))
                .andExpect(jsonPath("$.hours").value(6.0))
                .andExpect(jsonPath("$.certificateUrl").doesNotExist());

        verify(certificateUploadService)
                .deleteCertificate("uptrack/users/%s/certificates/trauma-update".formatted(session.userId()), "raw");

        mockMvc.perform(delete("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("CE record not found for id: " + ceRecordId));
    }

    @Test
    void shouldDeleteStoredCertificateAssetWhenDeletingCeRecord() throws Exception {
        AuthSession session = registerUser("Cora James", "cora.james@example.com");
        String credentialId = createCredential(session, "ACLS");
        String ceRecordId = createCERecordWithCertificate(
                session,
                credentialId,
                "Advanced Cardiac Review",
                "https://example.com/certificates/acls-review.pdf",
                "uptrack/users/%s/certificates/acls-review".formatted(session.userId()),
                "raw",
                "acls-review.pdf"
        );

        mockMvc.perform(delete("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        verify(certificateUploadService)
                .deleteCertificate("uptrack/users/%s/certificates/acls-review".formatted(session.userId()), "raw");
    }

    @Test
    void shouldRejectCertificateMetadataForAnotherUser() throws Exception {
        AuthSession session = registerUser("Lena Burke", "lena.burke@example.com");
        String credentialId = createCredential(session, "NRP");

        String payload = """
                {
                  "title": "Neonatal Review",
                  "provider": "AAP",
                  "hours": 2.0,
                  "dateCompleted": "2026-03-15",
                  "certificateUrl": "https://example.com/certificates/neonatal-review.pdf",
                  "certificatePublicId": "uptrack/users/00000000-0000-0000-0000-000000000999/certificates/neonatal-review",
                  "certificateResourceType": "raw",
                  "certificateOriginalFilename": "neonatal-review.pdf",
                  "credentialId": "%s"
                }
                """.formatted(credentialId);

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Certificate asset does not belong to the authenticated user."));

        verify(certificateUploadService, never()).deleteCertificate(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void shouldRejectMissingCredentialOnCreate() throws Exception {
        AuthSession session = registerUser("Robin Sloan", "robin.sloan@example.com");

        String payload = """
                {
                  "title": "Stroke Care",
                  "provider": "Hospital Education",
                  "hours": 2.0,
                  "dateCompleted": "2026-03-15",
                  "credentialId": "00000000-0000-0000-0000-000000000010"
                }
                """;

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Credential not found for id: 00000000-0000-0000-0000-000000000010"));
    }

    @Test
    void shouldRejectCEWriteWithoutAuthentication() throws Exception {
        AuthSession session = registerUser("Casey Hart", "casey.hart@example.com");
        String credentialId = createCredential(session, "BLS");

        String payload = """
                {
                  "title": "Airway Management",
                  "provider": "AHA",
                  "hours": 1.0,
                  "dateCompleted": "2026-03-12",
                  "credentialId": "%s"
                }
                """.formatted(credentialId);

        mockMvc.perform(post("/api/ce-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    @Test
    void shouldRejectCredentialOwnedByDifferentUser() throws Exception {
        AuthSession credentialOwner = registerUser("Dana Price", "dana.price@example.com");
        AuthSession anotherUser = registerUser("Jordan Vale", "jordan.vale@example.com");
        String credentialId = createCredential(credentialOwner, "CCRN");

        String payload = """
                {
                  "title": "Critical Care Review",
                  "provider": "AACN",
                  "hours": 3.0,
                  "dateCompleted": "2026-03-18",
                  "credentialId": "%s"
                }
                """.formatted(credentialId);

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(anotherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Credential does not belong to the specified user."));
    }

    @Test
    void shouldRejectUpdatingAnotherUsersCERecord() throws Exception {
        AuthSession ownerSession = registerUser("Drew Kline", "drew.kline@example.com");
        AuthSession attackerSession = registerUser("Taylor Kline", "taylor.kline@example.com");
        String credentialId = createCredential(ownerSession, "TNCC");
        String ceRecordId = createCERecord(ownerSession, credentialId, "Trauma Review");

        String payload = """
                {
                  "title": "Updated Trauma Review",
                  "provider": "ENA",
                  "hours": 4.0,
                  "dateCompleted": "2026-03-20",
                  "credentialId": "%s"
                }
                """.formatted(credentialId);

        mockMvc.perform(put("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(attackerSession))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("CE record not found for id: " + ceRecordId));
    }

    @Test
    void shouldRejectDeletingAnotherUsersCERecord() throws Exception {
        AuthSession ownerSession = registerUser("Morgan Keane", "morgan.keane@example.com");
        AuthSession attackerSession = registerUser("Avery Keane", "avery.keane@example.com");
        String credentialId = createCredential(ownerSession, "PALS");
        String ceRecordId = createCERecord(ownerSession, credentialId, "Pediatric Update");

        mockMvc.perform(delete("/api/ce-records/{id}", ceRecordId)
                        .header("Authorization", bearerToken(attackerSession)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("CE record not found for id: " + ceRecordId));
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
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }

    private String createCERecord(AuthSession session, String credentialId, String title) throws Exception {
        String payload = """
                {
                  "title": "%s",
                  "provider": "AHA",
                  "hours": 2.5,
                  "dateCompleted": "2026-03-12",
                  "credentialId": "%s"
                }
                """.formatted(title, credentialId);

        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }

    private String createCERecordWithCertificate(
            AuthSession session,
            String credentialId,
            String title,
            String certificateUrl,
            String certificatePublicId,
            String certificateResourceType,
            String certificateOriginalFilename
    ) throws Exception {
        String payload = """
                {
                  "title": "%s",
                  "provider": "AHA",
                  "hours": 2.5,
                  "dateCompleted": "2026-03-12",
                  "certificateUrl": "%s",
                  "certificatePublicId": "%s",
                  "certificateResourceType": "%s",
                  "certificateOriginalFilename": "%s",
                  "credentialId": "%s"
                }
                """.formatted(
                title,
                certificateUrl,
                certificatePublicId,
                certificateResourceType,
                certificateOriginalFilename,
                credentialId
        );

        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }
}
