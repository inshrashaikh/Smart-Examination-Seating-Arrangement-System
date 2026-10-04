package com.examseat.security;

import com.examseat.entity.Role;
import com.examseat.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

/** Issues and validates HS256 JWTs. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTokenValidityMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-token-validity-ms:86400000}") long accessTokenValidityMs) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 256 bits (32 bytes) long");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenValidityMs = accessTokenValidityMs;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(Map.of(
                        "sub", user.getEmail(),
                        "uid", user.getId(),
                        "name", user.getName() == null ? "" : user.getName(),
                        "role", user.getRole().name()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(accessTokenValidityMs)))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return extract(token, Claims::getSubject);
    }

    public Role extractRole(String token) {
        String role = extract(token, claims -> claims.get("role", String.class));
        try {
            return role == null ? null : Role.valueOf(role);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public boolean isValid(String token, String username) {
        try {
            String subject = extractUsername(token);
            return subject != null && subject.equalsIgnoreCase(username) && !isExpired(token);
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean isExpired(String token) {
        return extract(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extract(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }

    public long getAccessTokenValiditySeconds() {
        return accessTokenValidityMs / 1000;
    }
}