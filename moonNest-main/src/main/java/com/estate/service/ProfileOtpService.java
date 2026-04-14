package com.estate.service;

public interface ProfileOtpService {
    void sendOtp(String email, String purpose);

    void verifyOtp(String email, String purpose, String otp);
}
