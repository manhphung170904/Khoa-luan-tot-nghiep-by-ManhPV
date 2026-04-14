package com.estate.security.oauth2;

import com.estate.security.CustomUserDetails;
import com.estate.security.jwt.AuthCookieService;
import com.estate.security.jwt.JwtTokenService;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.OAuth2AccountService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Map;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final OAuth2AccountService oAuth2AccountService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final AuthCookieService authCookieService;

    public OAuth2LoginSuccessHandler(OAuth2AccountService oAuth2AccountService,
                                     JwtTokenService jwtTokenService,
                                     RefreshTokenService refreshTokenService,
                                     AuthCookieService authCookieService) {
        this.oAuth2AccountService = oAuth2AccountService;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
        this.authCookieService = authCookieService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            OAuth2AuthenticationToken oauth2Authentication = (OAuth2AuthenticationToken) authentication;
            OAuth2PrincipalInfo principalInfo = extractProfile(oauth2Authentication);
            CustomUserDetails user = resolveTargetUser(request, principalInfo);

            String accessToken = jwtTokenService.generateAccessToken(user);
            String refreshToken = refreshTokenService.issueToken(user);
            authCookieService.setAccessCookie(response, accessToken);
            authCookieService.setRefreshCookie(response, refreshToken);
            authCookieService.clearOAuthLinkCookies(response);

            response.sendRedirect("/login-success?target=" + java.net.URLEncoder.encode(
                    resolveTargetUrl(request, user),
                    StandardCharsets.UTF_8
            ));
        } catch (Exception ex) {
            String errorTarget = resolveErrorTarget(request);
            authCookieService.clearOAuthLinkCookies(response);
            String message = ex.getMessage();
            if (message == null || message.isBlank()) {
                message = "Đăng nhập Google thất bại. Vui lòng thử lại.";
            }
            response.sendRedirect(errorTarget + "?errorMessage=" + java.net.URLEncoder.encode(
                    message,
                    StandardCharsets.UTF_8
            ));
        }
    }

    private CustomUserDetails resolveTargetUser(HttpServletRequest request, OAuth2PrincipalInfo principalInfo) {
        String linkTarget = authCookieService.readOAuthLinkTarget(request);
        if (linkTarget != null && linkTarget.contains(":")) {
            String[] parts = linkTarget.split(":", 2);
            String userType = parts[0];
            Long userId = Long.valueOf(parts[1]);
            return oAuth2AccountService.linkOAuth2User(principalInfo, userType, userId);
        }

        return oAuth2AccountService.resolveOAuth2User(principalInfo);
    }

    private OAuth2PrincipalInfo extractProfile(OAuth2AuthenticationToken authentication) {
        String provider = authentication.getAuthorizedClientRegistrationId();
        Object principal = authentication.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            return new OAuth2PrincipalInfo(
                    provider,
                    firstNonBlank(oidcUser.getSubject(), oidcUser.getName()),
                    oidcUser.getEmail(),
                    oidcUser.getFullName()
            );
        }

        if (principal instanceof OAuth2User oAuth2User) {
            Map<String, Object> attributes = oAuth2User.getAttributes();
            String providerUserId = firstNonBlank(
                    attributes.get("sub"),
                    attributes.get("id"),
                    oAuth2User.getName()
            );
            String email = firstNonBlank(
                    attributes.get("email"),
                    attributes.get("preferred_username")
            );
            String displayName = firstNonBlank(
                    attributes.get("name"),
                    attributes.get("given_name"),
                    attributes.get("login"),
                    email,
                    oAuth2User.getName()
            );
            return new OAuth2PrincipalInfo(provider, providerUserId, email, displayName);
        }

        throw new IllegalStateException("Unsupported OAuth2 principal");
    }

    private String resolveTargetUrl(HttpServletRequest request, CustomUserDetails user) {
        String returnTo = authCookieService.readOAuthLinkReturnTo(request);
        if (returnTo != null && returnTo.startsWith("/")) {
            return returnTo;
        }

        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();
        boolean isCustomer = authorities.stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
        if (isCustomer) {
            return "/customer/home";
        }

        boolean isStaff = authorities.stream()
                .anyMatch(authority -> "ROLE_STAFF".equals(authority.getAuthority()));
        if (isStaff) {
            return "/staff/dashboard";
        }

        return "/admin/dashboard";
    }

    private String resolveErrorTarget(HttpServletRequest request) {
        String returnTo = authCookieService.readOAuthLinkReturnTo(request);
        if (returnTo != null && returnTo.startsWith("/")) {
            return returnTo;
        }
        return "/login";
    }

    private String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value != null) {
                String text = String.valueOf(value).trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }
}
