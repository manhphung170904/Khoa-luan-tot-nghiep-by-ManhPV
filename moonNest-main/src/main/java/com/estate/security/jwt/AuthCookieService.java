package com.estate.security.jwt;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import java.time.Duration;

@Component
public class AuthCookieService {
    public static final String ACCESS_COOKIE = "estate_access_token";
    public static final String REFRESH_COOKIE = "estate_refresh_token";
    public static final String SESSION_COOKIE = "JSESSIONID";
    public static final String OAUTH_LINK_TARGET_COOKIE = "estate_oauth_link_target";
    public static final String OAUTH_LINK_RETURN_TO_COOKIE = "estate_oauth_link_return_to";

    private final JwtProperties jwtProperties;

    public AuthCookieService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public String readCookie(HttpServletRequest request, String name) {
        Cookie cookie = WebUtils.getCookie(request, name);
        return cookie != null ? cookie.getValue() : null;
    }

    public void setAccessCookie(HttpServletResponse response, String token) {
        addCookie(response, ACCESS_COOKIE, token, jwtProperties.getAccessTokenExpiration());
    }

    public void setRefreshCookie(HttpServletResponse response, String token) {
        addCookie(response, REFRESH_COOKIE, token, jwtProperties.getRefreshTokenExpiration());
    }

    public void clearAccessCookie(HttpServletResponse response) {
        clearCookie(response, ACCESS_COOKIE);
    }

    public void clearRefreshCookie(HttpServletResponse response) {
        clearCookie(response, REFRESH_COOKIE);
    }

    public void clearAuthCookies(HttpServletResponse response) {
        clearAccessCookie(response);
        clearRefreshCookie(response);
        clearSessionCookie(response);
    }

    public void setOAuthLinkTargetCookie(HttpServletResponse response, String value) {
        addCookie(response, OAUTH_LINK_TARGET_COOKIE, value, Duration.ofMinutes(10));
    }

    public void setOAuthLinkReturnToCookie(HttpServletResponse response, String value) {
        addCookie(response, OAUTH_LINK_RETURN_TO_COOKIE, value, Duration.ofMinutes(10));
    }

    public String readOAuthLinkTarget(HttpServletRequest request) {
        return readCookie(request, OAUTH_LINK_TARGET_COOKIE);
    }

    public String readOAuthLinkReturnTo(HttpServletRequest request) {
        return readCookie(request, OAUTH_LINK_RETURN_TO_COOKIE);
    }

    public void clearOAuthLinkCookies(HttpServletResponse response) {
        clearCookie(response, OAUTH_LINK_TARGET_COOKIE);
        clearCookie(response, OAUTH_LINK_RETURN_TO_COOKIE);
    }

    private void addCookie(HttpServletResponse response, String name, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearCookie(HttpServletResponse response, String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearSessionCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE, "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
