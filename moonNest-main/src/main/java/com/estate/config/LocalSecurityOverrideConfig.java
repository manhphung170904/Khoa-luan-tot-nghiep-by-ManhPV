package com.estate.config;

import com.estate.security.jwt.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@Profile("local-nooauth")
public class LocalSecurityOverrideConfig {
    @Bean("filterChain")
    SecurityFilterChain localFilterChain(HttpSecurity http,
                                         JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {

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
                                "/login/oauth2/**",
                                "/payment/**"
                        ).permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers("/staff/**").hasRole("STAFF")
                        .requestMatchers("/customer/**").hasRole("CUSTOMER")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> response.sendRedirect("/login"))
                );

        http.addFilterBefore(jwtAuthenticationFilter,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
