package com.ccruce.backend.controller;

import com.ccruce.backend.config.AuthProperties;
import com.ccruce.backend.repository.UserRepository;
import com.ccruce.backend.security.JwtService;
import com.cloudinary.Cloudinary;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityRemediationIntegrationTest extends AbstractControllerIntegrationTest {
    @Autowired AuthProperties properties;
    @Autowired UserRepository users;
    @Autowired JwtService tokens;
    @MockBean Cloudinary cloudinary;

    @Test
    void passwordChangeInvalidatesEveryOldSessionAndPreservesNewLogin() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        AuthSession session = registerUser("Security Test", email);
        String second = login(email, "secret123");
        mockMvc.perform(get("/api/auth/me").header("Authorization", bearerToken(session))).andExpect(status().isOk());
        mockMvc.perform(put("/api/users/me/password").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"secret123\",\"newPassword\":\"changedSecret456\"}"))
                .andExpect(status().isNoContent());
        for (String token : List.of(session.token(), second)) {
            mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/credentials").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
        String fresh = login(email, "changedSecret456");
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + fresh)).andExpect(status().isOk());
        mockMvc.perform(get("/api/credentials").header("Authorization", "Bearer " + fresh)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "excessive", "missing-exp", "missing-iat", "future-iat", "legacy", "tampered"})
    void rejectsInvalidLifetimesLegacyAndTamperedTokens(String kind) throws Exception {
        AuthSession session = registerUser("Token Test", UUID.randomUUID() + "@example.test");
        var key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(session.token()).getPayload();
        var builder = Jwts.builder().claims(new HashMap<>(claims));
        Instant now = Instant.now();
        switch (kind) {
            case "expired" -> builder.issuedAt(Date.from(now.minusSeconds(100))).expiration(Date.from(now.minusSeconds(1)));
            case "excessive" -> builder.issuedAt(Date.from(now.minusSeconds(1))).expiration(Date.from(now.plusSeconds(3601)));
            case "missing-exp" -> builder.expiration(null);
            case "missing-iat" -> builder.issuedAt(null);
            case "future-iat" -> builder.issuedAt(Date.from(now.plusSeconds(60))).expiration(Date.from(now.plusSeconds(100)));
            case "legacy" -> builder.claim("cv", null);
            case "tampered" -> builder.claim("name", "Modified without original key");
        }
        String token = builder.signWith(kind.equals("tampered") ?
                Keys.hmacShaKeyFor("different-test-signing-secret-at-least-32-bytes".getBytes(StandardCharsets.UTF_8)) : key).compact();
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "{\"email\":\"a@example.test\",\"password\":123"})
    void malformedJsonIs400(String json) throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void invalidIdentifiersFiltersContentTypesAndFieldBoundsAreClientErrors() throws Exception {
        AuthSession session = registerUser("Input Test", UUID.randomUUID() + "@example.test");
        mockMvc.perform(get("/api/credentials/not-a-uuid").header("Authorization", bearerToken(session)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/credentials?type=invalid").header("Authorization", bearerToken(session)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.TEXT_PLAIN).content("not-json"))
                .andExpect(status().isUnsupportedMediaType());
        Map<String,Object> valid = new HashMap<>(Map.of("name", "Test", "type", "LICENSE", "issuingOrganization", "Org",
                "expirationDate", "2027-01-01", "renewalCycleMonths", 12, "requiredCEHours", 4));
        for (var bad : List.of(Map.entry("name", (Object) "x".repeat(181)),
                Map.entry("issuingOrganization", (Object) "x".repeat(181)),
                Map.entry("requiredCEHours", (Object) 99999), Map.entry("renewalCycleMonths", (Object) Integer.MAX_VALUE),
                Map.entry("expirationDate", (Object) "not-a-date"))) {
            var payload = new HashMap<>(valid);
            payload.put(bad.getKey(), bad.getValue());
            mockMvc.perform(post("/api/credentials").header("Authorization", bearerToken(session))
                    .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(payload)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void bcryptLimitIsBytesOnRegistrationLoginAndPasswordChange() throws Exception {
        for (String password : List.of("a".repeat(73), "é".repeat(37))) {
            String payload = objectMapper.writeValueAsString(Map.of("name", "Byte Test",
                    "email", UUID.randomUUID() + "@example.test", "password", password));
            mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("72 UTF-8 bytes")));
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest());
        }
        AuthSession session = registerUser("Change Test", UUID.randomUUID() + "@example.test");
        mockMvc.perform(put("/api/users/me/password").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(Map.of(
                        "currentPassword", "secret123", "newPassword", "é".repeat(37)))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/auth/me").header("Authorization", bearerToken(session))).andExpect(status().isOk());
    }

    @Test
    void invalidUploadsNeverReachCloudinaryAndOversizeIs413() throws Exception {
        AuthSession session = registerUser("Upload Test", UUID.randomUUID() + "@example.test");
        for (var file : List.of(new MockMultipartFile("file", "file.html", "image/png", "<html/>".getBytes()),
                new MockMultipartFile("file", "file.pdf", "application/pdf", "not-pdf".getBytes()))) {
            mockMvc.perform(multipart("/api/uploads/certificates").file(file).header("Authorization", bearerToken(session)))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(multipart("/api/uploads/certificates").file(new MockMultipartFile("file", "file.pdf", "application/pdf",
                        new byte[5 * 1024 * 1024 + 1])).header("Authorization", bearerToken(session)))
                .andExpect(status().isPayloadTooLarge());
        verifyNoInteractions(cloudinary);
    }

    @Test
    void corsDoesNotEnableCookieCredentials() throws Exception {
        mockMvc.perform(options("/api/auth/login").header("Origin", "http://localhost:4200")
                .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk()).andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"../other", "nested/file", "file%2fother", ".hidden", "file..pdf", "file?query"})
    void rejectsNoncanonicalCertificatePublicIds(String suffix) throws Exception {
        AuthSession session = registerUser("Metadata Test", UUID.randomUUID() + "@example.test");
        String credential = createCredential(session);
        var payload = Map.of("title", "Course", "provider", "Provider", "hours", 1,
                "dateCompleted", "2026-01-01", "credentialId", credential,
                "certificateUrl", "https://example.test/certificate.pdf", "certificateResourceType", "raw",
                "certificatePublicId", "uptrack/users/" + session.userId() + "/certificates/" + suffix);
        mockMvc.perform(post("/api/ce-records").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(payload)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cloudinary);
    }

    @ParameterizedTest
    @ValueSource(strings = {"javascript:alert(1)", "data:text/html,test", "https://user:pass@example.test/cert", "//example.test/cert"})
    void rejectsUnsafeCertificateLinksButKeepsHistoricalHttpLinks(String url) throws Exception {
        AuthSession session = registerUser("Link Test", UUID.randomUUID() + "@example.test");
        var payload = new HashMap<String,Object>(Map.of("title", "Course", "provider", "Provider", "hours", 1,
                "dateCompleted", "2026-01-01", "credentialId", createCredential(session), "certificateUrl", url));
        mockMvc.perform(post("/api/ce-records").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(payload)))
                .andExpect(status().isBadRequest());
        payload.put("certificateUrl", "https://example.test/historical-certificate.pdf");
        mockMvc.perform(post("/api/ce-records").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(payload)))
                .andExpect(status().isCreated());
    }

    private String createCredential(AuthSession session) throws Exception {
        var response = mockMvc.perform(post("/api/credentials").header("Authorization", bearerToken(session))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(Map.of(
                        "name", "Credential", "type", "LICENSE", "issuingOrganization", "Org", "expirationDate", "2027-01-01",
                        "renewalCycleMonths", 12, "requiredCEHours", 4))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private String login(String email, String password) throws Exception {
        var response = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }
}
