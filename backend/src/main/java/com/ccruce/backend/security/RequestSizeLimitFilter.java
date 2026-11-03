package com.ccruce.backend.security;

import com.ccruce.backend.dto.response.ErrorResponse;
import com.ccruce.backend.exception.RequestBodyTooLargeException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/**
 * Bounds non-multipart request bodies (JSON login/registration/profile payloads) so a
 * client cannot make the server buffer an arbitrarily large body before validation.
 * Multipart bodies are already bounded by {@code spring.servlet.multipart} limits.
 *
 * <p>A declared {@code Content-Length} above the limit is rejected with 413 without
 * reading the body; bodies without a length (chunked) are bounded while streaming via
 * {@link RequestBodyTooLargeException}, which the global handler maps to 413. This is a
 * per-request bound, not a global lock: other clients are unaffected. A reverse proxy
 * should still cap body sizes at the edge.
 */
public class RequestSizeLimitFilter extends OncePerRequestFilter {
    private final long maxBytes;
    private final ObjectMapper mapper;

    public RequestSizeLimitFilter(long maxBytes, ObjectMapper mapper) {
        if (maxBytes < 1) throw new IllegalStateException("Maximum request body size must be positive.");
        this.maxBytes = maxBytes;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String contentType = request.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith(MediaType.MULTIPART_FORM_DATA_VALUE)) {
            chain.doFilter(request, response);
            return;
        }
        if (request.getContentLengthLong() > maxBytes) {
            writeTooLarge(response);
            return;
        }
        chain.doFilter(new BoundedRequest(request, maxBytes), response);
    }

    private void writeTooLarge(HttpServletResponse response) throws IOException {
        response.setStatus(413);
        response.setContentType("application/json");
        mapper.writeValue(response.getOutputStream(), new ErrorResponse(
                413, "Payload Too Large", "The request body is too large.", Instant.now()));
    }

    static final class BoundedRequest extends HttpServletRequestWrapper {
        private final long maxBytes;

        BoundedRequest(HttpServletRequest request, long maxBytes) {
            super(request);
            this.maxBytes = maxBytes;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            InputStream in = super.getInputStream();
            return new BoundedServletInputStream(in, maxBytes);
        }

        @Override
        public java.io.BufferedReader getReader() throws IOException {
            return new java.io.BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }

    static final class BoundedServletInputStream extends ServletInputStream {
        private final InputStream delegate;
        private final long maxBytes;
        private long read;

        BoundedServletInputStream(InputStream delegate, long maxBytes) {
            this.delegate = delegate;
            this.maxBytes = maxBytes;
        }

        private void count(int n) {
            read += n;
            if (read > maxBytes) throw new RequestBodyTooLargeException();
        }

        @Override
        public int read() throws IOException {
            int b = delegate.read();
            if (b >= 0) count(1);
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            int n = delegate.read(b, off, len);
            if (n > 0) count(n);
            return n;
        }

        @Override
        public int available() throws IOException {
            return delegate.available();
        }

        @Override
        public boolean isFinished() {
            try {
                return read > maxBytes || delegate.available() == 0;
            } catch (IOException e) {
                return true;
            }
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(jakarta.servlet.ReadListener listener) {
            throw new UnsupportedOperationException();
        }
    }
}
