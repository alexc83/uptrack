package com.ccruce.backend.security;

import com.ccruce.backend.exception.RequestBodyTooLargeException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class RequestSizeLimitFilterTest {
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(1024, mapper);

    private static MockHttpServletRequest jsonRequest(byte[] body) {
        var request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setContentType("application/json");
        request.setContent(body);
        return request;
    }

    @Test
    void declaredContentLengthAboveLimitIsRejectedWith413WithoutReadingBody() throws Exception {
        byte[] body = new byte[2048];
        var request = jsonRequest(body);
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertEquals(413, response.getStatus());
        assertTrue(response.getContentAsString().contains("The request body is too large."));
        assertNull(chain.getRequest(), "body must not be read downstream");
    }

    @Test
    void bodyAtTheLimitPassesThrough() throws Exception {
        var request = jsonRequest(new byte[1024]);
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertNotNull(chain.getRequest());
        assertEquals(200, response.getStatus());
    }

    @Test
    void chunkedBodyWithoutContentLengthIsBoundedWhileStreaming() throws Exception {
        // Simulate a chunked request: no content length, but a large actual body.
        var large = new MockHttpServletRequest("POST", "/api/auth/login");
        large.setContentType("application/json");
        large.setContent(new byte[4096]);
        HttpServletRequest chunked = new jakarta.servlet.http.HttpServletRequestWrapper(large) {
            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        var seen = new AtomicInteger();
        FilterChain reading = new FilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws IOException, ServletException {
                HttpServletRequest httpReq = (HttpServletRequest) req;
                try {
                    byte[] all = httpReq.getInputStream().readAllBytes();
                    seen.set(all.length);
                } catch (RequestBodyTooLargeException e) {
                    seen.set(-1);
                    throw e;
                }
            }
        };
        var response = new MockHttpServletResponse();
        assertThrows(RequestBodyTooLargeException.class, () -> filter.doFilter(chunked, response, reading));
        assertEquals(-1, seen.get(), "stream must be cut off at the limit, not fully buffered");
    }

    @Test
    void multipartRequestsAreLeftToTheMultipartLimits() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/uploads/certificates");
        request.setContentType("multipart/form-data; boundary=x");
        request.setContent(new byte[8 * 1024 * 1024]);
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertNotNull(chain.getRequest(), "multipart bodies are bounded by spring.servlet.multipart, not this filter");
    }

    @Test
    void rejectsNonPositiveLimit() {
        assertThrows(IllegalStateException.class, () -> new RequestSizeLimitFilter(0, mapper));
    }

    @Test
    void concurrentRequestsAreEachBoundedIndependently() throws Exception {
        int threads = 50;
        var pool = java.util.concurrent.Executors.newFixedThreadPool(16);
        var start = new java.util.concurrent.CountDownLatch(1);
        var tooLarge = new AtomicInteger();
        var passed = new AtomicInteger();
        for (int i = 0; i < threads; i++) {
            boolean oversized = i % 2 == 0;
            pool.submit(() -> {
                try {
                    start.await();
                    var request = jsonRequest(new byte[oversized ? 2048 : 512]);
                    var response = new MockHttpServletResponse();
                    filter.doFilter(request, response, new MockFilterChain());
                    if (oversized) tooLarge.incrementAndGet(); else passed.incrementAndGet();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, java.util.concurrent.TimeUnit.SECONDS));
        assertEquals(25, tooLarge.get());
        assertEquals(25, passed.get());
    }
}
