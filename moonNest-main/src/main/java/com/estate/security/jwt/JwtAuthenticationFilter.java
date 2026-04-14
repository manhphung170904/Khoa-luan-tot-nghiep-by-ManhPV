package com.estate.security.jwt;

import com.estate.repository.entity.RefreshTokenEntity;
import com.estate.security.CustomUserDetails;
import com.estate.security.CustomUserDetailsService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenService jwtTokenService;
    private final AuthCookieService authCookieService;
    private final CustomUserDetailsService customUserDetailsService;
    private final RefreshTokenService refreshTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService,
                                   AuthCookieService authCookieService,
                                   CustomUserDetailsService customUserDetailsService,
                                   RefreshTokenService refreshTokenService) {
        this.jwtTokenService = jwtTokenService;
        this.authCookieService = authCookieService;
        this.customUserDetailsService = customUserDetailsService;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticateFromCookies(request, response);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateFromCookies(HttpServletRequest request, HttpServletResponse response) {
        String accessToken = authCookieService.readCookie(request, AuthCookieService.ACCESS_COOKIE);
        if (accessToken != null) {
            try {
                JwtUserClaims claims = jwtTokenService.parseAccessToken(accessToken);
                try {
                    setAuthentication(claims.userType(), claims.userId(), request);
                    if (SecurityContextHolder.getContext().getAuthentication() != null) {
                        return;
                    }
                } catch (RuntimeException ignored) {
                    // Fall through to refresh token handling.
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                // Fall through to refresh token handling.
            }
        }

        String refreshToken = authCookieService.readCookie(request, AuthCookieService.REFRESH_COOKIE);
        if (refreshToken == null) {
            return;
        }

        Optional<RefreshTokenEntity> tokenEntity = refreshTokenService.findActiveByRawToken(refreshToken);
        if (tokenEntity.isEmpty()) {
            authCookieService.clearAuthCookies(response);
            return;
        }

        RefreshTokenEntity token = tokenEntity.get();
        try {
            setAuthentication(token.getUserType(), token.getUserId(), request);

            CustomUserDetails user = (CustomUserDetails) SecurityContextHolder.getContext()
                    .getAuthentication()
                    .getPrincipal();
            String newAccessToken = jwtTokenService.generateAccessToken(user);
            authCookieService.setAccessCookie(response, newAccessToken);
        } catch (RuntimeException ex) {
            authCookieService.clearAuthCookies(response);
        }
    }

    private void setAuthentication(String userType, Long userId, HttpServletRequest request) {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return;
        }

        CustomUserDetails user = customUserDetailsService.loadUserById(userType, userId);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
