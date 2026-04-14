package com.estate.security.jwt;

import com.estate.security.CustomUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtTokenService {
    private final JwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtTokenService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(CustomUserDetails user) {
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + jwtProperties.getAccessTokenExpiration().toMillis());
        String subject = user.getUsername();
        if (subject == null || subject.isBlank()) {
            subject = user.getUserType() + ":" + user.getUserId();
        }

        return Jwts.builder()
                .setSubject(subject)
                .claim("uid", user.getUserId())
                .claim("utype", user.getUserType())
                .setIssuedAt(now)
                .setExpiration(expiresAt)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public JwtUserClaims parseAccessToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();

        Object userIdValue = claims.get("uid");
        Object userTypeValue = claims.get("utype");

        Long userId = userIdValue instanceof Number number
                ? number.longValue()
                : Long.valueOf(String.valueOf(userIdValue));
        String userType = String.valueOf(userTypeValue);

        return new JwtUserClaims(userId, userType);
    }
}
