package com.estate.api.v1.profile;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.EmailChangeDTO;
import com.estate.dto.PasswordChangeDTO;
import com.estate.dto.PhoneNumberChangeDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.CustomUserDetails;
import com.estate.service.ProfileOtpService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/profile")
@RequiredArgsConstructor
public class AdminProfileV1API {
    private final StaffService staffService;
    private final ProfileOtpService profileOtpService;
    private final OAuthIdentityRepository oauthIdentityRepository;

    @PutMapping("/username")
    public ApiMessageResponse<Void> updateUsername(@RequestBody UsernameChangeDTO dto, @AuthenticationPrincipal CustomUserDetails user) {
        staffService.usernameUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Tên người dùng đã được cập nhật thành công.");
    }

    @PutMapping("/email")
    public ApiMessageResponse<Void> updateEmail(@RequestBody EmailChangeDTO dto, @AuthenticationPrincipal CustomUserDetails user) {
        staffService.emailUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Email đã được cập nhật thành công.");
    }

    @PutMapping("/phone-number")
    public ApiMessageResponse<Void> updatePhoneNumber(@RequestBody PhoneNumberChangeDTO dto, @AuthenticationPrincipal CustomUserDetails user) {
        staffService.phoneNumberUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Số điện thoại đã được cập nhật thành công.");
    }

    @PutMapping("/password")
    public ApiMessageResponse<Void> updatePassword(@RequestBody PasswordChangeDTO dto, @AuthenticationPrincipal CustomUserDetails user) {
        staffService.passwordUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Mật khẩu đã được cập nhật thành công.");
    }

    @PostMapping("/otp/{purpose}")
    public ApiMessageResponse<Void> sendOtp(@PathVariable String purpose, @AuthenticationPrincipal CustomUserDetails user) {
        profileOtpService.sendOtp(resolveOtpEmail(user.getUserId()), purpose);
        return ApiMessageResponse.of("Mã OTP đã được gửi thành công.");
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
