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
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return new AuthenticatedUser(
                UUID.fromString(claims.get("uid", String.class)),
                claims.getSubject(),
                claims.get("name", String.class)
        );
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(authProperties.secret().getBytes(StandardCharsets.UTF_8));
    }
}
