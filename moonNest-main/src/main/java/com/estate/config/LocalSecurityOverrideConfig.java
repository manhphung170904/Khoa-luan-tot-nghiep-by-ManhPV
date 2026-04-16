package com.estate.config;

import com.estate.api.common.ApiErrorResponses;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.estate.security.jwt.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

@Configuration
@Profile("local-nooauth")
public class LocalSecurityOverrideConfig {
    private static final String[] PUBLIC_PATHS = {
            "/moonnest",
            "/moonnest/**",
            "/css/**",
            "/images/**",
            "/js/**",
            "/login",
            "/register",
            "/register/**",
            "/forgot-password",
            "/api/v1/auth/login",
            "/api/v1/auth/forgot-password",
            "/api/v1/public/**",
            "/auth/reset-password",
            "/auth/register/send-code",
            "/auth/register/verify",
            "/auth/register/complete",
            "/auth/register/**",
            "/auth/logout",
            "/logout",
            "/login-success",
            "/oauth2/**",
            "/login/oauth2/**"
    };

    @Bean("filterChain")
    SecurityFilterChain localFilterChain(HttpSecurity http,
                                         JwtAuthenticationFilter jwtAuthenticationFilter,
                                         ObjectMapper objectMapper) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .requestMatchers("/payment-demo/**").hasRole("CUSTOMER")
                        .requestMatchers("/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/staff/**", "/api/v1/staff/**").hasRole("STAFF")
                        .requestMatchers("/customer/**", "/api/v1/customer/**").hasRole("CUSTOMER")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            if (isApiRequest(request)) {
                                apiAuthenticationEntryPoint(objectMapper).commence(request, response, authException);
                                return;
                            }

                            response.sendRedirect("/login");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            if (isApiRequest(request)) {
                                writeApiError(response, objectMapper, HttpStatus.FORBIDDEN, request.getRequestURI());
                                return;
                            }

                            response.sendRedirect("/login");
                        })
                );

        http.addFilterBefore(jwtAuthenticationFilter,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private AuthenticationEntryPoint apiAuthenticationEntryPoint(ObjectMapper objectMapper) {
        return (request, response, authException) -> writeApiError(
                response,
                objectMapper,
                HttpStatus.UNAUTHORIZED,
                request.getRequestURI()
        );
    }

    private boolean isApiRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();

        if (uri.startsWith("/api/v1/")) {
            return true;
        }

        if (uri.startsWith("/staff/") || uri.startsWith("/customer/")) {
            return expectsJson(request) || isAjaxRequest(request);
        }

        return false;
    }

    private boolean expectsJson(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return StringUtils.hasText(accept)
                && (accept.contains(MediaType.APPLICATION_JSON_VALUE)
                || accept.contains(MediaType.ALL_VALUE));
    }

    private boolean isAjaxRequest(HttpServletRequest request) {
        String requestedWith = request.getHeader("X-Requested-With");
        return "XMLHttpRequest".equalsIgnoreCase(requestedWith);
    }

    private void writeApiError(jakarta.servlet.http.HttpServletResponse response,
                               ObjectMapper objectMapper,
                               HttpStatus status,
                               String path) throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getWriter(),
                ApiErrorResponses.of(status == HttpStatus.UNAUTHORIZED ? "UNAUTHORIZED" : "FORBIDDEN",
                        status == HttpStatus.UNAUTHORIZED ? "Unauthorized" : "Forbidden",
                        status,
                        path)
        );
    }
}
