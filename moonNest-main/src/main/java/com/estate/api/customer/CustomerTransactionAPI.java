package com.estate.api.customer;

import com.estate.dto.InvoiceDetailDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customer/transaction")
@RequiredArgsConstructor
public class CustomerTransactionAPI {
    private final InvoiceService invoiceService;

    @GetMapping("/list/page")
    public Page<InvoiceDetailDTO> getBuildingsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long customerId = user.getUserId();

        return invoiceService.getInvoices(page - 1, size, month, year, customerId);
    }
}
