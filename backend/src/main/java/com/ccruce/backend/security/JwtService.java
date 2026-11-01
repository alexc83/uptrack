package com.ccruce.backend.security;

import com.ccruce.backend.config.AuthProperties;
import com.ccruce.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final AuthProperties authProperties;

    public JwtService(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(authProperties.expirationSeconds());

        return Jwts.builder()
                .subject(user.getEmail())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("uid", user.getId().toString())
                .claim("name", user.getName())
                .signWith(getSigningKey())
                .compact();
    }

    public AuthenticatedUser parseToken(String token) {
        // Resolve the key first so that a misconfigured secret surfaces as a server error instead of being
        // reported as an invalid token.
        SecretKey signingKey = getSigningKey();

        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String userId = claims.get("uid", String.class);
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Token does not carry a user id.");
        }

        return new AuthenticatedUser(
                UUID.fromString(userId),
                claims.getSubject(),
                claims.get("name", String.class)
        );
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(authProperties.secret().getBytes(StandardCharsets.UTF_8));
    }
}
