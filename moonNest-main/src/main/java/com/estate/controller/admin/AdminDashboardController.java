package com.estate.controller.admin;

import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminDashboardController {
    private final BuildingService buildingService;
    private final CustomerService customerService;
    private final StaffService staffService;
    private final ContractService contractService;

    @GetMapping("/dashboard")
    public String showDashboard(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("pageTitle", "Trang quản trị hệ thống MoonNest");

        model.addAttribute("totalBuildings", buildingService.countAll());
        model.addAttribute("recentBuildings", buildingService.findRecent());
        Map<String, Long> buildingByDistrict = buildingService.getBuildingCountByDistrict();
        model.addAttribute("districtNames", buildingByDistrict.keySet());
        model.addAttribute("districtCounts", buildingByDistrict.values());

        model.addAttribute("totalCustomers", customerService.countAll());
        model.addAttribute("potentialCustomers", customerService.getTopCustomers());

        model.addAttribute("totalStaffs", staffService.countAllStaffs());

        model.addAttribute("totalContracts", contractService.countAll());

        int currentYear = LocalDate.now().getYear();
        int lastYear = LocalDate.now().minusYears(1).getYear();

        List<BigDecimal> monthlyRevenue = contractService.getMonthlyRevenue(currentYear);
        model.addAttribute("monthlyRevenue", monthlyRevenue);
        model.addAttribute("currentYear", currentYear);

        model.addAttribute("monthlyRevenueLastYear", contractService.getMonthlyRevenue(lastYear));
        model.addAttribute("lastYear", lastYear);

        model.addAttribute("yearlyRevenue", contractService.getYearlyRevenue(currentYear-2, currentYear-1, currentYear));
        model.addAttribute("yearBeforeLast", currentYear-2);
        model.addAttribute("lastYear", currentYear-1);
        model.addAttribute("currentYear", currentYear);

        model.addAttribute("topStaffs", contractService.getTopStaffs());

        Map<String, Long> contractByBuilding = contractService.getContractCountByBuilding();
        model.addAttribute("buildingNames", contractByBuilding.keySet());
        model.addAttribute("buildingContractCounts", contractByBuilding.values());

        Map<Long, Long> contractByYear = contractService.getContractCountByYear();
        model.addAttribute("contractYearLabels", contractByYear.keySet());
        model.addAttribute("contractYearCounts", contractByYear.values());

        Map<Long, Long> saleRate = contractService.getSaleContractRate();
        Long totalForSale = saleRate.keySet().iterator().next();
        Long totalSold = saleRate.values().iterator().next();
        long totalNotSold = totalForSale - totalSold;
        model.addAttribute("totalForSale", totalForSale);
        model.addAttribute("totalSold", totalSold);
        model.addAttribute("totalNotSold", Math.max(totalNotSold, 0));

        model.addAttribute("page", "dashboard");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        return "admin/dashboard";
    }

}
