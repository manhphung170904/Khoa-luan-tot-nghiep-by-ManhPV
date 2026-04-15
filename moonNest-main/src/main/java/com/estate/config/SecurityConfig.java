package com.estate.config;

import com.estate.api.common.ApiErrorResponses;
import com.estate.api.common.ApiPaths;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.estate.security.jwt.JwtAuthenticationFilter;
import com.estate.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;
import com.estate.security.oauth2.OAuth2LoginSuccessHandler;
import com.estate.security.oauth2.PromptSelectAccountAuthorizationRequestResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;


@Configuration
public class SecurityConfig {
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
            "/api/auth/forgot-password",
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

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http,
                                    JwtAuthenticationFilter jwtAuthenticationFilter,
                                    HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository,
                                    OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
                                    PromptSelectAccountAuthorizationRequestResolver authorizationRequestResolver,
                                    ObjectMapper objectMapper) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()

                        .requestMatchers("/payment/qr/**").hasRole("CUSTOMER")
                        .requestMatchers("/admin/**", "/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/staff/**", "/api/v1/staff/**").hasRole("STAFF")
                        .requestMatchers("/customer/**", "/api/customer/**", "/api/v1/customer/**").hasRole("CUSTOMER")

                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .authorizationEndpoint(authorization -> authorization
                                .authorizationRequestResolver(authorizationRequestResolver)
                                .authorizationRequestRepository(authorizationRequestRepository)
                        )
                        .successHandler(oAuth2LoginSuccessHandler)
                        .failureHandler((request, response, exception) -> {
                            String message = exception.getMessage();
                            if (message == null || message.isBlank()) {
                                message = "Đăng nhập Google thất bại. Vui lòng thử lại.";
                            }
                            response.sendRedirect("/login?errorMessage=" + URLEncoder.encode(
                                    message,
                                    StandardCharsets.UTF_8
                            ));
                        })
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
                                writeApiError(
                                        response,
                                        objectMapper,
                                        HttpStatus.FORBIDDEN,
                                        ApiErrorResponses.of("FORBIDDEN", "Forbidden", request.getRequestURI())
                                );
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
        return (request, response, authException) -> {
            writeApiError(
                    response,
                    objectMapper,
                    HttpStatus.UNAUTHORIZED,
                    ApiErrorResponses.of("UNAUTHORIZED", "Unauthorized", request.getRequestURI())
            );
        };
    }

    private boolean isApiRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();

        if (ApiPaths.isApiRequestPath(uri)) {
            return true;
        }

        if (uri.startsWith("/staff/") || uri.startsWith("/customer/")) {
            return expectsJson(request) || isAjaxRequest(request);
        }

        return false;
    }

    private void writeApiError(HttpServletResponse response,
                               ObjectMapper objectMapper,
                               HttpStatus status,
                               Object body) throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), body);
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
}
