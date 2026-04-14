package com.estate.controller.staff;

import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.CustomerService;
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
public class StaffSaleContractController {
    private final StaffService staffService;
    private final CustomerService customerService;
    private final BuildingService buildingService;

    @GetMapping("/sale-contracts")
    public String saleContractList(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        // Chỉ load khách hàng & tòa nhà mà nhân viên này phụ trách
        model.addAttribute("customers", customerService.getCustomersNameByStaff(user.getUserId()));
        model.addAttribute("buildings", buildingService.getBuildingsNameByStaff(user.getUserId()));

        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        return "staff/sale-contract-list";
    }
}
