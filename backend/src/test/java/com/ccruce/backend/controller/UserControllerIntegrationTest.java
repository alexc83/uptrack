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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldPerformFullUserCrudFlow() throws Exception {
        String createPayload = """
                {
                  "name": "Sarah Mitchell",
                  "email": "sarah.mitchell@example.com",
                  "password": "secret123"
                }
                """;

        String createResponse = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Sarah Mitchell"))
                .andExpect(jsonPath("$.email").value("sarah.mitchell@example.com"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdUser = objectMapper.readTree(createResponse);
        String userId = createdUser.get("id").asText();

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(userId));

        mockMvc.perform(get("/api/users/{id}", userId))
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sarah M."))
                .andExpect(jsonPath("$.email").value("sarah.m@example.com"));

        mockMvc.perform(delete("/api/users/{id}", userId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/{id}", userId))
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

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email is already in use."));
    }
}
