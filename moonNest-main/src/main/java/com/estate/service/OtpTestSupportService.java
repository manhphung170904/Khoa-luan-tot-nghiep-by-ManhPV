package com.estate.service;

import java.util.Optional;

public interface OtpTestSupportService {
    void recordOtp(String email, String purpose, String otp);

    Optional<String> latestOtp(String email, String purpose);
}
