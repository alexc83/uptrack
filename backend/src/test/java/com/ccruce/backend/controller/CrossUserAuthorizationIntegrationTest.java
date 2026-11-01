package com.ccruce.backend.controller;

import com.ccruce.backend.config.AuthProperties;
import com.fasterxml.jackson.databind.JsonNode;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Two-user authorization regression matrix (milestone S01).
 *
 * User A owns the "victim" data; user B is an authenticated attacker. Every assertion about B touching A's data
 * expects 404 (the same answer as for a non-existent id) and checks that nothing of A's was changed or disclosed.
 * The matrix also covers invalid, tampered and expired tokens on protected and public endpoints, removed endpoints,
 * and the unchanged behaviour of the authorized owner paths.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CrossUserAuthorizationIntegrationTest extends AbstractControllerIntegrationTest {

    private static final String PASSWORD = "secret123";
    private static final String GENERIC_UNAUTHORIZED = "Authentication is required.";

    @Autowired
    private AuthProperties authProperties;

    private record World(
            AuthSession a, String emailA,
            AuthSession b, String emailB,
            String credentialA, String ceRecordA,
            String credentialB, String ceRecordB
    ) {
    }

    private record NamedRequest(String name, MockHttpServletRequestBuilder request) {
    }

    private World world;

    @BeforeEach
    void setUpWorld() throws Exception {
        String emailA = uniqueEmail("a");
        String emailB = uniqueEmail("b");
        AuthSession a = registerUser("Victim A", emailA);
        AuthSession b = registerUser("Attacker B", emailB);
        String credentialA = createCredential(a, "A License");
        String ceRecordA = createCERecord(a, credentialA, "A Course");
        String credentialB = createCredential(b, "B License");
        String ceRecordB = createCERecord(b, credentialB, "B Course");
        world = new World(a, emailA, b, emailB, credentialA, ceRecordA, credentialB, ceRecordB);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void otherUserCannotReadCredentialByIdOrItsRelationships() throws Exception {
        assertNotFoundWithoutLeak(get("/api/credentials/{id}", world.credentialA()), world.b());
        assertNotFoundWithoutLeak(get("/api/credentials/{id}/ce-records", world.credentialA()), world.b());
        assertNotFoundWithoutLeak(get("/api/credentials/{id}/ce-report", world.credentialA()), world.b());
    }

    @Test
    void otherUserCannotReadCeRecordById() throws Exception {
        assertNotFoundWithoutLeak(get("/api/ce-records/{id}", world.ceRecordA()), world.b());
    }

    @Test
    void ownerStillReadsOwnCredentialAndCeRecordData() throws Exception {
        mockMvc.perform(get("/api/credentials/{id}", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("A License"))
                .andExpect(jsonPath("$.ceRecords", hasSize(1)));
        mockMvc.perform(get("/api/credentials/{id}/ce-records", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
        mockMvc.perform(get("/api/credentials/{id}/ce-report", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.recordCount").value(1));
        mockMvc.perform(get("/api/ce-records/{id}", world.ceRecordA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("A Course"));
    }

    @Test
    void credentialListIsAlwaysScopedToTheCaller() throws Exception {
        List<String> queries = List.of(
                "",
                "?userId=" + world.a().userId(),
                "?userId=" + world.b().userId(),
                "?userId=not-a-uuid",
                "?userId=" + UUID.randomUUID(),
                "?status=ACTIVE",
                "?type=CERTIFICATION",
                "?search=License",
                "?userId=" + world.a().userId() + "&search=A%20License",
                "?userId=" + world.a().userId() + "&type=CERTIFICATION&status=ACTIVE"
        );

        for (String query : queries) {
            String body = mockMvc.perform(get("/api/credentials" + query).header("Authorization", bearerToken(world.b())))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertFalse(body.contains(world.credentialA()), "A's credential id leaked for query '" + query + "'");
            assertFalse(body.contains("A License"), "A's credential name leaked for query '" + query + "'");
            for (JsonNode item : objectMapper.readTree(body)) {
                assertEquals(world.credentialB(), item.get("id").asText(), "unexpected credential for query '" + query + "'");
            }
        }

        mockMvc.perform(get("/api/credentials").param("userId", world.a().userId()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(world.credentialB()));
    }

    @Test
    void ceRecordListIsScopedToTheCaller() throws Exception {
        String body = mockMvc.perform(get("/api/ce-records").header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains(world.ceRecordA()));
        assertFalse(body.contains("A Course"));
    }

    @Test
    void dashboardNeverMixesUsers() throws Exception {
        String body = mockMvc.perform(get("/api/dashboard").header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalCredentials").value(1))
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("A License"));
        assertFalse(body.contains("A Course"));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Creates (ownership always comes from the token, never from the request)
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void credentialCreationIgnoresClientSuppliedOwnerFields() throws Exception {
        String payload = """
                {
                  "id": "%s",
                  "userId": "%s",
                  "user": {"id": "%s"},
                  "name": "Injected Owner License",
                  "type": "LICENSE",
                  "issuingOrganization": "Board",
                  "expirationDate": "%s",
                  "renewalCycleMonths": 12,
                  "requiredCEHours": 4.0
                }
                """.formatted(UUID.randomUUID(), world.a().userId(), world.a().userId(), LocalDate.now().plusDays(200));

        String created = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String createdId = objectMapper.readTree(created).get("id").asText();

        mockMvc.perform(get("/api/credentials/{id}", createdId).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk());
        assertNotFoundWithoutLeak(get("/api/credentials/{id}", createdId), world.a());
        String listA = mockMvc.perform(get("/api/credentials").header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(listA.contains(createdId), "credential created by B appears in A's list");
    }

    @Test
    void ceRecordCreationIgnoresClientSuppliedOwnerFields() throws Exception {
        String payload = """
                {
                  "id": "%s",
                  "userId": "%s",
                  "user": {"id": "%s"},
                  "title": "Injected Owner Course",
                  "provider": "AHA",
                  "hours": 1.5,
                  "dateCompleted": "2026-03-12",
                  "credentialId": "%s"
                }
                """.formatted(UUID.randomUUID(), world.a().userId(), world.a().userId(), world.credentialB());

        String created = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String createdId = objectMapper.readTree(created).get("id").asText();

        mockMvc.perform(get("/api/ce-records/{id}", createdId).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk());
        assertNotFoundWithoutLeak(get("/api/ce-records/{id}", createdId), world.a());
        String listA = mockMvc.perform(get("/api/ce-records").header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(listA.contains(createdId), "CE record created by B appears in A's list");
        mockMvc.perform(get("/api/credentials/{id}/ce-records", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void cannotCreateCeRecordOnAnotherUsersCredential() throws Exception {
        String payload = ceJson(world.credentialA(), "Injected into A");

        mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Credential not found for id: " + world.credentialA()))
                .andExpect(jsonPath("$.message", not(containsString("belong"))));

        mockMvc.perform(get("/api/credentials/{id}/ce-records", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void foreignAndNonExistentCredentialsAreIndistinguishableOnCeCreation() throws Exception {
        String unknownId = UUID.randomUUID().toString();
        String foreign = mockMvc.perform(post("/api/ce-records").header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON).content(ceJson(world.credentialA(), "x")))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = mockMvc.perform(post("/api/ce-records").header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON).content(ceJson(unknownId, "x")))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(
                objectMapper.readTree(foreign).get("message").asText().replace(world.credentialA(), "<id>"),
                objectMapper.readTree(unknown).get("message").asText().replace(unknownId, "<id>")
        );
    }

    // ------------------------------------------------------------------------------------------------------------
    // Updates and relationship manipulation
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void otherUserCannotUpdateCredentialOrCeRecord() throws Exception {
        mockMvc.perform(put("/api/credentials/{id}", world.credentialA())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentialJson("Hijacked")))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/ce-records/{id}", world.ceRecordA())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ceJson(world.credentialB(), "Hijacked")))
                .andExpect(status().isNotFound());

        assertVictimDataIntact();
    }

    @Test
    void cannotMoveOwnCeRecordOntoAnotherUsersCredential() throws Exception {
        mockMvc.perform(put("/api/ce-records/{id}", world.ceRecordB())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ceJson(world.credentialA(), "Moved onto A")))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/ce-records/{id}", world.ceRecordB()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("B Course"));
        assertVictimDataIntact();
    }

    @Test
    void cannotRetargetAnotherUsersCeRecordToOwnCredential() throws Exception {
        mockMvc.perform(put("/api/ce-records/{id}", world.ceRecordA())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ceJson(world.credentialB(), "Stolen")))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/credentials/{id}/ce-records", world.credentialB()).header("Authorization", bearerToken(world.b())))
                .andExpect(jsonPath("$", hasSize(1)));
        assertVictimDataIntact();
    }

    @Test
    void updatesIgnoreClientSuppliedOwnerFields() throws Exception {
        String credentialPayload = """
                {
                  "userId": "%s", "user": {"id": "%s"},
                  "name": "B Renamed", "type": "LICENSE", "issuingOrganization": "Board",
                  "expirationDate": "%s", "renewalCycleMonths": 12, "requiredCEHours": 4.0
                }
                """.formatted(world.a().userId(), world.a().userId(), LocalDate.now().plusDays(300));
        mockMvc.perform(put("/api/credentials/{id}", world.credentialB())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON).content(credentialPayload))
                .andExpect(status().isOk());
        String cePayload = """
                {
                  "userId": "%s", "user": {"id": "%s"},
                  "title": "B Course Renamed", "provider": "AHA", "hours": 3.0,
                  "dateCompleted": "2026-03-12", "credentialId": "%s"
                }
                """.formatted(world.a().userId(), world.a().userId(), world.credentialB());
        mockMvc.perform(put("/api/ce-records/{id}", world.ceRecordB())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON).content(cePayload))
                .andExpect(status().isOk());

        assertNotFoundWithoutLeak(get("/api/credentials/{id}", world.credentialB()), world.a());
        assertNotFoundWithoutLeak(get("/api/ce-records/{id}", world.ceRecordB()), world.a());
        mockMvc.perform(get("/api/credentials/{id}", world.credentialB()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("B Renamed"));
    }

    @Test
    void ownerCanStillMoveCeRecordBetweenOwnCredentials() throws Exception {
        String secondCredential = createCredential(world.b(), "B Second License");
        mockMvc.perform(put("/api/ce-records/{id}", world.ceRecordB())
                        .header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ceJson(secondCredential, "B Course")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/credentials/{id}/ce-records", secondCredential).header("Authorization", bearerToken(world.b())))
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Deletes
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void otherUserCannotDeleteCredentialOrCeRecord() throws Exception {
        mockMvc.perform(delete("/api/ce-records/{id}", world.ceRecordA()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/credentials/{id}", world.credentialA()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isNotFound());

        assertVictimDataIntact();
    }

    @Test
    void ownerDeletingCredentialStillCascadesToOwnCeRecordsOnly() throws Exception {
        mockMvc.perform(delete("/api/credentials/{id}", world.credentialB()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/ce-records/{id}", world.ceRecordB()).header("Authorization", bearerToken(world.b())))
                .andExpect(status().isNotFound());
        assertVictimDataIntact();
    }

    // ------------------------------------------------------------------------------------------------------------
    // /users: removed collection and {id} endpoints, /users/me* fully functional
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void removedUserEndpointsReturnGeneric404WithoutInternalDetails() throws Exception {
        List<String> paths = List.of("/api/users", "/api/users/" + world.a().userId(), "/api/users/" + UUID.randomUUID());
        for (String path : paths) {
            for (MockHttpServletRequestBuilder request : List.of(
                    get(path), post(path).contentType(MediaType.APPLICATION_JSON).content("{}"),
                    put(path).contentType(MediaType.APPLICATION_JSON).content("{}"), delete(path), patch(path))) {
                String body = mockMvc.perform(request.header("Authorization", bearerToken(world.b())))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.status").value(404))
                        .andExpect(jsonPath("$.message").value("The requested resource was not found."))
                        .andReturn().getResponse().getContentAsString();
                assertGenericErrorBody(body, path);
            }
        }
        // user A must be untouched by all of the above
        mockMvc.perform(get("/api/users/me").header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Victim A"));
    }

    @Test
    void wrongMethodsOnMeEndpointsReturnGeneric405() throws Exception {
        for (String path : List.of("/api/users/me", "/api/users/me/password")) {
            for (MockHttpServletRequestBuilder request : List.of(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"), delete(path), patch(path))) {
                String body = mockMvc.perform(request.header("Authorization", bearerToken(world.b())))
                        .andExpect(status().isMethodNotAllowed())
                        .andExpect(jsonPath("$.status").value(405))
                        .andExpect(jsonPath("$.message").value("The request method is not supported for this resource."))
                        .andReturn().getResponse().getContentAsString();
                assertGenericErrorBody(body, path);
            }
        }
    }

    @Test
    void removedUserEndpointsStillRequireAuthentication() throws Exception {
        for (String path : List.of("/api/users", "/api/users/" + world.a().userId())) {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(GENERIC_UNAUTHORIZED));
        }
    }

    @Test
    void unknownApiPathsReturnGeneric404() throws Exception {
        mockMvc.perform(get("/api/does-not-exist").header("Authorization", bearerToken(world.a())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("The requested resource was not found."));
    }

    @Test
    void meEndpointsRemainFullyFunctionalAndIsolated() throws Exception {
        mockMvc.perform(get("/api/users/me").header("Authorization", bearerToken(world.b())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(world.b().userId()))
                .andExpect(jsonPath("$.email").value(world.emailB()))
                .andExpect(jsonPath("$.password").doesNotExist());

        // profile update works, ignores smuggled fields, and cannot collide with another user's email
        String newEmail = uniqueEmail("b-new");
        mockMvc.perform(put("/api/users/me").header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"id": "%s", "name": "Attacker B Renamed", "email": "%s", "password": "smuggled-pass-1"}
                                """.formatted(world.a().userId(), newEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(world.b().userId()))
                .andExpect(jsonPath("$.name").value("Attacker B Renamed"))
                .andExpect(jsonPath("$.email").value(newEmail));
        mockMvc.perform(put("/api/users/me").header("Authorization", bearerToken(world.b()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"x\", \"email\": \"" + world.emailA() + "\"}"))
                .andExpect(status().isConflict());
        login(newEmail, PASSWORD).andExpect(status().isOk());
        login(newEmail, "smuggled-pass-1").andExpect(status().isUnauthorized());

        // password change: wrong current, same, too short are rejected; success only affects the caller
        putPassword(world.b(), "wrong-current", "NewPassword-1").andExpect(status().isBadRequest());
        putPassword(world.b(), PASSWORD, PASSWORD).andExpect(status().isBadRequest());
        putPassword(world.b(), PASSWORD, "short").andExpect(status().isBadRequest());
        putPassword(world.b(), PASSWORD, "NewPassword-1").andExpect(status().isNoContent());
        login(newEmail, "NewPassword-1").andExpect(status().isOk());
        login(newEmail, PASSWORD).andExpect(status().isUnauthorized());
        login(world.emailA(), PASSWORD).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Tokens: invalid / tampered / expired on protected and public endpoints
    // ------------------------------------------------------------------------------------------------------------

    @ParameterizedTest
    @ValueSource(strings = {"no-token", "tampered-signature", "expired", "wrong-signing-key", "unsigned-alg-none", "garbage",
            "truncated", "empty-token", "missing-uid-claim", "non-uuid-uid", "non-string-uid", "not-yet-valid"})
    void everyProtectedEndpointReturnsOneGeneric401ForAnyBadToken(String kind) throws Exception {
        String header = authorizationHeaderFor(kind);
        List<String> failures = new ArrayList<>();

        for (NamedRequest namedRequest : protectedRequests()) {
            MockHttpServletRequestBuilder request = namedRequest.request();
            if (header != null) {
                request.header("Authorization", header);
            }
            var response = mockMvc.perform(request).andReturn().getResponse();
            String body = response.getContentAsString();
            boolean ok = response.getStatus() == 401
                    && body.contains("\"message\":\"" + GENERIC_UNAUTHORIZED + "\"")
                    && body.contains("\"status\":401") && body.contains("\"error\":\"Unauthorized\"");
            if (!ok) {
                failures.add(kind + " " + namedRequest.name() + " -> " + response.getStatus() + " " + body);
            }
        }
        assertTrue(failures.isEmpty(), "Unexpected responses:\n" + String.join("\n", failures));
    }

    @ParameterizedTest
    @ValueSource(strings = {"tampered-signature", "expired", "wrong-signing-key", "unsigned-alg-none", "garbage",
            "truncated", "empty-token", "missing-uid-claim", "non-uuid-uid", "non-string-uid", "not-yet-valid"})
    void staleOrInvalidTokensNeverBlockPublicEndpoints(String kind) throws Exception {
        String header = authorizationHeaderFor(kind);

        login(world.emailA(), PASSWORD, header).andExpect(status().isOk()).andExpect(jsonPath("$.token").exists());
        mockMvc.perform(post("/api/auth/register")
                        .header("Authorization", header)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Stale Token User\", \"email\": \"" + uniqueEmail("stale") + "\", \"password\": \"" + PASSWORD + "\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/health").header("Authorization", header)).andExpect(status().isOk());
        // /auth/me is not a public endpoint in practice: without a valid identity it is still the generic 401
        mockMvc.perform(get("/api/auth/me").header("Authorization", header))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(GENERIC_UNAUTHORIZED));
    }

    @Test
    void validTokensKeepWorkingOnEveryProtectedEndpoint() throws Exception {
        for (NamedRequest namedRequest : protectedRequests()) {
            var response = mockMvc.perform(namedRequest.request().header("Authorization", bearerToken(world.a()))).andReturn().getResponse();
            assertTrue(response.getStatus() < 500 && response.getStatus() != 401,
                    "valid token rejected on " + namedRequest.name() + " -> " + response.getStatus());
        }
    }

    @Test
    void unauthenticatedAndInvalidTokenResponsesNeverRevealWhyTheTokenFailed() throws Exception {
        String expired = mockMvc.perform(get("/api/credentials").header("Authorization", authorizationHeaderFor("expired")))
                .andReturn().getResponse().getContentAsString();
        String tampered = mockMvc.perform(get("/api/credentials").header("Authorization", authorizationHeaderFor("tampered-signature")))
                .andReturn().getResponse().getContentAsString();
        String none = mockMvc.perform(get("/api/credentials")).andReturn().getResponse().getContentAsString();
        for (String body : List.of(expired, tampered, none)) {
            assertFalse(body.toLowerCase().contains("expired"), body);
            assertFalse(body.toLowerCase().contains("signature"), body);
            assertFalse(body.toLowerCase().contains("jwt"), body);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------------------------------------------------

    private List<NamedRequest> protectedRequests() {
        String cred = world.credentialA();
        String ce = world.ceRecordA();
        List<NamedRequest> requests = new ArrayList<>();
        requests.add(new NamedRequest("GET /credentials", get("/api/credentials")));
        requests.add(new NamedRequest("GET /credentials/{id}", get("/api/credentials/{id}", cred)));
        requests.add(new NamedRequest("GET /credentials/{id}/ce-records", get("/api/credentials/{id}/ce-records", cred)));
        requests.add(new NamedRequest("GET /credentials/{id}/ce-report", get("/api/credentials/{id}/ce-report", cred)));
        requests.add(new NamedRequest("POST /credentials", post("/api/credentials").contentType(MediaType.APPLICATION_JSON).content(credentialJson("x"))));
        requests.add(new NamedRequest("PUT /credentials/{id}", put("/api/credentials/{id}", cred).contentType(MediaType.APPLICATION_JSON).content(credentialJson("x"))));
        requests.add(new NamedRequest("DELETE /credentials/{id}", delete("/api/credentials/{id}", UUID.randomUUID())));
        requests.add(new NamedRequest("GET /ce-records", get("/api/ce-records")));
        requests.add(new NamedRequest("GET /ce-records/{id}", get("/api/ce-records/{id}", ce)));
        requests.add(new NamedRequest("POST /ce-records", post("/api/ce-records").contentType(MediaType.APPLICATION_JSON).content(ceJson(cred, "x"))));
        requests.add(new NamedRequest("PUT /ce-records/{id}", put("/api/ce-records/{id}", ce).contentType(MediaType.APPLICATION_JSON).content(ceJson(cred, "x"))));
        requests.add(new NamedRequest("DELETE /ce-records/{id}", delete("/api/ce-records/{id}", UUID.randomUUID())));
        requests.add(new NamedRequest("GET /dashboard", get("/api/dashboard")));
        requests.add(new NamedRequest("POST /uploads/certificates", multipart("/api/uploads/certificates")
                .file(new MockMultipartFile("file", "x.txt", "text/plain", "x".getBytes(StandardCharsets.UTF_8)))));
        requests.add(new NamedRequest("GET /users/me", get("/api/users/me")));
        requests.add(new NamedRequest("PUT /users/me", put("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"x\", \"email\": \"" + uniqueEmail("m") + "\"}")));
        requests.add(new NamedRequest("PUT /users/me/password", put("/api/users/me/password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\": \"x\", \"newPassword\": \"NewPassword-1\"}")));
        return requests;
    }

    private String authorizationHeaderFor(String kind) {
        String uid = world.a().userId();
        Instant now = Instant.now();
        String valid = world.a().token();
        return switch (kind) {
            case "no-token" -> null;
            case "tampered-signature" -> "Bearer " + valid.substring(0, valid.length() - 4) + (valid.endsWith("AAAA") ? "BBBB" : "AAAA");
            case "expired" -> "Bearer " + sign(authProperties.secret(), Map.of("uid", uid, "name", "Victim A"), now.minusSeconds(7200), now.minusSeconds(3600), null);
            case "wrong-signing-key" -> "Bearer " + sign("another-secret-key-that-is-long-enough-for-hs256!!", Map.of("uid", uid, "name", "Victim A"), now, now.plusSeconds(3600), null);
            case "unsigned-alg-none" -> "Bearer " + Jwts.builder().subject("x").claim("uid", uid).expiration(Date.from(now.plusSeconds(3600))).compact();
            case "garbage" -> "Bearer not.a.jwt";
            case "truncated" -> "Bearer " + valid.substring(0, 25);
            case "empty-token" -> "Bearer ";
            case "missing-uid-claim" -> "Bearer " + sign(authProperties.secret(), Map.of("name", "Victim A"), now, now.plusSeconds(3600), null);
            case "non-uuid-uid" -> "Bearer " + sign(authProperties.secret(), Map.of("uid", "not-a-uuid", "name", "Victim A"), now, now.plusSeconds(3600), null);
            case "non-string-uid" -> "Bearer " + sign(authProperties.secret(), Map.of("uid", 12345, "name", "Victim A"), now, now.plusSeconds(3600), null);
            case "not-yet-valid" -> "Bearer " + sign(authProperties.secret(), Map.of("uid", uid, "name", "Victim A"), now, now.plusSeconds(7200), now.plusSeconds(3600));
            default -> throw new IllegalArgumentException(kind);
        };
    }

    private String sign(String secret, Map<String, Object> claims, Instant issuedAt, Instant expiresAt, Instant notBefore) {
        var builder = Jwts.builder()
                .subject("token-test@example.test")
                .claims(claims)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt));
        if (notBefore != null) {
            builder.notBefore(Date.from(notBefore));
        }
        return builder.signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
    }

    private void assertNotFoundWithoutLeak(MockHttpServletRequestBuilder request, AuthSession attacker) throws Exception {
        String body = mockMvc.perform(request.header("Authorization", bearerToken(attacker)))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("A License"), body);
        assertFalse(body.contains("A Course"), body);
        assertFalse(body.contains(world.emailA()), body);
        assertFalse(body.contains(world.a().userId()), body);
    }

    private void assertVictimDataIntact() throws Exception {
        mockMvc.perform(get("/api/credentials/{id}", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("A License"))
                .andExpect(jsonPath("$.ceRecords", hasSize(1)));
        mockMvc.perform(get("/api/ce-records/{id}", world.ceRecordA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("A Course"));
        // the CE record must still hang off A's own credential, and that credential must still own exactly it
        mockMvc.perform(get("/api/credentials/{id}/ce-records", world.credentialA()).header("Authorization", bearerToken(world.a())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(world.ceRecordA()))
                .andExpect(jsonPath("$[0].title").value("A Course"));
    }

    private void assertGenericErrorBody(String body, String path) {
        for (String forbidden : List.of("org.springframework", "Exception", "static resource", "stackTrace", "at com.", "NoResource")) {
            assertFalse(body.contains(forbidden), "internal detail '" + forbidden + "' exposed for " + path + ": " + body);
        }
    }

    private ResultActions login(String email, String password) throws Exception {
        return login(email, password, null);
    }

    private ResultActions login(String email, String password, String authorization) throws Exception {
        MockHttpServletRequestBuilder request = post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}");
        if (authorization != null) {
            request.header("Authorization", authorization);
        }
        return mockMvc.perform(request);
    }

    private ResultActions putPassword(AuthSession session, String current, String next) throws Exception {
        return mockMvc.perform(put("/api/users/me/password")
                .header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\": \"" + current + "\", \"newPassword\": \"" + next + "\"}"));
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.test";
    }

    private String credentialJson(String name) {
        return """
                {
                  "name": "%s", "type": "CERTIFICATION", "issuingOrganization": "AHA",
                  "expirationDate": "%s", "renewalCycleMonths": 24, "requiredCEHours": 8.0
                }
                """.formatted(name, LocalDate.now().plusDays(180));
    }

    private String ceJson(String credentialId, String title) {
        return """
                {
                  "title": "%s", "provider": "AHA", "hours": 2.5,
                  "dateCompleted": "2026-03-12", "credentialId": "%s"
                }
                """.formatted(title, credentialId);
    }

    private String createCredential(AuthSession session, String name) throws Exception {
        String response = mockMvc.perform(post("/api/credentials")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentialJson(name)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String createCERecord(AuthSession session, String credentialId, String title) throws Exception {
        String response = mockMvc.perform(post("/api/ce-records")
                        .header("Authorization", bearerToken(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ceJson(credentialId, title)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }
}
