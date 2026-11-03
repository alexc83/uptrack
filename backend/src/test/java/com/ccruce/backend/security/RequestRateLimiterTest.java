package com.ccruce.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.*;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class RequestRateLimiterTest {
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }

    @Test
    void loginAndRegistrationHaveIndependentWindowsAndRecoverWithoutAccountLockout() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 10, 5, 20);
        for (int i = 0; i < 10; i++) assertEquals(0, limiter.retryAfter("login", "ip-a"));
        assertEquals(60, limiter.retryAfter("login", "ip-a"));
        assertEquals(0, limiter.retryAfter("login", "ip-b"));
        for (int i = 0; i < 5; i++) assertEquals(0, limiter.retryAfter("register", "ip-a"));
        assertEquals(3600, limiter.retryAfter("register", "ip-a"));
        clock.now = clock.now.plusSeconds(60);
        assertEquals(0, limiter.retryAfter("login", "ip-a"));
        assertEquals(3540, limiter.retryAfter("register", "ip-a"));
        clock.now = clock.now.plusSeconds(3540);
        assertEquals(0, limiter.retryAfter("register", "ip-a"));
    }

    @Test
    void filterStopsBeforeDownstreamPasswordWorkAndIgnoresSpoofedForwardedHeaders() throws Exception {
        var limiter = new RequestRateLimiter(new MutableClock(), 1, 1, 1);
        var filter = new RequestRateLimitFilter(limiter, new ObjectMapper().findAndRegisterModules());
        var first = request("/api/auth/login", "198.51.100.1");
        var chain = new MockFilterChain();
        filter.doFilter(first, new MockHttpServletResponse(), chain);
        assertNotNull(chain.getRequest());
        var next = request("/api/auth/login", "198.51.100.1");
        next.addHeader("X-Forwarded-For", "203.0.113.20");
        next.addHeader("Forwarded", "for=203.0.113.20");
        var response = new MockHttpServletResponse();
        var blocked = new MockFilterChain();
        filter.doFilter(next, response, blocked);
        assertEquals(429, response.getStatus());
        assertEquals("60", response.getHeader("Retry-After"));
        assertNull(blocked.getRequest());
        assertTrue(response.getContentAsString().contains("Too many requests."));
    }

    @Test
    void uploadLimitFollowsUserAcrossIpsAndRecovers() throws Exception {
        var clock = new MutableClock();
        var filter = new RequestRateLimitFilter(new RequestRateLimiter(clock, 10, 5, 1),
                new ObjectMapper().findAndRegisterModules());
        try {
            var user = new AuthenticatedUser(UUID.randomUUID(), "user@example.test", "User");
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user, null, List.of()));
            filter.doFilter(request("/api/uploads/certificates", "ip-a"), new MockHttpServletResponse(), new MockFilterChain());
            var denied = new MockHttpServletResponse();
            filter.doFilter(request("/api/uploads/certificates", "ip-b"), denied, new MockFilterChain());
            assertEquals(429, denied.getStatus());
            clock.now = clock.now.plusSeconds(3600);
            var recovered = new MockFilterChain();
            filter.doFilter(request("/api/uploads/certificates", "ip-b"), new MockHttpServletResponse(), recovered);
            assertNotNull(recovered.getRequest());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void stateIsBoundedAndCannotEvictAnActiveVictimLimit() {
        var limiter = new RequestRateLimiter(new MutableClock(), 1, 1, 1);
        assertEquals(0, limiter.retryAfter("login", "victim"));
        for (int i = 0; i < 9999; i++) assertEquals(0, limiter.retryAfter("login", "ip-" + i));
        assertTrue(limiter.retryAfter("login", "overflow") > 0);
        assertTrue(limiter.retryAfter("login", "victim") > 0);
    }

    private MockHttpServletRequest request(String path, String ip) {
        var request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(ip);
        return request;
    }
}
