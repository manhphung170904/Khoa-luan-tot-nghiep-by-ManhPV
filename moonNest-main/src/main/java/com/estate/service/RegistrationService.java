package com.estate.service;

import com.estate.repository.entity.CustomerEntity;

public interface RegistrationService {
    void requestRegistration(String email);

    String verifyRegistrationCode(String email, String otp);

    CustomerEntity completeRegistration(String setupToken,
                                        String fullName,
                                        String username,
                                        String password,
                                        String confirmPassword);
}
