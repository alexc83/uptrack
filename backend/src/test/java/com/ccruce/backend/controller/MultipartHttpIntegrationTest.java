package com.ccruce.backend.controller;

import com.ccruce.backend.TestDatabaseAssertions;
import com.ccruce.backend.dto.response.AuthResponseDto;
import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        // H2 by default; the ci-postgres test profile overrides it with its PostgreSQL URL.
        "spring.datasource.url=${uptrack.test.multipart-datasource-url:jdbc:h2:mem:multipart-http;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
        "app.rate-limit.login-per-minute=2", "app.rate-limit.registration-per-hour=2"})
@ActiveProfiles("test")
class MultipartHttpIntegrationTest {
    @Autowired TestRestTemplate rest;
    @LocalServerPort int port;
    @MockBean Cloudinary cloudinary;
    @Autowired DataSource dataSource;
    @Autowired Environment environment;

    @Test
    void multipartContextUsesTheExpectedDatabase() throws Exception {
        // This context sets its own datasource URL, so it is verified separately from the shared context.
        TestDatabaseAssertions.assertExpectedDatabase(dataSource, environment);
    }

    @Test
    void realServletLimitsAndMalformedMultipartHaveStructuredClientErrors() {
        // The default Apache client retries 429 responses and waits for Retry-After.
        // Security tests must observe the original response rather than retrying it.
        rest.getRestTemplate().setRequestFactory(new org.springframework.http.client.HttpComponentsClientHttpRequestFactory(
                org.apache.hc.client5.http.impl.classic.HttpClients.custom().disableAutomaticRetries().build()));
        var registered = rest.postForEntity("/api/auth/register", Map.of(
                "name", "Multipart Test", "email", UUID.randomUUID() + "@example.test", "password", "secret123"), AuthResponseDto.class);
        assertEquals(HttpStatus.CREATED, registered.getStatusCode());
        String token = registered.getBody().token();
        for (int size : new int[]{5 * 1024 * 1024 + 1, 7 * 1024 * 1024}) {
            String boundary = "certificate-boundary";
            byte[] prefix = ("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"certificate.pdf\""
                    + "\r\nContent-Type: application/pdf\r\n\r\n").getBytes(StandardCharsets.US_ASCII);
            byte[] suffix = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII);
            byte[] body = new byte[prefix.length + size + suffix.length];
            System.arraycopy(prefix, 0, body, 0, prefix.length);
            System.arraycopy(suffix, 0, body, prefix.length + size, suffix.length);
            var headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.parseMediaType("multipart/form-data; boundary=" + boundary));
            var response = rest.exchange("/api/uploads/certificates", HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
            assertEquals(413, response.getBody().get("status"));
        }
        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        var malformed = rest.exchange("/api/uploads/certificates", HttpMethod.POST,
                new HttpEntity<>("invalid multipart", headers), Map.class);
        assertEquals(HttpStatus.BAD_REQUEST, malformed.getStatusCode());
        verifyNoInteractions(cloudinary);
        realSecurityChainRateLimitsLoginAndRegistrationBeforePasswordWork();
    }

    private void realSecurityChainRateLimitsLoginAndRegistrationBeforePasswordWork() {
        var invalidLogin = Map.of("email", "missing@example.test", "password", "wrong");
        // HTTP tests share one loopback address; use an independent /login bucket.
        for (int i = 0; i < 2; i++) {
            assertEquals(HttpStatus.UNAUTHORIZED, rest.postForEntity("/api/auth/login", invalidLogin, Map.class).getStatusCode());
        }
        var limited = rest.postForEntity("/api/auth/login", invalidLogin, Map.class);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, limited.getStatusCode());
        assertNotNull(limited.getHeaders().getFirst("Retry-After"));
        var invalidRegistration = Map.of("name", "", "email", "bad", "password", "");
        // N+1 attempts regardless of the other test's one valid registration.
        ResponseEntity<Map> response = null;
        for (int i = 0; i < 3; i++) response = rest.postForEntity("/api/auth/register", invalidRegistration, Map.class);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
    }
}
