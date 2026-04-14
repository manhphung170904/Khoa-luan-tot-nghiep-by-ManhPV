package com.estate.service;

import com.estate.security.CustomUserDetails;
import com.estate.security.oauth2.OAuth2PrincipalInfo;

public interface OAuth2AccountService {
    CustomUserDetails resolveOAuth2User(OAuth2PrincipalInfo principalInfo);
    CustomUserDetails linkOAuth2User(OAuth2PrincipalInfo principalInfo, String userType, Long userId);
}
