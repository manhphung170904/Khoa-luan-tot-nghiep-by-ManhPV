package com.estate.controller.customer;

import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/contract")
@RequiredArgsConstructor
public class CustomerContractController {
    private final ContractService contractService;
    private final BuildingService buildingService;

    @GetMapping("/list")
    public String listContracts (
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long customerId = user.getUserId();

        model.addAttribute("totalContracts", contractService.getContractCountByCustomer(customerId));
        model.addAttribute("activeContracts", contractService.getActiveContractsCount(customerId));
        model.addAttribute("expiredContracts", contractService.getExpiredContractsCount(customerId));

        model.addAttribute("buildings", buildingService.getBuildingsName());

        return "customer/contract-list";
    }
}
