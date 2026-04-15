package com.estate.controller.customer;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/contract")
@RequiredArgsConstructor
public class CustomerContractController {
    @GetMapping("/list")
    public String listContracts() {
        return "customer/contract-list";
    }
}
