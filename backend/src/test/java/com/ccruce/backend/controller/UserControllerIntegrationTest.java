package com.ccruce.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Test
    void shouldPerformFullUserCrudFlow() throws Exception {
        AuthSession session = registerUser("Sarah Mitchell", "sarah.mitchell@example.com");
        String userId = session.userId();

        mockMvc.perform(get("/api/users")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(userId)));

        mockMvc.perform(get("/api/users/{id}", userId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("sarah.mitchell@example.com"));

        String updatePayload = """
                {
                  "name": "Sarah M.",
                  "email": "sarah.m@example.com",
                  "password": "updated-secret"
                }
                """;

        mockMvc.perform(put("/api/users/{id}", userId)
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sarah M."))
                .andExpect(jsonPath("$.email").value("sarah.m@example.com"));

        mockMvc.perform(delete("/api/users/{id}", userId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/{id}", userId)
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {
        String payload = """
                {
                  "name": "Alex",
                  "email": "alex@example.com",
                  "password": "secret123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email is already in use."));
    }
}
