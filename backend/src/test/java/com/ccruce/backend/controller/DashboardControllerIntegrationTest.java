package com.ccruce.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Test
    void shouldReturnAggregatedDashboardDataForAuthenticatedUser() throws Exception {
        AuthSession session = registerUser("Alex Carter", "alex.dashboard@example.com");
        String userId = session.userId();

        String activeCredentialId = createCredential(session, "RN License", "LICENSE", LocalDate.now().plusDays(180), 20.0);
        String expiringCredentialId = createCredential(session, "ACLS", "CERTIFICATION", LocalDate.now().plusDays(20), 8.0);
        createCredential(session, "PALS", "CERTIFICATION", LocalDate.now().minusDays(2), 0.0);

        createCeRecord(session, userId, activeCredentialId, "Nursing Update", 5.0, false);
        createCeRecord(session, userId, expiringCredentialId, "Cardiac Review", 2.0, true);

        mockMvc.perform(get("/api/dashboard")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalCredentials").value(3))
                .andExpect(jsonPath("$.stats.activeCount").value(1))
                .andExpect(jsonPath("$.stats.expiringSoonCount").value(1))
                .andExpect(jsonPath("$.stats.expiredCount").value(1))
                .andExpect(jsonPath("$.stats.needsCEAttentionCount").value(2))
                .andExpect(jsonPath("$.upcomingExpirations", hasSize(1)))
                .andExpect(jsonPath("$.upcomingExpirations[0].name").value("ACLS"))
                .andExpect(jsonPath("$.ceAttention", hasSize(2)))
                .andExpect(jsonPath("$.ceAttention[0].name").value("ACLS"))
                .andExpect(jsonPath("$.ceAttention[0].ceProgress").value(closeTo(0.25, 0.0001)))
                .andExpect(jsonPath("$.recentActivity", hasSize(2)))
                .andExpect(jsonPath("$.recentActivity[0].title").value("Uploaded certificate"));
    }

    @Test
    void shouldReturnEmptyDashboardForUserWithoutCredentials() throws Exception {
        AuthSession session = registerUser("Jordan Lane", "jordan.dashboard@example.com");

        mockMvc.perform(get("/api/dashboard")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalCredentials").value(0))
                .andExpect(jsonPath("$.upcomingExpirations", hasSize(0)))
                .andExpect(jsonPath("$.ceAttention", hasSize(0)))
                .andExpect(jsonPath("$.recentActivity", hasSize(0)));
    }

    private String createCredential(
            AuthSession session,
            String name,
            String type,
            LocalDate expirationDate,
            double requiredCeHours
    ) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "type": "%s",
                  "issuingOrganization": "AHA",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 24,
                  "requiredCEHours": %s
                }
                """.formatted(name, type, expirationDate, requiredCeHours);

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

    private void createCeRecord(
            AuthSession session,
            String userId,
            String credentialId,
            String title,
            double hours,
            boolean withCertificate
    ) throws Exception {
        String payload = withCertificate
                ? """
                {
                  "title": "%s",
                  "provider": "AHA",
                  "hours": %s,
                  "dateCompleted": "2026-03-23",
                  "certificateUrl": "https://example.com/certificate.pdf",
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(title, hours, credentialId, userId)
                : """
                {
                  "title": "%s",
                  "provider": "AHA",
                  "hours": %s,
                  "dateCompleted": "2026-03-23",
                  "credentialId": "%s",
                  "userId": "%s"
                }
                """.formatted(title, hours, credentialId, userId);

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());
    }
}
