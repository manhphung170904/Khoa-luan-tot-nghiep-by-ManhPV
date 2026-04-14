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
@RequestMapping("/customer/invoice")
@RequiredArgsConstructor
public class CustomerInvoiceController {
    private final InvoiceService invoiceService;

    @GetMapping("list")
    public String invoiceList(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long userId = user.getUserId();

        model.addAttribute("totalUnpaidInvoices", invoiceService.getTotalUnpaidInvoicesByCustomer(userId));
        model.addAttribute("detailInvoices", invoiceService.getDetailInvoices(userId));
        model.addAttribute("totalAmountPayable", invoiceService.getTotalAmountPayable(userId));

        return "customer/invoice";
    }
}
