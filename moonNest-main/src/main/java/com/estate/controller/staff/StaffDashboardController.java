package com.estate.controller.staff;

import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import com.estate.service.InvoiceService;
import com.estate.service.SaleContractService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffDashboardController {
    private final StaffService staffService;
    private final ContractService contractService;
    private final InvoiceService invoiceService;
    private final SaleContractService saleContractService;

    @GetMapping("/dashboard")
    public String staffDashboard(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
        ) {
        Long userId = user.getUserId();

        Long leasingCnt = contractService.getContractCnt(userId);
        Long saleCnt = saleContractService.countByStaffId(userId);
        model.addAttribute("contractCnt", leasingCnt + saleCnt);
        model.addAttribute("expiringContracts", contractService.getExpiringContracts(userId));

        model.addAttribute("unpaidInvoiceCnt", invoiceService.getTotalUnpaidInvoices(userId));
        model.addAttribute("overdueInvoices", invoiceService.getOverdueInvoices(userId));
        model.addAttribute("expiringInvoices", invoiceService.getExpiringInvoices(userId));

        model.addAttribute("customerCnt", staffService.getCustomertCnt(userId));
        model.addAttribute("buildingCnt", staffService.getBuildingCnt(userId));

        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        return "/staff/dashboard";
    }
}
