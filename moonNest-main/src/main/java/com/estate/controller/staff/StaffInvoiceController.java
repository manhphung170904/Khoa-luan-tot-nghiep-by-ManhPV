package com.estate.controller.staff;

import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.InvoiceService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffInvoiceController {
    private final StaffService staffService;
    private final CustomerService customerService;
    private final ContractService contractService;
    private final InvoiceService invoiceService;

    @GetMapping("/invoices")
    public String invoice(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false, defaultValue = "") String status
        ) {
        model.addAttribute("customers", customerService.getCustomersNameByStaff(user.getUserId()));

        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        model.addAttribute("status", status);

        model.addAttribute("contracts", contractService.getActiveContracts());
        model.addAttribute("contractFees", contractService.getContractsFees());

        model.addAttribute("rentAreas", invoiceService.getRentAreaByContract());

        return "staff/invoice-list";
    }
}
