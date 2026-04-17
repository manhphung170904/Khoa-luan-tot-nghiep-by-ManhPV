package com.estate.service.impl;

import com.estate.exception.BusinessException;
import com.estate.service.PasswordResetTokenService;
import com.estate.repository.PasswordResetTokenRepository;
import com.estate.repository.entity.PasswordResetTokenEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class PasswordResetTokenServiceImpl implements PasswordResetTokenService {
    @Autowired
    private PasswordResetTokenRepository tokenRepo;

    @Override
    public PasswordResetTokenEntity createToken(String userType, Long userId) {
        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setToken(UUID.randomUUID().toString());
        token.setUserType(userType);
        token.setUserId(userId);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        token.setUsed(false);

        return tokenRepo.save(token);
    }

    @Override
    public PasswordResetTokenEntity validate(String tokenValue) {
        PasswordResetTokenEntity token = tokenRepo.findByToken(tokenValue)
                .orElseThrow(() -> new BusinessException("Mã đặt lại mật khẩu không hợp lệ."));

        if (token.isUsed()) {
            throw new BusinessException("Mã đặt lại mật khẩu này đã được sử dụng.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Mã đặt lại mật khẩu đã hết hạn.");
        }

        return token;
    }

    @Override
    public void markUsed(PasswordResetTokenEntity token) {
        token.setUsed(true);
        tokenRepo.save(token);
    }
}
