package com.estate.config;

import com.estate.security.jwt.JwtAuthenticationFilter;
import com.estate.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;
import com.estate.security.oauth2.OAuth2LoginSuccessHandler;
import com.estate.security.oauth2.PromptSelectAccountAuthorizationRequestResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;


@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http,
                                    JwtAuthenticationFilter jwtAuthenticationFilter,
                                    HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository,
                                    OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
                                    PromptSelectAccountAuthorizationRequestResolver authorizationRequestResolver) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
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
                        ).permitAll()

                        .requestMatchers("/payment/qr/**").hasRole("CUSTOMER")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers("/staff/**").hasRole("STAFF")
                        .requestMatchers("/customer/**").hasRole("CUSTOMER")

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
                        .authenticationEntryPoint((request, response, authException) -> response.sendRedirect("/login"))
                );

        http.addFilterBefore(jwtAuthenticationFilter,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
