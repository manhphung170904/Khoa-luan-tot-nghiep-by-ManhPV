package com.estate.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long userId;
    private final String username;
    private final String password;
    private final String role;
    private final String userType;
    private final String signupSource;

    public CustomUserDetails(Long userId, String username, String password, String role, String userType) {
        this(userId, username, password, role, userType, "LOCAL");
    }

    public CustomUserDetails(Long userId,
                             String username,
                             String password,
                             String role,
                             String userType,
                             String signupSource) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.userType = userType;
        this.signupSource = signupSource;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
    @Override public String getPassword()              { return password; }
    @Override public String getUsername()              { return username; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return true; }
    public String getSignupSource()                    { return signupSource; }
}
