package com.estate.service;

import com.estate.security.CustomUserDetails;

public interface AuthService {
    void forgotPassword(String email);
    void resetPassword(String email, String otp, String newPassword, String confirmPassword);
    CustomUserDetails authenticate(String identifier, String password);
    void logout(String refreshToken);
}
