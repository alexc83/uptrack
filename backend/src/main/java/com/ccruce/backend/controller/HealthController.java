package com.ccruce.backend.controller;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Public, unauthenticated, constant-shaped health endpoints. Neither response exposes infrastructure detail.
 *
 * <ul>
 *   <li>{@code GET /api/health} — liveness: the process is serving HTTP. Unchanged; it does not touch the database.</li>
 *   <li>{@code GET /api/health/ready} — readiness: the database can hand out a valid connection right now.
 *       200 {@code ready} or 503 {@code unavailable}. Used by the frontend recovery check and suitable as the
 *       Render health-check path so traffic only switches to an instance that can serve authentication.</li>
 * </ul>
 * Tomcat only starts listening after the application context (including JPA/Hibernate initialisation) has
 * started, so during startup both endpoints are simply unreachable rather than reporting a false "ready".
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);
    private static final Duration DEFAULT_READINESS_TIMEOUT = Duration.ofSeconds(3);
    private static final int VALIDATION_TIMEOUT_SECONDS = 2;

    private final DataSource dataSource;
    private final Duration readinessTimeout;
    // One daemon thread: concurrent callers share a single in-flight probe, so a hung database can never
    // pile up threads or connection attempts behind this public endpoint.
    private final ExecutorService probeExecutor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "readiness-probe");
        thread.setDaemon(true);
        return thread;
    });
    private CompletableFuture<Boolean> inFlight;

    @Autowired
    public HealthController(DataSource dataSource) {
        this(dataSource, DEFAULT_READINESS_TIMEOUT);
    }

    HealthController(DataSource dataSource, Duration readinessTimeout) {
        this.dataSource = dataSource;
        this.readinessTimeout = readinessTimeout;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("status", "ok"));
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> ready() {
        boolean ready;
        try {
            ready = Boolean.TRUE.equals(probe().get(readinessTimeout.toMillis(), TimeUnit.MILLISECONDS));
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            ready = false;
        }
        if (ready) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("status", "ready"));
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(Map.of("status", "unavailable"));
    }

    private synchronized CompletableFuture<Boolean> probe() {
        if (inFlight == null || inFlight.isDone()) {
            inFlight = CompletableFuture.supplyAsync(this::databaseIsValid, probeExecutor);
        }
        return inFlight;
    }

    private boolean databaseIsValid() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(VALIDATION_TIMEOUT_SECONDS);
        } catch (Exception e) {
            // Deliberately no message or stack trace: the response and logs must not leak connection details.
            log.debug("Readiness probe failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    @PreDestroy
    void shutdown() {
        probeExecutor.shutdownNow();
    }
}
