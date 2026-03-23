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

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CERecordControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldPerformFullCERecordCrudFlow() throws Exception {
        String userId = createUser("Jamie Carter", "jamie.carter@example.com");
        String credentialId = createCredential(userId, "RN License - Texas");

        String createPayload = """
                {
                  "title": "Trauma Update",
                  "provider": "AACN",
                  "hours": 4.5,
                  "dateCompleted": "2026-03-01",
                  "certificateUrl": "https://example.com/certificates/trauma-update.pdf",
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(credentialId, userId);

        String createResponse = mockMvc.perform(post("/api/ce-records")
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

        mockMvc.perform(get("/api/ce-records"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(ceRecordId)));

        mockMvc.perform(get("/api/ce-records/{id}", ceRecordId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificateUrl").value("https://example.com/certificates/trauma-update.pdf"));

        String updatePayload = """
                {
                  "title": "Trauma Update Advanced",
                  "provider": "AACN NTI",
                  "hours": 6.0,
                  "dateCompleted": "2026-03-10",
                  "certificateUrl": null,
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(credentialId, userId);

        mockMvc.perform(put("/api/ce-records/{id}", ceRecordId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Trauma Update Advanced"))
                .andExpect(jsonPath("$.provider").value("AACN NTI"))
                .andExpect(jsonPath("$.hours").value(6.0))
                .andExpect(jsonPath("$.certificateUrl").doesNotExist());

        mockMvc.perform(delete("/api/ce-records/{id}", ceRecordId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/ce-records/{id}", ceRecordId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("CE record not found for id: " + ceRecordId));
    }

    @Test
    void shouldRejectMissingCredentialOnCreate() throws Exception {
        String userId = createUser("Robin Sloan", "robin.sloan@example.com");

        String payload = """
                {
                  "title": "Stroke Care",
                  "provider": "Hospital Education",
                  "hours": 2.0,
                  "dateCompleted": "2026-03-15",
                  "credentialId": "00000000-0000-0000-0000-000000000010",
                  "userId": "%s"
                }
                """.formatted(userId);

        mockMvc.perform(post("/api/ce-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Credential not found for id: 00000000-0000-0000-0000-000000000010"));
    }

    @Test
    void shouldRejectMissingUserOnCreate() throws Exception {
        String userId = createUser("Casey Hart", "casey.hart@example.com");
        String credentialId = createCredential(userId, "BLS");

        String payload = """
                {
                  "title": "Airway Management",
                  "provider": "AHA",
                  "hours": 1.0,
                  "dateCompleted": "2026-03-12",
                  "credentialId": "%s",
                  "userId": "00000000-0000-0000-0000-000000000011"
                }
                """.formatted(credentialId);

        mockMvc.perform(post("/api/ce-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found for id: 00000000-0000-0000-0000-000000000011"));
    }

    @Test
    void shouldRejectCredentialOwnedByDifferentUser() throws Exception {
        String credentialOwnerId = createUser("Dana Price", "dana.price@example.com");
        String anotherUserId = createUser("Jordan Vale", "jordan.vale@example.com");
        String credentialId = createCredential(credentialOwnerId, "CCRN");

        String payload = """
                {
                  "title": "Critical Care Review",
                  "provider": "AACN",
                  "hours": 3.0,
                  "dateCompleted": "2026-03-18",
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(credentialId, anotherUserId);

        mockMvc.perform(post("/api/ce-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Credential does not belong to the specified user."));
    }

    private String createUser(String name, String email) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "email": "%s",
                  "password": "secret123"
                }
                """.formatted(name, email);

        String response = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }

    private String createCredential(String userId, String name) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "type": "CERTIFICATION",
                  "issuingOrganization": "AHA",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": 8.0,
                  "userId": "%s"
                }
                """.formatted(name, LocalDate.now().plusDays(180), userId);

        String response = mockMvc.perform(post("/api/credentials")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }
}
