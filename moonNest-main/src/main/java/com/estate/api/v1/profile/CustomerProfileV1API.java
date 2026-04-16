package com.estate.api.v1.profile;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.EmailChangeDTO;
import com.estate.dto.PasswordChangeDTO;
import com.estate.dto.PhoneNumberChangeDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.security.CustomUserDetails;
import com.estate.service.CustomerService;
import com.estate.service.ProfileOtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/profile")
@RequiredArgsConstructor
public class CustomerProfileV1API {
    private final CustomerService customerService;
    private final ProfileOtpService profileOtpService;
    private final OAuthIdentityRepository oauthIdentityRepository;

    @PutMapping("/username")
    public ApiMessageResponse<Void> updateUsername(@RequestBody UsernameChangeDTO dto,
                                                   @AuthenticationPrincipal CustomUserDetails user) {
        customerService.usernameUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Cập nhật tên đăng nhập thành công.");
    }

    @PutMapping("/email")
    public ApiMessageResponse<Void> updateEmail(@RequestBody EmailChangeDTO dto,
                                                @AuthenticationPrincipal CustomUserDetails user) {
        customerService.emailUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Cập nhật email thành công.");
    }

    @PutMapping("/phone-number")
    public ApiMessageResponse<Void> updatePhoneNumber(@RequestBody PhoneNumberChangeDTO dto,
                                                      @AuthenticationPrincipal CustomUserDetails user) {
        customerService.phoneNumberUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Cập nhật số điện thoại thành công.");
    }

    @PutMapping("/password")
    public ApiMessageResponse<Void> updatePassword(@RequestBody PasswordChangeDTO dto,
                                                   @AuthenticationPrincipal CustomUserDetails user) {
        customerService.passwordUpdate(dto, user.getUserId());
        return ApiMessageResponse.of("Cập nhật mật khẩu thành công.");
    }

    @PostMapping("/otp/{purpose}")
    public ApiMessageResponse<Void> sendOtp(@PathVariable String purpose,
                                            @AuthenticationPrincipal CustomUserDetails user) {
        profileOtpService.sendOtp(resolveOtpEmail(user.getUserId()), purpose);
        return ApiMessageResponse.of("Gửi mã OTP thành công.");
    }

    private String resolveOtpEmail(Long customerId) {
        return oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId("google", "CUSTOMER", customerId)
                .map(OAuthIdentityEntity::getEmail)
                .orElseGet(() -> {
                    CustomerEntity customer = customerService.findById(customerId);
                    return customer.getEmail();
                });
    }
}
