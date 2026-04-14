package com.estate.repository;

import com.estate.repository.entity.OAuthIdentityEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentityEntity, Long> {
    Optional<OAuthIdentityEntity> findByProviderAndProviderUserId(String provider, String providerUserId);
    Optional<OAuthIdentityEntity> findByProviderAndUserTypeAndUserId(String provider, String userType, Long userId);
    void deleteByProviderAndUserTypeAndUserId(String provider, String userType, Long userId);
}
