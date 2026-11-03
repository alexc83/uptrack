package com.ccruce.backend.security;

import com.ccruce.backend.config.AuthProperties;
import com.ccruce.backend.entity.User;
import com.ccruce.backend.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final SecretKey signingKey;

    public JwtService(AuthProperties authProperties, UserRepository userRepository) {
        this.authProperties = authProperties;
        this.userRepository = userRepository;
        this.signingKey = Keys.hmacShaKeyFor(authProperties.secret().getBytes(StandardCharsets.UTF_8));
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
                .claim("cv", credentialMarker(user))
                .signWith(getSigningKey())
                .compact();
    }

    public AuthenticatedUser parseToken(String token) {
        // Key validity is checked at construction, before the server accepts requests.
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

        Date issuedAt = claims.getIssuedAt();
        Date expiration = claims.getExpiration();
        if (issuedAt == null || expiration == null || issuedAt.after(new Date())
                || !expiration.after(issuedAt)
                || java.time.Duration.between(issuedAt.toInstant(), expiration.toInstant())
                        .compareTo(java.time.Duration.ofSeconds(AuthProperties.MAX_LIFETIME_SECONDS)) > 0) {
            throw new IllegalArgumentException("Invalid token lifetime.");
        }
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid token subject."));
        String marker = claims.get("cv", String.class);
        if (marker == null || !java.security.MessageDigest.isEqual(
                marker.getBytes(StandardCharsets.UTF_8), credentialMarker(user).getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid token credentials.");
        }
        return new AuthenticatedUser(user.getId(), user.getEmail(), user.getName());
    }

    private SecretKey getSigningKey() {
        return signingKey;
    }

    // Never expose the password hash in a token. A domain-separated keyed marker binds
    // every session to the current credential without a blacklist or a schema migration.
    private String credentialMarker(User user) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(signingKey.getEncoded(), "HmacSHA256"));
            return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(("uptrack-credential-v1:" + user.getPassword()).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to initialize credential verification.", exception);
        }
    }
}
