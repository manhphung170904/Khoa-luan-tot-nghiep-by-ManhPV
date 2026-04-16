package com.estate.api.v1.auth;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.ApiMessageWithDataResponse;
import com.estate.dto.AuthLoginRequestDTO;
import com.estate.dto.AuthSessionDTO;
import com.estate.dto.AuthUserDTO;
import com.estate.security.CustomUserDetails;
import com.estate.security.jwt.AuthCookieService;
import com.estate.security.jwt.JwtTokenService;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthV1API {
    private final AuthService authService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final AuthCookieService authCookieService;

    @PostMapping("/forgot-password")
    public ApiMessageResponse<Void> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        return ApiMessageResponse.of("If the account exists, a reset code has been sent.");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiMessageWithDataResponse<AuthSessionDTO>> login(@Valid @RequestBody AuthLoginRequestDTO body,
                                                                            HttpServletResponse response) {
        CustomUserDetails user = authService.authenticate(body.getUsername(), body.getPassword());
        String accessToken = jwtTokenService.generateAccessToken(user);
        String refreshToken = refreshTokenService.issueToken(user);
        authCookieService.setAccessCookie(response, accessToken);
        authCookieService.setRefreshCookie(response, refreshToken);

        return ResponseEntity.ok(
                ApiMessageWithDataResponse.of(
                        "Login successful.",
                        AuthSessionDTO.of(toUserDto(user))
                )
        );
    }

    @GetMapping("/me")
    public AuthSessionDTO me(@AuthenticationPrincipal CustomUserDetails user) {
        return AuthSessionDTO.of(toUserDto(user));
    }

    @PostMapping("/logout")
    public ApiMessageResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(authCookieService.readCookie(request, AuthCookieService.REFRESH_COOKIE));
        authCookieService.clearAuthCookies(response);
        authCookieService.clearOAuthLinkCookies(response);
        return ApiMessageResponse.of("Logout successful.");
    }

    private AuthUserDTO toUserDto(CustomUserDetails user) {
        return AuthUserDTO.of(
                user.getUserId(),
                user.getUsername(),
                user.getRole(),
                user.getUserType(),
                user.getSignupSource()
        );
    }
}
