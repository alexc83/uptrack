package com.ccruce.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

    @Test
    void shouldGetAndUpdateCurrentUserProfile() throws Exception {
        AuthSession session = registerUser("Alex Carter", "alex.profile@example.com");

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", bearerToken(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alex Carter"))
                .andExpect(jsonPath("$.email").value("alex.profile@example.com"));

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "  Alex Nurse  ",
                                  "email": "ALEX.NURSE@example.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alex Nurse"))
                .andExpect(jsonPath("$.email").value("alex.nurse@example.com"));
    }

    @Test
    void shouldRejectCurrentUserProfileUpdateWhenEmailAlreadyExists() throws Exception {
        AuthSession alex = registerUser("Alex Carter", "alex.profile.conflict@example.com");
        registerUser("Jordan Hale", "jordan.profile.conflict@example.com");

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", bearerToken(alex))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Alex Carter",
                                  "email": "jordan.profile.conflict@example.com"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email is already in use."));
    }

    @Test
    void shouldChangeCurrentUserPasswordAndRequireNewPasswordForFutureLogin() throws Exception {
        AuthSession session = registerUser("Alex Carter", "alex.password@example.com");

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "secret123",
                                  "newPassword": "updatedSecret123"
                                }
                                """))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "alex.password@example.com",
                                  "password": "secret123"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "alex.password@example.com",
                                  "password": "updatedSecret123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("alex.password@example.com"));
    }

    @Test
    void shouldRejectPasswordChangeWhenCurrentPasswordIsIncorrect() throws Exception {
        AuthSession session = registerUser("Alex Carter", "alex.password.error@example.com");

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "wrong-password",
                                  "newPassword": "updatedSecret123"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect."));
    }

    @Test
    void shouldRejectPasswordChangeWhenNewPasswordMatchesCurrentPassword() throws Exception {
        AuthSession session = registerUser("Alex Carter", "alex.password.same@example.com");

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "secret123",
                                  "newPassword": "secret123"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("New password must be different from the current password."));
    }
}
