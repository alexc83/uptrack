package com.ccruce.backend.security;

import com.ccruce.backend.config.AuthProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Scope of the invalid-token handling (milestone S01): only token-specific failures turn into "unauthenticated".
 * Configuration errors and unrelated programming errors must still surface as errors.
 */
class JwtAuthenticationFilterTest {

    private static final String SECRET = "unit-test-secret-that-is-long-enough-for-hs256-signing";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void invalidTokenLeavesRequestUnauthenticatedAndStillContinuesTheChain() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new JwtService(new AuthProperties(SECRET, 3600)));
        MockHttpServletRequest request = requestWithBearer("not.a.valid.jwt");
        AtomicInteger chainCalls = new AtomicInteger();

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            chainCalls.incrementAndGet();
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        });

        assertEquals(1, chainCalls.get());
    }

    @Test
    void validTokenAuthenticatesTheRequest() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new JwtService(new AuthProperties(SECRET, 3600)));
        UUID userId = UUID.randomUUID();
        MockHttpServletRequest request = requestWithBearer(token(SECRET, userId.toString(), Instant.now().plusSeconds(600)));

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            assertEquals(userId, ((AuthenticatedUser) authentication.getPrincipal()).id());
        });
    }

    @Test
    void misconfiguredSigningKeyIsNotReportedAsAnInvalidToken() {
        // A secret shorter than 256 bits is a server configuration error, not a client token problem.
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new JwtService(new AuthProperties("too-short", 3600)));

        assertThrows(WeakKeyException.class,
                () -> filter.doFilter(requestWithBearer("a.b.c"), new MockHttpServletResponse(), new MockFilterChain()));
    }

    @Test
    void exceptionsThrownByTheRestOfTheChainAreNotSwallowed() {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new JwtService(new AuthProperties(SECRET, 3600)));
        MockHttpServletRequest request = requestWithBearer(token(SECRET, UUID.randomUUID().toString(), Instant.now().plusSeconds(600)));
        IllegalArgumentException downstreamBug = new IllegalArgumentException("bug in a controller");

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class,
                () -> filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
                    throw downstreamBug;
                }));

        assertSame(downstreamBug, thrown);
    }

    private MockHttpServletRequest requestWithBearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    private String token(String secret, String uid, Instant expiresAt) {
        return Jwts.builder()
                .subject("filter-test@example.test")
                .claim("uid", uid)
                .claim("name", "Filter Test")
                .issuedAt(new Date())
                .expiration(Date.from(expiresAt))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
