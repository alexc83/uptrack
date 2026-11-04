package com.ccruce.backend.security;

import java.time.Clock;

/**
 * Test-only access to {@link RequestRateLimiter}'s package-private clock constructor, so integration
 * tests in other packages can run the real limiter on a deterministic clock instead of wall time.
 */
public final class RequestRateLimiterTestSupport {

    private RequestRateLimiterTestSupport() {
    }

    public static RequestRateLimiter withClock(Clock clock, int loginLimit, int registrationLimit, int uploadLimit) {
        return new RequestRateLimiter(clock, loginLimit, registrationLimit, uploadLimit);
    }
}
