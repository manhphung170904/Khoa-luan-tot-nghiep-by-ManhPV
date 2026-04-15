package com.estate.api.v1.auth;

import com.estate.dto.ApiMessageResponse;
import com.estate.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthV1API {
    private final AuthService authService;

    @PostMapping("/forgot-password")
    public ApiMessageResponse<Void> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        return ApiMessageResponse.of("If the email is valid, a reset link has been sent.");
    }
}
