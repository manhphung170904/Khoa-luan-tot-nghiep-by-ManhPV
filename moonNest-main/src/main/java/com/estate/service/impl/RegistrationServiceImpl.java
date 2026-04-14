package com.estate.service.impl;

import com.estate.exception.BusinessException;
import com.estate.repository.CustomerRepository;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.EmailVerificationEntity;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.RegistrationService;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class RegistrationServiceImpl implements RegistrationService {
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final String PURPOSE_REGISTER = "REGISTER";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_VERIFIED = "VERIFIED";
    private static final String STATUS_USED = "USED";

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private EmailVerificationRepository emailVerificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private RefreshTokenService refreshTokenService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void requestRegistration(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new BusinessException("Email không hợp lệ");
        }

        if (customerRepository.findByEmail(normalizedEmail).isPresent()
                || staffRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new BusinessException("Email đã tồn tại. Vui lòng đăng nhập hoặc liên kết tài khoản hiện có.");
        }

        emailVerificationRepository.deleteByEmailAndPurposeAndStatus(normalizedEmail, PURPOSE_REGISTER, STATUS_PENDING);

        String otp = generateOtp();
        EmailVerificationEntity entity = new EmailVerificationEntity();
        entity.setEmail(normalizedEmail);
        entity.setPurpose(PURPOSE_REGISTER);
        entity.setStatus(STATUS_PENDING);
        entity.setOtpHash(hash(otp));
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        emailVerificationRepository.save(entity);

        sendOtpEmail(normalizedEmail, otp);
    }

    @Override
    public String verifyRegistrationCode(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        EmailVerificationEntity entity = emailVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(normalizedEmail, PURPOSE_REGISTER, STATUS_PENDING)
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

        entity.setStatus(STATUS_VERIFIED);
        entity.setVerifiedAt(LocalDateTime.now());
        entity.setSetupToken(UUID.randomUUID().toString().replace("-", ""));
        emailVerificationRepository.save(entity);
        return entity.getSetupToken();
    }

    @Override
    public CustomerEntity completeRegistration(String setupToken,
                                               String fullName,
                                               String username,
                                               String password,
                                               String confirmPassword) {
        EmailVerificationEntity entity = emailVerificationRepository
                .findBySetupTokenAndPurposeAndStatus(setupToken, PURPOSE_REGISTER, STATUS_VERIFIED)
                .orElseThrow(() -> new BusinessException("Phiên xác minh không hợp lệ"));

        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Phiên xác minh đã hết hạn");
        }

        if (!StringUtils.hasText(username)) {
            throw new BusinessException("Username không được để trống");
        }

        if (!StringUtils.hasText(password) || !StringUtils.hasText(confirmPassword)) {
            throw new BusinessException("Mật khẩu không được để trống");
        }

        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự");
        }

        if (!password.equals(confirmPassword)) {
            throw new BusinessException("Mật khẩu xác nhận không khớp");
        }

        String normalizedUsername = username.trim();
        if (customerRepository.existsByUsername(normalizedUsername) || staffRepository.existsByUsername(normalizedUsername)) {
            throw new BusinessException("Username đã tồn tại");
        }

        CustomerEntity customer = new CustomerEntity();
        customer.setUsername(normalizedUsername);
        customer.setPassword(passwordEncoder.encode(password));
        customer.setFullName(resolveFullName(fullName, normalizedUsername, entity.getEmail()));
        customer.setEmail(entity.getEmail());
        customer.setRole("CUSTOMER");
        customer.setAuthOrigin("LOCAL");
        CustomerEntity saved = customerRepository.save(customer);

        entity.setStatus(STATUS_USED);
        entity.setUsedAt(LocalDateTime.now());
        emailVerificationRepository.save(entity);

        refreshTokenService.revokeAllForUser("CUSTOMER", saved.getId());
        return saved;
    }

    private void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("MoonNest - Mã xác nhận đăng ký");
        message.setText(
                "Xin chào,\n\n" +
                        "Mã xác nhận đăng ký của bạn là: " + otp + "\n\n" +
                        "Mã có hiệu lực trong 10 phút.\n" +
                        "Nếu bạn không yêu cầu, hãy bỏ qua email này."
        );
        mailSender.send(message);
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

    private String resolveFullName(String fullName, String username, String email) {
        if (StringUtils.hasText(fullName)) {
            return fullName.trim();
        }
        if (StringUtils.hasText(username)) {
            return username.trim();
        }
        if (StringUtils.hasText(email)) {
            int at = email.indexOf('@');
            return at > 0 ? email.substring(0, at) : email;
        }
        return "Customer";
    }
}
