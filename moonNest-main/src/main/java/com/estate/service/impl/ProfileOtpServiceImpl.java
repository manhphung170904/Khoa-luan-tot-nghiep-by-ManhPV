package com.estate.service.impl;

import com.estate.exception.BusinessException;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.entity.EmailVerificationEntity;
import com.estate.service.ProfileOtpService;
import lombok.RequiredArgsConstructor;
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
public class ProfileOtpServiceImpl implements ProfileOtpService {
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_USED = "USED";
    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRE_MINUTES = 10;

    private final EmailVerificationRepository emailVerificationRepository;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void sendOtp(String email, String purpose) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new BusinessException("Email không hợp lệ");
        }
        if (!StringUtils.hasText(purpose)) {
            throw new BusinessException("Mục đích xác thực không hợp lệ");
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

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(normalizedEmail);
        message.setSubject("MoonNest - Mã xác nhận");
        message.setText(
                "Xin chào,\n\n" +
                "Mã xác nhận của bạn là: " + otp + "\n\n" +
                "Mã có hiệu lực trong 10 phút.\n" +
                "Nếu bạn không yêu cầu, hãy bỏ qua email này."
        );
        mailSender.send(message);
    }

    @Override
    public void verifyOtp(String email, String purpose, String otp) {
        String normalizedEmail = normalizeEmail(email);
        EmailVerificationEntity entity = emailVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(normalizedEmail, purpose, STATUS_PENDING)
                .orElseThrow(() -> new BusinessException("Mã xác nhận không tồn tại hoặc đã hết hạn"));

        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            entity.setStatus(STATUS_USED);
            entity.setUsedAt(LocalDateTime.now());
            emailVerificationRepository.save(entity);
            throw new BusinessException("Mã xác nhận đã hết hạn");
        }

        if (!hash(otp).equals(entity.getOtpHash())) {
            throw new BusinessException("Mã xác nhận không đúng");
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
}
