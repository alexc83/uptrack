package com.ccruce.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.*;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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
    void scopesAreIndependentSoALoginFloodCannotExhaustRegistrationOrUpload() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 10, 5, 20);
        // Fill the entire login capacity with distinct identities.
        for (int i = 0; i < RequestRateLimiter.MAX_KEYS_PER_SCOPE; i++) {
            assertEquals(0, limiter.retryAfter("login", "attacker-" + i));
        }
        // Registration and upload buckets are untouched by the login flood.
        for (int i = 0; i < 5; i++) assertEquals(0, limiter.retryAfter("register", "victim-ip"));
        assertEquals(3600, limiter.retryAfter("register", "victim-ip"));
        for (int i = 0; i < 20; i++) assertEquals(0, limiter.retryAfter("upload", "user-1"));
        assertTrue(limiter.retryAfter("upload", "user-1") > 0);
        assertEquals(0, limiter.retryAfter("register", "another-victim"));
    }

    @Test
    void expiredEntriesAreReclaimedPromptlySoNewClientsAreNotLockedOutForAnHour() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 10, 5, 20);
        for (int i = 0; i < RequestRateLimiter.MAX_KEYS_PER_SCOPE; i++) {
            assertEquals(0, limiter.retryAfter("login", "attacker-" + i));
        }
        // Login windows last 60 s: capacity is still exhausted while they are active ...
        long retry = limiter.retryAfter("login", "new-legit-client");
        assertTrue(retry > 0 && retry <= 60, "bounded rejection, got " + retry);
        // ... but once the window expires the entries are reclaimed and the new client is admitted.
        clock.now = clock.now.plusSeconds(61);
        assertEquals(0, limiter.retryAfter("login", "new-legit-client"));
        // Registration entries (1 h window) are still retained at +61 s and still enforced:
        // fill reg-0 to its own limit at t0.
        for (int i = 0; i < 5; i++) assertEquals(0, limiter.retryAfter("register", "reg-0"));
        clock.now = clock.now.plusSeconds(61);
        assertEquals(3600 - 61, limiter.retryAfter("register", "reg-0"),
                "1 h register window must not be cut to 60 s");
        clock.now = clock.now.plusSeconds(3600 - 61);
        assertEquals(0, limiter.retryAfter("register", "reg-0"));
        assertEquals(0, limiter.retryAfter("register", "fresh-registrant"));
    }

    @Test
    void capacityRejectionIsBoundedByTheSoonestActiveWindowAndRecoversAfterAnAttack() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 1, 1, 1);
        assertEquals(0, limiter.retryAfter("login", "victim"));
        for (int i = 0; i < RequestRateLimiter.MAX_KEYS_PER_SCOPE - 1; i++) {
            assertEquals(0, limiter.retryAfter("login", "ip-" + i));
        }
        // Map is full of active windows: a new key is rejected, but only until the soonest expiry.
        long retry = limiter.retryAfter("login", "overflow");
        assertEquals(60, retry);
        // The active victim limit is never evicted: it is still enforced.
        assertEquals(60, limiter.retryAfter("login", "victim"));
        // After the attack windows expire, legitimate clients recover.
        clock.now = clock.now.plusSeconds(60);
        assertEquals(0, limiter.retryAfter("login", "overflow"));
        assertEquals(0, limiter.retryAfter("login", "victim"));
    }

    @Test
    void fixedWindowBoundaryAllowsANewWindowButNotUnlimitedBurst() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 10, 5, 20);
        for (int i = 0; i < 10; i++) assertEquals(0, limiter.retryAfter("login", "ip-a"));
        assertEquals(60, limiter.retryAfter("login", "ip-a"));
        // The window is fixed: at +59 s the same window is still exhausted ...
        clock.now = clock.now.plusSeconds(59);
        assertEquals(1, limiter.retryAfter("login", "ip-a"));
        // ... and only at +60 s does a fresh window start, allowing exactly 10 more.
        clock.now = clock.now.plusSeconds(1);
        for (int i = 0; i < 10; i++) assertEquals(0, limiter.retryAfter("login", "ip-a"));
        assertEquals(60, limiter.retryAfter("login", "ip-a"));
    }

    @Test
    void differentWindowDurationsExpireIndependently() {
        var clock = new MutableClock();
        var limiter = new RequestRateLimiter(clock, 10, 5, 20);
        for (int i = 0; i < 10; i++) assertEquals(0, limiter.retryAfter("login", "k"));
        for (int i = 0; i < 5; i++) assertEquals(0, limiter.retryAfter("register", "k"));
        for (int i = 0; i < 20; i++) assertEquals(0, limiter.retryAfter("upload", "k"));
        clock.now = clock.now.plusSeconds(60);
        assertEquals(0, limiter.retryAfter("login", "k"), "login window expired after 60 s");
        assertEquals(3540, limiter.retryAfter("register", "k"), "register still limited at +60 s");
        assertEquals(3540, limiter.retryAfter("upload", "k"), "upload still limited at +60 s");
        clock.now = clock.now.plusSeconds(3540);
        assertEquals(0, limiter.retryAfter("register", "k"));
        assertEquals(0, limiter.retryAfter("upload", "k"));
    }

    @Test
    void concurrentRequestsOnOneKeyAllowExactlyTheLimit() throws Exception {
        var limiter = new RequestRateLimiter(new MutableClock(), 10, 5, 20);
        int threads = 500;
        var pool = Executors.newFixedThreadPool(32);
        var start = new CountDownLatch(1);
        var allowed = new AtomicInteger();
        var denied = new AtomicInteger();
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    if (limiter.retryAfter("login", "same-ip") == 0) allowed.incrementAndGet();
                    else denied.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));
        assertEquals(10, allowed.get());
        assertEquals(threads - 10, denied.get());
    }

    @Test
    void concurrentDistinctKeysAreAllCountedUnderCapacity() throws Exception {
        var limiter = new RequestRateLimiter(new MutableClock(), 10, 5, 20);
        int threads = 200;
        var pool = Executors.newFixedThreadPool(32);
        var start = new CountDownLatch(1);
        var allowed = new AtomicInteger();
        for (int i = 0; i < threads; i++) {
            String key = "ip-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    if (limiter.retryAfter("login", key) == 0) allowed.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));
        assertEquals(threads, allowed.get());
    }

    @Test
    void filterStopsBeforeDownstreamPasswordWorkAndIgnoresSpoofedForwardedHeaders() throws Exception {
        var limiter = new RequestRateLimiter(new MutableClock(), 1, 1, 1);
        var filter = new RequestRateLimitFilter(limiter, new ClientIpResolver(), new ObjectMapper().findAndRegisterModules());
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
    void filterUsesForwardedIdentityOnlyFromATrustedProxy() throws Exception {
        var clock = new MutableClock();
        var resolver = new ClientIpResolver("10.0.0.0/8");
        var filter = new RequestRateLimitFilter(new RequestRateLimiter(clock, 1, 1, 1), resolver,
                new ObjectMapper().findAndRegisterModules());
        // Untrusted direct client cannot escape its bucket with forged headers.
        for (int i = 0; i < 2; i++) {
            var spoofed = request("/api/auth/login", "203.0.113.9");
            spoofed.addHeader("X-Forwarded-For", "198.51.100." + i);
            var response = new MockHttpServletResponse();
            filter.doFilter(spoofed, response, new MockFilterChain());
            assertEquals(i == 0 ? 200 : 429, response.getStatus());
        }
        // Trusted proxy: distinct forwarded clients get distinct buckets.
        var viaProxyA = request("/api/auth/login", "10.1.2.3");
        viaProxyA.addHeader("X-Forwarded-For", "198.51.100.50");
        var okA = new MockHttpServletResponse();
        filter.doFilter(viaProxyA, okA, new MockFilterChain());
        assertEquals(200, okA.getStatus());
        var viaProxyA2 = request("/api/auth/login", "10.1.2.3");
        viaProxyA2.addHeader("X-Forwarded-For", "198.51.100.50");
        var limited = new MockHttpServletResponse();
        filter.doFilter(viaProxyA2, limited, new MockFilterChain());
        assertEquals(429, limited.getStatus());
        var viaProxyB = request("/api/auth/login", "10.1.2.3");
        viaProxyB.addHeader("X-Forwarded-For", "198.51.100.51");
        var ok = new MockHttpServletResponse();
        filter.doFilter(viaProxyB, ok, new MockFilterChain());
        assertEquals(200, ok.getStatus());
    }

    @Test
    void uploadLimitFollowsUserAcrossIpsAndRecovers() throws Exception {
        var clock = new MutableClock();
        var filter = new RequestRateLimitFilter(new RequestRateLimiter(clock, 10, 5, 1), new ClientIpResolver(),
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

    private MockHttpServletRequest request(String path, String ip) {
        var request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(ip);
        return request;
    }
}
