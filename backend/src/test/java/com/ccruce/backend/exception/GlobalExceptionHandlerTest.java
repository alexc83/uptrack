package com.ccruce.backend.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-advice behaviour only: a stub controller throws each exception and the real
 * {@link GlobalExceptionHandler} maps it. Spring Security filter-chain responses (401/403 produced before a
 * controller is reached) are a separate mechanism and are covered by the integration tests.
 */
class GlobalExceptionHandlerTest {

    private static final String SECRET = "jdbc:postgresql://db.internal:5432/uptrack password=hunter2";
    private static final String SQL = "could not execute statement [ERROR: duplicate key value violates unique constraint "
            + "\"uk_users_email\" Detail: Key (email)=(a@b.test) already exists.] [insert into users (email) values (?)]";
    private static final List<String> FORBIDDEN = List.of("hunter2", "jdbc:", "db.internal", "uk_users_email", "insert into",
            "violates", "Exception", "org.springframework", "com.ccruce", "at com.", "stackTrace", "trace");

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/t/forbidden") String forbidden() { throw new AccessDeniedException("secret rule " + SECRET); }
        @GetMapping("/t/integrity") String integrity() { throw new DataIntegrityViolationException(SQL); }
        @GetMapping("/t/optimistic") String optimistic() { throw new OptimisticLockingFailureException(SQL); }
        @GetMapping("/t/busy") String busy() { throw new UploadBusyException(); }
        @GetMapping("/t/body") String body() { throw new RequestBodyTooLargeException(); }
        @GetMapping("/t/upload-too-large") String uploadTooLarge() { throw new UploadTooLargeException(); }
        @GetMapping("/t/upload-failed") String uploadFailed() { throw new UploadFailedException("Certificate upload failed."); }
        @GetMapping("/t/boom") String boom() { throw new IllegalStateException("boom " + SECRET + " " + SQL); }
        @GetMapping("/t/nested") String nested() { throw new RuntimeException("outer", new java.io.IOException(SECRET)); }
    }

    private static void assertNoInternalDetail(String body) {
        for (String forbidden : FORBIDDEN) {
            assertFalse(body.contains(forbidden), "internal detail '" + forbidden + "' exposed: " + body);
        }
    }

    private String bodyOf(String path) throws Exception {
        return mockMvc.perform(get(path)).andReturn().getResponse().getContentAsString();
    }

    @Test
    void accessDeniedExceptionBecomes403WithGenericMessage() throws Exception {
        mockMvc.perform(get("/t/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("You do not have permission to perform this action."));
        assertNoInternalDetail(bodyOf("/t/forbidden"));
    }

    @Test
    void dataIntegrityViolationBecomes409WithoutDatabaseDetail() throws Exception {
        mockMvc.perform(get("/t/integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("The request conflicts with stored data."));
        assertNoInternalDetail(bodyOf("/t/integrity"));
    }

    @Test
    void optimisticLockingFailureBecomes409WithoutDatabaseDetail() throws Exception {
        mockMvc.perform(get("/t/optimistic"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("The request conflicts with stored data."));
        assertNoInternalDetail(bodyOf("/t/optimistic"));
    }

    @Test
    void uploadBusyBecomes503WithRetryAfterFiveSeconds() throws Exception {
        mockMvc.perform(get("/t/busy"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "5"))
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value("The upload service is busy. Please try again shortly."));
    }

    @Test
    void requestBodyTooLargeBecomes413() throws Exception {
        mockMvc.perform(get("/t/body"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value("The request body is too large."));
    }

    @Test
    void uploadTooLargeBecomes413WithFixedMessage() throws Exception {
        mockMvc.perform(get("/t/upload-too-large"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value("Certificate files must be 5 MiB or smaller."));
    }

    @Test
    void uploadFailureBecomes502() throws Exception {
        mockMvc.perform(get("/t/upload-failed"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("Certificate upload failed."));
    }

    @Test
    void unhandledExceptionBecomes500WithGenericMessageAndNoLeak() throws Exception {
        mockMvc.perform(get("/t/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
        assertNoInternalDetail(bodyOf("/t/boom"));
        assertNoInternalDetail(bodyOf("/t/nested"));
    }
}
