package com.estate.api.admin;

import com.estate.dto.EmailChangeDTO;
import com.estate.dto.PasswordChangeDTO;
import com.estate.dto.PhoneNumberChangeDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.CustomUserDetails;
import com.estate.service.StaffService;
import com.estate.service.ProfileOtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/profile")
@RequiredArgsConstructor
public class AdminProfileAPI {
    private final StaffService staffService;
    private final ProfileOtpService profileOtpService;
    private final OAuthIdentityRepository oauthIdentityRepository;

    @PutMapping("/username")
    public ResponseEntity<?> usernameUpdate(
            @RequestBody UsernameChangeDTO dto,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long staffId = user.getUserId();
        staffService.usernameUpdate(dto, staffId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/email")
    public ResponseEntity<?> emailUpdate(
            @RequestBody EmailChangeDTO dto,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long staffId = user.getUserId();
        staffService.emailUpdate(dto, staffId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/phoneNumber")
    public ResponseEntity<?> phoneNumberUpdate(
            @RequestBody PhoneNumberChangeDTO dto,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long staffId = user.getUserId();
        staffService.phoneNumberUpdate(dto, staffId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/password")
    public ResponseEntity<?> passwordUpdate(
            @RequestBody PasswordChangeDTO dto,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long staffId = user.getUserId();
        staffService.passwordUpdate(dto, staffId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/otp/{purpose}")
    public ResponseEntity<?> sendOtp(@PathVariable String purpose,
                                     @AuthenticationPrincipal CustomUserDetails user) {
        Long staffId = user.getUserId();
        String email = resolveOtpEmail(staffId);
        profileOtpService.sendOtp(email, purpose);
        return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email liên kết."));
    }

    private String resolveOtpEmail(Long staffId) {
        return oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId("google", "STAFF", staffId)
                .map(OAuthIdentityEntity::getEmail)
                .orElseGet(() -> {
                    StaffEntity staff = staffService.findById(staffId);
                    return staff.getEmail();
                });
    }
}
