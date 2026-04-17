package com.estate.service.impl;

import com.estate.exception.BusinessException;
import com.estate.repository.CustomerRepository;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.EmailVerificationEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.CustomUserDetails;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.AuthService;
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
import java.util.Optional;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final String PURPOSE_RESET_PASSWORD = "RESET_PASSWORD";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_USED = "USED";

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private EmailVerificationRepository emailVerificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private JavaMailSender mailSender;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void forgotPassword(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail) || !isLocalAccount(normalizedEmail)) {
            return;
        }

        emailVerificationRepository.deleteByEmailAndPurposeAndStatus(normalizedEmail, PURPOSE_RESET_PASSWORD, STATUS_PENDING);

        String otp = generateOtp();
        EmailVerificationEntity entity = new EmailVerificationEntity();
        entity.setEmail(normalizedEmail);
        entity.setPurpose(PURPOSE_RESET_PASSWORD);
        entity.setStatus(STATUS_PENDING);
        entity.setOtpHash(hash(otp));
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        emailVerificationRepository.save(entity);

        sendResetEmail(normalizedEmail, otp);
    }

    @Override
    public void resetPassword(String email, String otp, String newPassword, String confirmPassword) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail) || !isLocalAccount(normalizedEmail)) {
            throw new BusinessException("Không tìm thấy tài khoản.");
        }

        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự.");
        }

        if (!StringUtils.hasText(confirmPassword) || !newPassword.equals(confirmPassword)) {
            throw new BusinessException("Mật khẩu xác nhận không khớp.");
        }

        EmailVerificationEntity verification = emailVerificationRepository
                .findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(normalizedEmail, PURPOSE_RESET_PASSWORD, STATUS_PENDING)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã đặt lại mật khẩu hoặc mã đã hết hạn."));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            verification.setStatus(STATUS_USED);
            verification.setUsedAt(LocalDateTime.now());
            emailVerificationRepository.save(verification);
            throw new BusinessException("Mã đặt lại mật khẩu đã hết hạn.");
        }

        if (!hash(otp).equals(verification.getOtpHash())) {
            throw new BusinessException("Mã đặt lại mật khẩu không hợp lệ.");
        }

        Optional<StaffEntity> staff = staffRepository.findByEmail(normalizedEmail)
                .filter(staffEntity -> isLocalAccount(staffEntity.getEmail()));
        if (staff.isPresent()) {
            StaffEntity entity = staff.get();
            entity.setPassword(passwordEncoder.encode(newPassword));
            staffRepository.save(entity);
            refreshTokenService.revokeAllForUser("STAFF", entity.getId());
        } else {
            CustomerEntity customer = customerRepository.findByEmail(normalizedEmail)
                    .filter(customerEntity -> isLocalAccount(customerEntity.getEmail()))
                    .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản."));
            customer.setPassword(passwordEncoder.encode(newPassword));
            customerRepository.save(customer);
            refreshTokenService.revokeAllForUser("CUSTOMER", customer.getId());
        }

        verification.setStatus(STATUS_USED);
        verification.setUsedAt(LocalDateTime.now());
        emailVerificationRepository.save(verification);
    }

    @Override
    public CustomUserDetails authenticate(String identifier, String password) {
        String normalizedIdentifier = identifier == null ? "" : identifier.trim();
        if (!StringUtils.hasText(normalizedIdentifier)) {
            throw new BusinessException("Vui lòng nhập tên đăng nhập.");
        }

        CustomUserDetails user = resolveLoginUser(normalizedIdentifier);
        if (user == null || user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BusinessException("Tên đăng nhập hoặc mật khẩu không đúng.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException("Tên đăng nhập hoặc mật khẩu không đúng.");
        }

        return user;
    }

    @Override
    public void logout(String refreshToken) {
        refreshTokenService.revokeRawToken(refreshToken);
    }

    public void sendResetEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("MoonNest - Password reset code");
        message.setText(
                "Hello,\n\n" +
                "Your password reset code is: " + otp + "\n\n" +
                "This code will expire in 10 minutes.\n" +
                "If you did not request this action, you can ignore this email."
        );

        mailSender.send(message);
    }

    private boolean isLocalAccount(String email) {
        StaffEntity staff = staffRepository.findByEmail(email).orElse(null);
        if (staff != null) {
            return staff.getAuthOrigin() == null || "LOCAL".equalsIgnoreCase(staff.getAuthOrigin());
        }

        CustomerEntity customer = customerRepository.findByEmail(email).orElse(null);
        if (customer != null) {
            return customer.getAuthOrigin() == null || "LOCAL".equalsIgnoreCase(customer.getAuthOrigin());
        }

        return false;
    }

    private String generateOtp() {
        int code = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(code);
    }

    private String hash(String value) {
        return DigestUtils.sha256Hex(value);
    }

    private CustomUserDetails resolveLoginUser(String identifier) {
        boolean looksLikeEmail = identifier.contains("@");
        if (!looksLikeEmail) {
            CustomUserDetails byUsername = resolveByUsername(identifier);
            if (byUsername != null) {
                return byUsername;
            }
        }

        CustomerEntity customerByEmail = customerRepository.findByEmail(identifier).orElse(null);
        if (customerByEmail != null) {
            return new CustomUserDetails(
                    customerByEmail.getId(),
                    customerByEmail.getUsername(),
                    customerByEmail.getPassword(),
                    customerByEmail.getRole(),
                    "CUSTOMER",
                    customerByEmail.getAuthOrigin() == null ? "LOCAL" : customerByEmail.getAuthOrigin()
            );
        }

        StaffEntity staffByEmail = staffRepository.findByEmail(identifier).orElse(null);
        if (staffByEmail != null) {
            return new CustomUserDetails(
                    staffByEmail.getId(),
                    staffByEmail.getUsername(),
                    staffByEmail.getPassword(),
                    staffByEmail.getRole(),
                    "STAFF",
                    staffByEmail.getAuthOrigin() == null ? "LOCAL" : staffByEmail.getAuthOrigin()
            );
        }

        if (looksLikeEmail) {
            return null;
        }

        return resolveByUsername(identifier);
    }

    private CustomUserDetails resolveByUsername(String identifier) {
        StaffEntity staff = staffRepository.findByUsername(identifier).orElse(null);
        if (staff != null) {
            return new CustomUserDetails(
                    staff.getId(),
                    staff.getUsername(),
                    staff.getPassword(),
                    staff.getRole(),
                    "STAFF",
                    staff.getAuthOrigin() == null ? "LOCAL" : staff.getAuthOrigin()
            );
        }

        CustomerEntity customer = customerRepository.findByUsername(identifier);
        if (customer != null) {
            return new CustomUserDetails(
                    customer.getId(),
                    customer.getUsername(),
                    customer.getPassword(),
                    customer.getRole(),
                    "CUSTOMER",
                    customer.getAuthOrigin() == null ? "LOCAL" : customer.getAuthOrigin()
            );
        }

        return null;
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : null;
    }
}
