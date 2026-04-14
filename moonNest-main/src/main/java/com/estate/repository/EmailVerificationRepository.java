package com.estate.repository;

import com.estate.repository.entity.EmailVerificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerificationEntity, Long> {
    Optional<EmailVerificationEntity> findTopByEmailAndPurposeAndStatusOrderByCreatedAtDesc(String email,
                                                                                           String purpose,
                                                                                           String status);

    Optional<EmailVerificationEntity> findBySetupTokenAndPurposeAndStatus(String setupToken,
                                                                          String purpose,
                                                                          String status);

    @Modifying
    void deleteByEmailAndPurposeAndStatus(String email, String purpose, String status);

    @Modifying
    void deleteByStatusAndExpiresAtBefore(String status, LocalDateTime before);
}
