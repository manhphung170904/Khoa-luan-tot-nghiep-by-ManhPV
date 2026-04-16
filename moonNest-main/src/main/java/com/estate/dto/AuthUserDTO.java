package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class AuthUserDTO {
    private final Long id;
    private final String username;
    private final String role;
    private final String userType;
    private final String signupSource;
}
