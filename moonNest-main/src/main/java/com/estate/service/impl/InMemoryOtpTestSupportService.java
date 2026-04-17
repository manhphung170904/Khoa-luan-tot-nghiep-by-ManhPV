package com.estate.service.impl;

import com.estate.service.OtpTestSupportService;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Profile({"local-nooauth", "test"})
public class InMemoryOtpTestSupportService implements OtpTestSupportService {
    private final ConcurrentHashMap<String, String> latestOtps = new ConcurrentHashMap<>();

    @Override
    public void recordOtp(String email, String purpose, String otp) {
        latestOtps.put(key(email, purpose), otp);
    }

    @Override
    public Optional<String> latestOtp(String email, String purpose) {
        return Optional.ofNullable(latestOtps.get(key(email, purpose)));
    }

    private String key(String email, String purpose) {
        return email.trim().toLowerCase(Locale.ROOT) + "::" + purpose;
    }
}
