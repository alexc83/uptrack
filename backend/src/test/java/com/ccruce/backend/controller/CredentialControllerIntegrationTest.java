package com.ccruce.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

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
class CredentialControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldPerformFullCredentialCrudFlow() throws Exception {
        String userId = createUser("Taylor Brooks", "taylor.brooks@example.com");

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

        mockMvc.perform(get("/api/credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(credentialId)));

        mockMvc.perform(get("/api/credentials/{id}", credentialId))
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("RN License - Texas Updated"))
                .andExpect(jsonPath("$.renewalCycleMonths").value(36))
                .andExpect(jsonPath("$.requiredCEHours").value(24.0))
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"))
                .andExpect(jsonPath("$.ceHoursEarned").value(0))
                .andExpect(jsonPath("$.ceProgress").value(0));

        mockMvc.perform(delete("/api/credentials/{id}", credentialId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/credentials/{id}", credentialId))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectMissingUserOnCreate() throws Exception {
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found for id: 00000000-0000-0000-0000-000000000001"));
    }

    @Test
    void shouldReturnDerivedStatuses() throws Exception {
        String userId = createUser("Morgan Lee", "morgan.lee@example.com");

        String expiredCredentialId = createCredential(userId, "Expired Cert", LocalDate.now().minusDays(1));
        String expiringSoonCredentialId = createCredential(userId, "Soon Cert", LocalDate.now().plusDays(15));

        mockMvc.perform(get("/api/credentials/{id}", expiredCredentialId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"));

        mockMvc.perform(get("/api/credentials/{id}", expiringSoonCredentialId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"));
    }

    @Test
    void shouldReturnNotFoundForMissingCredential() throws Exception {
        mockMvc.perform(get("/api/credentials/{id}", "00000000-0000-0000-0000-000000000099"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Credential not found for id: 00000000-0000-0000-0000-000000000099"));
    }

    @Test
    void shouldReturnCredentialDetailWithAggregatedCEData() throws Exception {
        String userId = createUser("Jamie Brooks", "jamie.brooks@example.com");
        String credentialId = createCredential(userId, "Telemetry Cert", LocalDate.now().plusDays(20), 10.0);

        createCERecord(userId, credentialId, "Telemetry Basics", 3.5);
        createCERecord(userId, credentialId, "Arrhythmia Review", 2.0);

        mockMvc.perform(get("/api/credentials/{id}", credentialId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRING_SOON"))
                .andExpect(jsonPath("$.ceHoursEarned").value(5.5))
                .andExpect(jsonPath("$.ceProgress").value(closeTo(0.55, 0.0001)))
                .andExpect(jsonPath("$.ceRecords", hasSize(2)));
    }

    @Test
    void shouldReturnCERecordsForCredentialRelationshipEndpoint() throws Exception {
        String userId = createUser("Riley Hart", "riley.hart@example.com");
        String credentialId = createCredential(userId, "Stroke Cert", LocalDate.now().plusDays(100), 8.0);

        createCERecord(userId, credentialId, "Stroke Update", 2.0);
        createCERecord(userId, credentialId, "Neuro Assessment", 1.5);

        mockMvc.perform(get("/api/credentials/{id}/ce-records", credentialId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", hasItem("Stroke Update")))
                .andExpect(jsonPath("$[*].title", hasItem("Neuro Assessment")));
    }

    @Test
    void shouldFilterCredentialsByStatusTypeAndSearch() throws Exception {
        String userId = createUser("Avery Stone", "avery.stone@example.com");

        createCredential(userId, "RN License", "LICENSE", LocalDate.now().plusDays(180), 20.0);
        createCredential(userId, "BLS", "CERTIFICATION", LocalDate.now().plusDays(15), 0.0);
        createCredential(userId, "Pharmacy License", "LICENSE", LocalDate.now().minusDays(1), 0.0);

        mockMvc.perform(get("/api/credentials")
                        .param("userId", userId)
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("RN License"));

        mockMvc.perform(get("/api/credentials")
                        .param("userId", userId)
                        .param("type", "LICENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        mockMvc.perform(get("/api/credentials")
                        .param("userId", userId)
                        .param("search", "RN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("RN License"));
    }

    private String createUser(String name, String email) throws Exception {
        String createUserPayload = """
                {
                  "name": "%s",
                  "email": "%s",
                  "password": "secret123"
                }
                """.formatted(name, email);

        String createUserResponse = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserPayload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(createUserResponse).get("id").asText();
    }

    private String createCredential(String userId, String name, LocalDate expirationDate) throws Exception {
        return createCredential(userId, name, "CERTIFICATION", expirationDate, 0.0);
    }

    private String createCredential(String userId, String name, LocalDate expirationDate, double requiredCEHours) throws Exception {
        return createCredential(userId, name, "CERTIFICATION", expirationDate, requiredCEHours);
    }

    private String createCredential(
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }

    private String createCERecord(String userId, String credentialId, String title, double hours) throws Exception {
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }
}
