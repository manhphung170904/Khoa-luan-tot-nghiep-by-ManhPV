package com.estate.security.jwt;

import com.estate.repository.RefreshTokenRepository;
import com.estate.repository.entity.RefreshTokenEntity;
import com.estate.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

import org.apache.commons.codec.digest.DigestUtils;

@Service
@Transactional
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               JwtProperties jwtProperties) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProperties = jwtProperties;
    }

    public String issueToken(CustomUserDetails user) {
        refreshTokenRepository.revokeAllActiveForUser(user.getUserType(), user.getUserId());

        String rawToken = generateRawToken();
        RefreshTokenEntity entity = new RefreshTokenEntity();
        entity.setTokenHash(hash(rawToken));
        entity.setUserType(user.getUserType());
        entity.setUserId(user.getUserId());
        entity.setExpiresAt(LocalDateTime.now().plus(jwtProperties.getRefreshTokenExpiration()));
        entity.setRevoked(false);
        refreshTokenRepository.save(entity);

        return rawToken;
    }

    public Optional<RefreshTokenEntity> findActiveByRawToken(String rawToken) {
        String tokenHash = hash(rawToken);
        return refreshTokenRepository.findByTokenHashAndRevokedFalseAndExpiresAtAfter(tokenHash, LocalDateTime.now());
    }

    public void revokeRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokenRepository.revokeByTokenHash(hash(rawToken));
    }

    public void revokeAllForUser(String userType, Long userId) {
        refreshTokenRepository.revokeAllActiveForUser(userType, userId);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        return DigestUtils.sha256Hex(token);
    }
}
