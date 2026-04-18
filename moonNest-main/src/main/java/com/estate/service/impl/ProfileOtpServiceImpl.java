package com.estate.service.impl;

import com.estate.exception.BusinessException;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.entity.EmailVerificationEntity;
import com.estate.service.OtpTestSupportService;
import com.estate.service.ProfileOtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ProfileOtpServiceImpl implements ProfileOtpService {
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_USED = "USED";
    private static final int OTP_EXPIRE_MINUTES = 10;

    private final EmailVerificationRepository emailVerificationRepository;
    private final JavaMailSender mailSender;
    private final org.springframework.beans.factory.ObjectProvider<OtpTestSupportService> otpTestSupportServiceProvider;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void sendOtp(String email, String purpose) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new BusinessException("Email không hợp lệ.");
        }
        if (!StringUtils.hasText(purpose)) {
            throw new BusinessException("Mục đích OTP không hợp lệ.");
        }

        emailVerificationRepository.deleteByEmailAndPurposeAndStatus(normalizedEmail, purpose, STATUS_PENDING);

        String otp = generateOtp();
        EmailVerificationEntity entity = new EmailVerificationEntity();
        entity.setEmail(normalizedEmail);
        entity.setPurpose(purpose);
        entity.setStatus(STATUS_PENDING);
        entity.setOtpHash(hash(otp));
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRE_MINUTES));
        emailVerificationRepository.save(entity);
        otpTestSupportServiceProvider.ifAvailable(service -> service.recordOtp(normalizedEmail, purpose, otp));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(normalizedEmail);
        message.setSubject("MoonNest - Verification code");
        message.setText(
                "Hello,\n\n" +
                "Your verification code is: " + otp + "\n\n" +
                "This code will expire in 10 minutes.\n" +
                "If you did not request this code, you can ignore this email."
        );
        sendMailOrSkipForTest(normalizedEmail, purpose, message);
    }

    @Override
    public void verifyOtp(String email, String purpose, String otp) {
        String normalizedEmail = normalizeEmail(email);
        EmailVerificationEntity entity = emailVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(normalizedEmail, purpose, STATUS_PENDING)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã xác thực hoặc mã đã hết hạn."));

        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            entity.setStatus(STATUS_USED);
            entity.setUsedAt(LocalDateTime.now());
            emailVerificationRepository.save(entity);
            throw new BusinessException("Mã xác thực đã hết hạn.");
        }

        if (!hash(otp).equals(entity.getOtpHash())) {
            throw new BusinessException("Mã xác thực không hợp lệ.");
        }

        entity.setStatus(STATUS_USED);
        entity.setVerifiedAt(LocalDateTime.now());
        entity.setUsedAt(LocalDateTime.now());
        emailVerificationRepository.save(entity);
    }

    private String generateOtp() {
        int code = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(code);
    }

    private String hash(String value) {
        return DigestUtils.sha256Hex(value);
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : null;
    }

    private void sendMailOrSkipForTest(String email, String purpose, SimpleMailMessage message) {
        try {
            mailSender.send(message);
        } catch (RuntimeException ex) {
            if (otpTestSupportServiceProvider.getIfAvailable() != null) {
                log.warn("Skipping OTP email send for {} purpose {} in test-support mode: {}", email, purpose, ex.getMessage());
                return;
            }
            throw ex;
        }
    }
}
