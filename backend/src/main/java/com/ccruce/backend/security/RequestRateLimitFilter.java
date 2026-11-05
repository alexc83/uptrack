package com.ccruce.backend.security;

import com.ccruce.backend.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

// Registered only in the security chain (not as a servlet filter bean).
public class RequestRateLimitFilter extends OncePerRequestFilter {
    private final RequestRateLimiter limiter;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper mapper;

    public RequestRateLimitFilter(RequestRateLimiter limiter, ClientIpResolver clientIpResolver, ObjectMapper mapper) {
        this.limiter = limiter;
        this.clientIpResolver = clientIpResolver;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getServletPath().isEmpty() ? request.getRequestURI() : request.getServletPath();
        String scope = null;
        String identity = clientIpResolver.resolve(request);
        if (request.getMethod().equals("POST")) {
            if (path.equals("/api/auth/login")) scope = "login";
            if (path.equals("/api/auth/register")) scope = "register";
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (path.equals("/api/uploads/certificates") && authentication != null
                    && authentication.getPrincipal() instanceof AuthenticatedUser user) {
                scope = "upload";
                identity = user.id().toString();
            }
        }
        if (request.getMethod().equals("GET") && path.matches("/api/ce-records/[^/]+/certificate-url")) {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
                scope = "certificate-url";
                identity = user.id().toString();
            }
        }
        long retry = scope == null ? 0 : limiter.retryAfter(scope, identity);
        if (retry > 0) {
            response.setStatus(429);
            response.setHeader("Retry-After", Long.toString(retry));
            response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(), new ErrorResponse(
                    429, "Too Many Requests", "Too many requests. Please try again later.", Instant.now()));
            return;
        }
        chain.doFilter(request, response);
    }
}
