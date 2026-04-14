package com.estate.controller.customer;

import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/transaction")
@RequiredArgsConstructor
public class CustomerTransactionController {
    private final InvoiceService invoiceService;

    @GetMapping("history")
    public String transactionHistory(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long userId = user.getUserId();

        model.addAttribute("totalTransaction", invoiceService.getTotalPaidInvoice(userId));
        model.addAttribute("totalPaidAmount", invoiceService.findTotalAmountByCustomerId(userId));

        return "customer/transaction-history";
    }
}
