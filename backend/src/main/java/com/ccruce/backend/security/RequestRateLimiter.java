package com.ccruce.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

/**
 * Bounded, process-local fixed-window limiter. Never locks an account and never trusts
 * forwarded headers (client identity is resolved by {@link ClientIpResolver}).
 *
 * <p>Each scope (login, register, upload) owns an independent map with its own window
 * duration and capacity, so a flood in one scope can never exhaust or block another.
 * Entries expire by their own scope window and are reclaimed promptly: once per second
 * per scope, and always before any capacity decision. When a scope is full of still
 * active windows, a new identity is rejected only until the soonest window expires
 * (at most one window duration, 60 s for login) instead of being locked out
 * indefinitely; rate limiting is never disabled under attack. Memory is bounded by
 * the per-scope capacity. Deploy a shared gateway limiter before using multiple
 * replicas.
 */
@Component
public class RequestRateLimiter {
    private record Window(long startedAt, int count) {}

    private enum Scope {
        LOGIN("login", 60),
        REGISTER("register", 3600),
        UPLOAD("upload", 3600),
        CERTIFICATE_URL("certificate-url", 3600);

        final String label;
        final long durationSeconds;

        Scope(String label, long durationSeconds) {
            this.label = label;
            this.durationSeconds = durationSeconds;
        }

        static Scope fromLabel(String label) {
            for (Scope scope : values()) {
                if (scope.label.equals(label)) return scope;
            }
            throw new IllegalArgumentException("Unknown rate limit scope.");
        }
    }

    /** Per-scope key capacity; total memory is bounded by the sum of the scopes. */
    static final int MAX_KEYS_PER_SCOPE = 10_000;

    private final EnumMap<Scope, Map<String, Window>> windows = new EnumMap<>(Scope.class);
    private final EnumMap<Scope, Long> lastSweep = new EnumMap<>(Scope.class);
    private final EnumMap<Scope, Integer> limits = new EnumMap<>(Scope.class);
    private final Clock clock;

    @Autowired
    public RequestRateLimiter(
            @Value("${app.rate-limit.login-per-minute:10}") int loginLimit,
            @Value("${app.rate-limit.registration-per-hour:5}") int registrationLimit,
            @Value("${app.rate-limit.upload-per-hour:20}") int uploadLimit,
            @Value("${app.rate-limit.certificate-url-per-hour:120}") int certificateUrlLimit) {
        this(Clock.systemUTC(), loginLimit, registrationLimit, uploadLimit, certificateUrlLimit);
    }

    RequestRateLimiter(Clock clock, int loginLimit, int registrationLimit, int uploadLimit) {
        this(clock, loginLimit, registrationLimit, uploadLimit, 120);
    }

    RequestRateLimiter(Clock clock, int loginLimit, int registrationLimit, int uploadLimit, int certificateUrlLimit) {
        if (loginLimit < 1 || registrationLimit < 1 || uploadLimit < 1 || certificateUrlLimit < 1) {
            throw new IllegalStateException("Rate limits must be positive.");
        }
        this.clock = clock;
        for (Scope scope : Scope.values()) windows.put(scope, new HashMap<>());
        for (Scope scope : Scope.values()) lastSweep.put(scope, Long.MIN_VALUE);
        limits.put(Scope.LOGIN, loginLimit);
        limits.put(Scope.REGISTER, registrationLimit);
        limits.put(Scope.UPLOAD, uploadLimit);
        limits.put(Scope.CERTIFICATE_URL, certificateUrlLimit);
    }

    /** Zero permits the request; otherwise returns seconds until retry. */
    public synchronized long retryAfter(String scopeLabel, String identity) {
        Scope scope = Scope.fromLabel(scopeLabel);
        long now = clock.instant().getEpochSecond();
        long duration = scope.durationSeconds;
        int limit = limits.get(scope);
        Map<String, Window> map = windows.get(scope);

        // Prompt reclaim: sweep expired entries at most once per second per scope ...
        if (now > lastSweep.get(scope)) {
            purgeExpired(map, now, duration);
            lastSweep.put(scope, now);
        }

        Window window = map.get(identity);
        if (window == null) {
            if (map.size() >= MAX_KEYS_PER_SCOPE) {
                // ... and always before a capacity decision: expired entries are reclaimed
                // first, so a new client is never rejected because of long-dead windows.
                purgeExpired(map, now, duration);
                if (map.size() >= MAX_KEYS_PER_SCOPE) {
                    // Every remaining window is still active. Reject only until the soonest
                    // one expires (bounded by the scope's own window, never indefinitely)
                    // rather than evicting active limits or disabling the limiter.
                    long soonestStart = Long.MAX_VALUE;
                    for (Window w : map.values()) soonestStart = Math.min(soonestStart, w.startedAt());
                    return Math.max(1, soonestStart + duration - now);
                }
            }
            map.put(identity, new Window(now, 1));
            return 0;
        }
        if (now - window.startedAt() >= duration) {
            map.put(identity, new Window(now, 1));
            return 0;
        }
        if (window.count() >= limit) {
            return Math.max(1, duration - (now - window.startedAt()));
        }
        map.put(identity, new Window(window.startedAt(), window.count() + 1));
        return 0;
    }

    private void purgeExpired(Map<String, Window> map, long now, long duration) {
        map.entrySet().removeIf(e -> now - e.getValue().startedAt() >= duration);
    }
}
