package com.estate.api.v1.staff;

import com.estate.dto.StaffDashboardDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import com.estate.service.InvoiceService;
import com.estate.service.SaleContractService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/dashboard")
@RequiredArgsConstructor
public class StaffDashboardV1API {
    private final StaffService staffService;
    private final ContractService contractService;
    private final InvoiceService invoiceService;
    private final SaleContractService saleContractService;

    @GetMapping
    public StaffDashboardDTO getDashboard(@AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user.getUserId();
        long leasingCnt = contractService.getContractCnt(userId);
        long saleCnt = saleContractService.countByStaffId(userId);

        return StaffDashboardDTO.of(
                leasingCnt + saleCnt,
                staffService.getCustomertCnt(userId),
                staffService.getBuildingCnt(userId),
                invoiceService.getTotalUnpaidInvoices(userId),
                contractService.getExpiringContracts(userId),
                invoiceService.getOverdueInvoices(userId),
                invoiceService.getExpiringInvoices(userId)
        );
    }
}
