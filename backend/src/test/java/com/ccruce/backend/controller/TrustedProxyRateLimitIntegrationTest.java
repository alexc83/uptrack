package com.ccruce.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Real security-chain behaviour with a trusted proxy configured: forwarded identities are
 * used only when the direct peer is in the allowlist. Separate profile/properties from the
 * shared fixtures so production-like small limits are exercised.
 */
@SpringBootTest(properties = {
        "app.rate-limit.login-per-minute=2",
        "app.rate-limit.registration-per-hour=100",
        "app.rate-limit.upload-per-hour=100",
        "app.trusted-proxies=10.9.9.9,192.168.0.0/16"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TrustedProxyRateLimitIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static final Map<String, String> LOGIN = Map.of(
            "email", "missing@example.test", "password", "wrong-password");

    private static RequestPostProcessor peer(String remoteAddr) {
        return request -> {
            request.setRemoteAddr(remoteAddr);
            return request;
        };
    }

    @Test
    void untrustedDirectClientSharesNoBucketAndCannotSpoofForwardedIdentity() throws Exception {
        // All requests arrive from the same untrusted peer; forged XFF values must not
        // create fresh buckets, so the peer's own bucket fills and the 3rd is limited.
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/auth/login").with(peer("203.0.113.5"))
                            .header("X-Forwarded-For", "198.51.100." + i)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsBytes(LOGIN)))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(peer("203.0.113.5"))
                        .header("X-Forwarded-For", "198.51.100.99")
                        .header("Forwarded", "for=198.51.100.98")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(LOGIN)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void trustedProxyPeersGetPerForwardedClientBuckets() throws Exception {
        for (String client : new String[]{"198.51.100.10", "198.51.100.11"}) {
            for (int i = 0; i < 2; i++) {
                mockMvc.perform(post("/api/auth/login").with(peer("10.9.9.9"))
                                .header("X-Forwarded-For", client)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsBytes(LOGIN)))
                        .andExpect(status().isUnauthorized());
            }
            // Each forwarded client exhausted its own 2/minute bucket independently.
            mockMvc.perform(post("/api/auth/login").with(peer("10.9.9.9"))
                            .header("X-Forwarded-For", client)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsBytes(LOGIN)))
                    .andExpect(status().isTooManyRequests());
        }
        // A different proxy in the CIDR allowlist works too, with a fresh client.
        mockMvc.perform(post("/api/auth/login").with(peer("192.168.3.4"))
                        .header("X-Forwarded-For", "198.51.100.12")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(LOGIN)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void trustedProxyWithMalformedOrAllTrustedChainFallsBackToPeerBucket() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/auth/login").with(peer("10.9.9.9"))
                            .header("X-Forwarded-For", i == 0 ? "bogus-entry" : "192.168.1.1, 10.9.9.9")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsBytes(LOGIN)))
                    .andExpect(status().isUnauthorized());
        }
        // Both malformed and all-trusted chains fall back to the peer identity 10.9.9.9,
        // whose bucket now holds 2 requests: another fallback request is limited ...
        mockMvc.perform(post("/api/auth/login").with(peer("10.9.9.9"))
                        .header("X-Forwarded-For", "bogus-again")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(LOGIN)))
                .andExpect(status().isTooManyRequests());
        // ... while a well-formed forwarded client still gets its own fresh bucket.
        mockMvc.perform(post("/api/auth/login").with(peer("10.9.9.9"))
                        .header("X-Forwarded-For", "198.51.100.13")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(LOGIN)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oversizedJsonBodyIsRejected413BeforePasswordWork() throws Exception {
        byte[] big = new byte[1024 * 1024 + 1];
        java.util.Arrays.fill(big, (byte) ' ');
        String body = "{\"email\":\"" + new String(big, java.nio.charset.StandardCharsets.US_ASCII) + "\"}";
        mockMvc.perform(post("/api/auth/login").with(peer("203.0.113.6"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message").value("The request body is too large."));
        // The rejected oversized request must not have consumed the peer's login bucket.
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/auth/login").with(peer("203.0.113.6"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsBytes(LOGIN)))
                    .andExpect(status().isUnauthorized());
        }
    }
}
