package com.ccruce.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class AbstractControllerIntegrationTest {

    protected record AuthSession(String userId, String token) {
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected AuthSession registerUser(String name, String email) throws Exception {
        String payload = """
                {
                  "name": "%s",
                  "email": "%s",
                  "password": "secret123"
                }
                """.formatted(name, email);

        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode body = objectMapper.readTree(response);
        return new AuthSession(body.get("user").get("id").asText(), body.get("token").asText());
    }

    protected String bearerToken(AuthSession session) {
        return "Bearer " + session.token();
    }
}
