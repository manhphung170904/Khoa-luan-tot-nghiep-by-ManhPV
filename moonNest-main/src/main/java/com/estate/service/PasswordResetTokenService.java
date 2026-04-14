package com.estate.service;

import com.estate.repository.entity.PasswordResetTokenEntity;

public interface PasswordResetTokenService {
    PasswordResetTokenEntity createToken(String userType, Long userId);
    PasswordResetTokenEntity validate(String tokenValue);
    void markUsed(PasswordResetTokenEntity token);
}
