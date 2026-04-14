package com.estate.service;

public interface AuthService {
    void forgotPassword(String email);
    void resetPassword(String email, String otp, String newPassword, String confirmPassword);
}
