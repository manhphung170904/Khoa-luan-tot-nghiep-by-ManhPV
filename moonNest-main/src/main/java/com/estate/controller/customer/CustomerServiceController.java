package com.estate.controller.customer;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/service")
public class CustomerServiceController {
    @GetMapping("")
    public String servicePage() {
        return "/customer/service";
    }
}
