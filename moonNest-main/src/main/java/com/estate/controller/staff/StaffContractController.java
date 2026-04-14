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
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Map;

@Controller
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffContractController {
    private final StaffService staffService;
    private final CustomerService customerService;
    private final BuildingService buildingService;

    @GetMapping("/contracts")
    public String contract(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam Map<String, String> params
    ) {
        model.addAttribute("customers", customerService.getCustomersNameByStaff(user.getUserId()));

        model.addAttribute("buildings", buildingService.getBuildingsNameByStaff(user.getUserId()));

        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        if (params.get("status") != null) {
            model.addAttribute("status", params.get("status"));
            model.addAttribute("endDate", LocalDate.now().plusMonths(1).withDayOfMonth(1));
        }

        return "staff/contract-list";
    }
}
