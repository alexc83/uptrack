package com.ccruce.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CredentialControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Test
    void shouldPerformFullCredentialCrudFlow() throws Exception {
        AuthSession session = registerUser("Taylor Brooks", "taylor.brooks@example.com");
        String userId = session.userId();

        String createPayload = """
                {
                  "name": "RN License - Texas",
                  "type": "LICENSE",
                  "issuingOrganization": "Texas Board of Nursing",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": 20.5,
                  "userId": "%s"
                }
                """.formatted(LocalDate.now().plusDays(120), userId);

        String createResponse = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("RN License - Texas"))
                .andExpect(jsonPath("$.requiredCEHours").value(20.5))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ceHoursEarned").value(0))
                .andExpect(jsonPath("$.ceProgress").value(0))
                .andExpect(jsonPath("$.ceRecords", hasSize(0)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdCredential = objectMapper.readTree(createResponse);
        String credentialId = createdCredential.get("id").asText();

        mockMvc.perform(get("/api/credentials")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(credentialId)));

        mockMvc.perform(get("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.issuingOrganization").value("Texas Board of Nursing"))
                .andExpect(jsonPath("$.ceRecords", hasSize(0)));

        String updatePayload = """
                {
                  "name": "RN License - Texas Updated",
                  "type": "LICENSE",
                  "issuingOrganization": "Texas BON",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 36,
                  "requiredCEHours": 24.0,
                  "userId": "%s"
                }
                """.formatted(LocalDate.now().plusDays(30), userId);

        mockMvc.perform(put("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("RN License - Texas Updated"))
                .andExpect(jsonPath("$.renewalCycleMonths").value(36))
                .andExpect(jsonPath("$.requiredCEHours").value(24.0))
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"))
                .andExpect(jsonPath("$.ceHoursEarned").value(0))
                .andExpect(jsonPath("$.ceProgress").value(0));

        mockMvc.perform(delete("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectMissingUserOnCreate() throws Exception {
        AuthSession session = registerUser("Rory Hale", "rory.hale@example.com");
        String payload = """
                {
                  "name": "BLS",
                  "type": "CERTIFICATION",
                  "issuingOrganization": "AHA",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": 0,
                  "userId": "00000000-0000-0000-0000-000000000001"
                }
                """.formatted(LocalDate.now().plusDays(45));

        mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found for id: 00000000-0000-0000-0000-000000000001"));
    }

    @Test
    void shouldReturnDerivedStatuses() throws Exception {
        AuthSession session = registerUser("Morgan Lee", "morgan.lee@example.com");
        String userId = session.userId();

        String expiredCredentialId = createCredential(session, userId, "Expired Cert", LocalDate.now().minusDays(1));
        String expiringSoonCredentialId = createCredential(session, userId, "Soon Cert", LocalDate.now().plusDays(15));

        mockMvc.perform(get("/api/credentials/{id}", expiredCredentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"));

        mockMvc.perform(get("/api/credentials/{id}", expiringSoonCredentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"));
    }

    @Test
    void shouldReturnNotFoundForMissingCredential() throws Exception {
        AuthSession session = registerUser("Jordan Snow", "jordan.snow@example.com");

        mockMvc.perform(get("/api/credentials/{id}", "00000000-0000-0000-0000-000000000099")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Credential not found for id: 00000000-0000-0000-0000-000000000099"));
    }

    @Test
    void shouldReturnCredentialDetailWithAggregatedCEData() throws Exception {
        AuthSession session = registerUser("Jamie Brooks", "jamie.brooks@example.com");
        String userId = session.userId();
        String credentialId = createCredential(session, userId, "Telemetry Cert", LocalDate.now().plusDays(20), 10.0);

        createCERecord(session, userId, credentialId, "Telemetry Basics", 3.5);
        createCERecord(session, userId, credentialId, "Arrhythmia Review", 2.0);

        mockMvc.perform(get("/api/credentials/{id}", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"))
                .andExpect(jsonPath("$.ceHoursEarned").value(5.5))
                .andExpect(jsonPath("$.ceProgress").value(closeTo(0.55, 0.0001)))
                .andExpect(jsonPath("$.ceRecords", hasSize(2)));
    }

    @Test
    void shouldReturnCERecordsForCredentialRelationshipEndpoint() throws Exception {
        AuthSession session = registerUser("Riley Hart", "riley.hart@example.com");
        String userId = session.userId();
        String credentialId = createCredential(session, userId, "Stroke Cert", LocalDate.now().plusDays(100), 8.0);

        createCERecord(session, userId, credentialId, "Stroke Update", 2.0);
        createCERecord(session, userId, credentialId, "Neuro Assessment", 1.5);

        mockMvc.perform(get("/api/credentials/{id}/ce-records", credentialId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", hasItem("Stroke Update")))
                .andExpect(jsonPath("$[*].title", hasItem("Neuro Assessment")));
    }

    @Test
    void shouldFilterCredentialsByStatusTypeAndSearch() throws Exception {
        AuthSession session = registerUser("Avery Stone", "avery.stone@example.com");
        String userId = session.userId();

        createCredential(session, userId, "RN License", "LICENSE", LocalDate.now().plusDays(180), 20.0);
        createCredential(session, userId, "BLS", "CERTIFICATION", LocalDate.now().plusDays(15), 0.0);
        createCredential(session, userId, "Pharmacy License", "LICENSE", LocalDate.now().minusDays(1), 0.0);

        mockMvc.perform(get("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .param("userId", userId)
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("RN License"));

        mockMvc.perform(get("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .param("userId", userId)
                        .param("type", "LICENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        mockMvc.perform(get("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .param("userId", userId)
                        .param("search", "RN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("RN License"));
    }

    private String createCredential(AuthSession session, String userId, String name, LocalDate expirationDate) throws Exception {
        return createCredential(session, userId, name, "CERTIFICATION", expirationDate, 0.0);
    }

    private String createCredential(
            AuthSession session,
            String userId,
            String name,
            LocalDate expirationDate,
            double requiredCEHours
    ) throws Exception {
        return createCredential(session, userId, name, "CERTIFICATION", expirationDate, requiredCEHours);
    }

    private String createCredential(
            AuthSession session,
            String userId,
            String name,
            String type,
            LocalDate expirationDate,
            double requiredCEHours
    ) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "type": "%s",
                  "issuingOrganization": "AHA",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": %s,
                  "userId": "%s"
                }
                """.formatted(name, type, expirationDate, requiredCEHours, userId);

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

    private String createCERecord(
            AuthSession session,
            String userId,
            String credentialId,
            String title,
            double hours
    ) throws Exception {
        String payload = """
                {
                  "title": "%s",
                  "provider": "AHA",
                  "hours": %s,
                  "dateCompleted": "2026-03-23",
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(title, hours, credentialId, userId);

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
