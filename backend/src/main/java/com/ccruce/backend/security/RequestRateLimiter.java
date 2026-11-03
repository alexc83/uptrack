package com.ccruce.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

/**
 * Bounded, process-local fixed windows. Never locks an account and never trusts
 * forwarded headers. Deploy a shared gateway limiter before using multiple replicas.
 */
@Component
public class RequestRateLimiter {
    private record Window(long startedAt, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    private final int loginLimit;
    private final int registrationLimit;
    private final int uploadLimit;
    private long lastCleanup;
    private static final int MAX_KEYS = 10_000;
    private static final long HOUR = 3600;

    @Autowired
    public RequestRateLimiter(
            @Value("${app.rate-limit.login-per-minute:10}") int loginLimit,
            @Value("${app.rate-limit.registration-per-hour:5}") int registrationLimit,
            @Value("${app.rate-limit.upload-per-hour:20}") int uploadLimit) {
        this(Clock.systemUTC(), loginLimit, registrationLimit, uploadLimit);
    }

    RequestRateLimiter(Clock clock, int loginLimit, int registrationLimit, int uploadLimit) {
        if (loginLimit < 1 || registrationLimit < 1 || uploadLimit < 1) {
            throw new IllegalStateException("Rate limits must be positive.");
        }
        this.clock = clock;
        this.loginLimit = loginLimit;
        this.registrationLimit = registrationLimit;
        this.uploadLimit = uploadLimit;
    }

    /** Zero permits the request; otherwise returns seconds until retry. */
    public synchronized long retryAfter(String scope, String identity) {
        long now = clock.instant().getEpochSecond();
        if (now - lastCleanup >= 60) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt() >= HOUR);
            lastCleanup = now;
        }
        long duration = scope.equals("login") ? 60 : HOUR;
        int limit = switch (scope) {
            case "login" -> loginLimit;
            case "register" -> registrationLimit;
            case "upload" -> uploadLimit;
            default -> throw new IllegalArgumentException("Unknown rate limit scope.");
        };
        String key = scope + ":" + identity;
        Window window = windows.get(key);
        if (window == null && windows.size() >= MAX_KEYS) {
            // Fail closed rather than evicting active limits or growing without bound.
            return 60;
        }
        if (window == null || now - window.startedAt() >= duration) {
            windows.put(key, new Window(now, 1));
            return 0;
        }
        if (window.count() >= limit) {
            return Math.max(1, duration - (now - window.startedAt()));
        }
        windows.put(key, new Window(window.startedAt(), window.count() + 1));
        return 0;
    }
}
