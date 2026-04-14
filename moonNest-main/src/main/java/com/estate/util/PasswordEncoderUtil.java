package com.estate.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordEncoderUtil {

    public static void main(String[] args) {

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String rawPassword = "12345678";
        String encoded = encoder.encode(rawPassword);

        System.out.println("Raw password   : " + rawPassword);
        System.out.println("Encoded result : " + encoded);
    }
}
