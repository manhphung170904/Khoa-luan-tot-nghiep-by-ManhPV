package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_token")
@Getter
@Setter
public class PasswordResetTokenEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String token;

    private LocalDateTime expiresAt;

    private boolean used;

    private String userType;   // STAFF / CUSTOMER

    private Long userId;       // id của staff hoặc customer

    private LocalDateTime createdAt = LocalDateTime.now();
}
