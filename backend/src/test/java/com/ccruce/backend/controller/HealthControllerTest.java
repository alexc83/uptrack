package com.ccruce.backend.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Database-free unit tests for liveness and readiness (no Docker or live database needed). */
class HealthControllerTest {

    private final DataSource dataSource = mock(DataSource.class);
    private final CountDownLatch release = new CountDownLatch(1);

    private MockMvc mvc(Duration timeout) {
        return MockMvcBuilders.standaloneSetup(new HealthController(dataSource, timeout)).build();
    }

    @AfterEach
    void releaseHungProbe() {
        release.countDown();
    }

    @Test
    void livenessIsAlwaysOkAndDoesNotTouchTheDatabase() throws Exception {
        mvc(Duration.ofSeconds(1)).perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(header().string("Cache-Control", "no-store"));
        org.mockito.Mockito.verifyNoInteractions(dataSource);
    }

    @Test
    void readyWhenTheDatabaseHandsOutAValidConnection() throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.isValid(2)).thenReturn(true);
        when(dataSource.getConnection()).thenReturn(connection);

        mvc(Duration.ofSeconds(1)).perform(get("/api/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ready"))
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    void unavailableWhenTheConnectionIsNotValid() throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.isValid(2)).thenReturn(false);
        when(dataSource.getConnection()).thenReturn(connection);

        mvc(Duration.ofSeconds(1)).perform(get("/api/health/ready"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("unavailable"));
    }

    @Test
    void unavailableWithoutLeakingDetailWhenTheDatabaseIsDown() throws Exception {
        when(dataSource.getConnection()).thenThrow(new SQLException("jdbc:postgresql://secret-host:5432/db password authentication failed"));

        mvc(Duration.ofSeconds(1)).perform(get("/api/health/ready"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().json("{\"status\":\"unavailable\"}", true));
    }

    @Test
    void unavailableWithinTheTimeoutWhenTheDatabaseHangs() throws Exception {
        when(dataSource.getConnection()).thenAnswer(invocation -> {
            release.await();
            throw new SQLException("released");
        });

        MockMvc mvc = mvc(Duration.ofMillis(200));
        long started = System.nanoTime();
        mvc.perform(get("/api/health/ready")).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/health/ready")).andExpect(status().isServiceUnavailable()); // shares the same hung probe
        org.junit.jupiter.api.Assertions.assertTrue(Duration.ofNanos(System.nanoTime() - started).toSeconds() < 3);
        org.mockito.Mockito.verify(dataSource, org.mockito.Mockito.times(1)).getConnection();
    }
}
