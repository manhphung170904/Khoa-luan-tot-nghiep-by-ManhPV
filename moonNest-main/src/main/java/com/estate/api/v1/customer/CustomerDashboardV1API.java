package com.estate.api.v1.customer;

import com.estate.dto.ContractDetailDTO;
import com.estate.dto.CustomerHomeDashboardDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.InvoiceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/customer/dashboard")
@RequiredArgsConstructor
public class CustomerDashboardV1API {
    private final ContractService contractService;
    private final InvoiceService invoiceService;
    private final CustomerService customerService;

    @GetMapping
    public CustomerHomeDashboardDTO getDashboard(
            @AuthenticationPrincipal CustomUserDetails user,
            HttpServletRequest request
    ) {
        Long userId = user.getUserId();
        List<ContractDetailDTO> contracts = customerService.getCustomerContracts(userId);

        return CustomerHomeDashboardDTO.of(
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")),
                request.getRemoteAddr(),
                contractService.getContractCountByCustomer(userId),
                invoiceService.findTotalAmountByCustomerId(userId),
                invoiceService.getTotalUnpaidInvoicesByCustomer(userId),
                invoiceService.getDetailInvoice(userId),
                contracts
        );
    }
}
