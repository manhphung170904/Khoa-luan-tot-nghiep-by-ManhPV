package com.estate.api.v1.testsupport;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.ApiMessageWithDataResponse;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.entity.EmailVerificationEntity;
import com.estate.service.OtpTestSupportService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Locale;

@RestController
@Profile({"local-nooauth", "test"})
@RequestMapping("/api/test-support/otp")
@RequiredArgsConstructor
public class OtpTestSupportV1API {
    private final OtpTestSupportService otpTestSupportService;
    private final EmailVerificationRepository emailVerificationRepository;

    @Value("${test-support.otp-token:}")
    private String expectedToken;

    @GetMapping("/latest")
    public ResponseEntity<?> latestOtp(@RequestHeader(name = "X-Test-Hook-Token", required = false) String token,
                                       @RequestParam String email,
                                       @RequestParam String purpose) {
        if (!isAuthorized(token)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiMessageResponse.of("Test OTP hook is forbidden."));
        }

        return otpTestSupportService.latestOtp(normalize(email), purpose)
                .<ResponseEntity<?>>map(otp -> ResponseEntity.ok(
                        ApiMessageWithDataResponse.of(
                                "Test OTP fetched successfully.",
                                OtpPayload.of(normalize(email), purpose, otp, "AVAILABLE")
                        )
                ))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiMessageResponse.of("No OTP found for requested email/purpose.")));
    }

    @PostMapping("/expire")
    public ResponseEntity<?> expireLatest(@RequestHeader(name = "X-Test-Hook-Token", required = false) String token,
                                          @RequestParam String email,
                                          @RequestParam String purpose) {
        if (!isAuthorized(token)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiMessageResponse.of("Test OTP hook is forbidden."));
        }

        EmailVerificationEntity entity = emailVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(normalize(email), purpose, "PENDING")
                .orElse(null);

        if (entity == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiMessageResponse.of("No pending OTP found to expire."));
        }

        entity.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        entity.setVerifiedAt(null);
        entity.setUsedAt(null);
        emailVerificationRepository.save(entity);

        return ResponseEntity.ok(ApiMessageResponse.of("Expired latest OTP successfully."));
    }

    private boolean isAuthorized(String token) {
        return expectedToken != null
                && !expectedToken.isBlank()
                && expectedToken.equals(token);
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public record OtpPayload(String email, String purpose, String otp, String status) {
        public static OtpPayload of(String email, String purpose, String otp, String status) {
            return new OtpPayload(email, purpose, otp, status);
        }
    }
}
