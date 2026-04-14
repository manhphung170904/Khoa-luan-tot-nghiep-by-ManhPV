package com.estate.security.oauth2;

public record OAuth2PrincipalInfo(
        String provider,
        String providerUserId,
        String email,
        String displayName
) {
}
