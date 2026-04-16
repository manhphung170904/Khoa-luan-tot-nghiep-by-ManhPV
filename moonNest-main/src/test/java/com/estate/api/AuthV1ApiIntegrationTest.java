package com.estate.api;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthV1ApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginAndMeShouldWorkWithCookieBasedApiSession() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "api_admin",
                                  "password": "12345678"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("estate_access_token"))
                .andExpect(cookie().exists("estate_refresh_token"))
                .andExpect(jsonPath("$.data.user.username").value("api_admin"))
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andReturn();

        Cookie[] cookies = loginResult.getResponse().getCookies();

        mockMvc.perform(get("/api/v1/auth/me").cookie(cookies))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("api_admin"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void logoutShouldClearAuthCookies() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "api_customer",
                                  "password": "12345678"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        mockMvc.perform(post("/api/v1/auth/logout").cookie(loginResult.getResponse().getCookies()))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("estate_access_token", 0))
                .andExpect(cookie().maxAge("estate_refresh_token", 0))
                .andExpect(jsonPath("$.message").value("Logout successful."));
    }
}
