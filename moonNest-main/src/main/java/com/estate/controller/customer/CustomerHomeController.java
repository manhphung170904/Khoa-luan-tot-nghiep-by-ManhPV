package com.estate.controller.customer;

import com.estate.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/home")
@RequiredArgsConstructor
public class CustomerHomeController {
    @GetMapping("")
    public String homePage(
            HttpServletResponse response,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setDateHeader("Expires", 0);

        return "customer/home";
    }
}
