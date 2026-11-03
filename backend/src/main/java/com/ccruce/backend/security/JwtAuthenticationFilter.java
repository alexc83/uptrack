package com.ccruce.backend.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.PrematureJwtException;
import io.jsonwebtoken.RequiredTypeException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath().isEmpty() ? request.getRequestURI() : request.getServletPath();
        return path.equals("/api/auth/login") || path.equals("/api/auth/register") || path.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");

        if (authorization != null && authorization.startsWith("Bearer ")) {
            AuthenticatedUser authenticatedUser = parseOrNull(authorization.substring(7));

            if (authenticatedUser != null) {
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        authenticatedUser,
                        null,
                        List.of()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } else {
                SecurityContextHolder.clearContext();
            }
        }

        // An invalid token never fails the request here: the request simply stays unauthenticated. Protected
        // endpoints are then rejected by RestAuthenticationEntryPoint with one generic 401, and public endpoints
        // (login, register, health) keep working even if the browser still holds a stale token.
        filterChain.doFilter(request, response);
    }

    /**
     * Returns the authenticated user for a valid token, or {@code null} when the token itself is unusable.
     *
     * <p>Only the token-specific failures are treated as "invalid token": malformed, unsupported (for example
     * unsigned), bad signature, expired, not yet valid, a claim of the wrong type, and an unusable user-id claim
     * (jjwt rejects empty tokens, and {@link JwtService} rejects a missing or non-UUID user id, with
     * {@link IllegalArgumentException}). The try block contains nothing but the token parsing call. Signing-key
     * configuration errors (jjwt's {@code WeakKeyException} and friends) and any other unexpected exception are
     * deliberately not caught and still surface as server errors.
     */
    private AuthenticatedUser parseOrNull(String token) {
        try {
            return jwtService.parseToken(token);
        } catch (ExpiredJwtException
                 | PrematureJwtException
                 | MalformedJwtException
                 | UnsupportedJwtException
                 | SignatureException
                 | RequiredTypeException
                 | IllegalArgumentException exception) {
            return null;
        }
    }
}
