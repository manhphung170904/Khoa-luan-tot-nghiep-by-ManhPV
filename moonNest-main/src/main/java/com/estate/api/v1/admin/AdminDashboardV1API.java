package com.estate.api.v1.admin;

import com.estate.dto.AdminDashboardDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardV1API {
    private final BuildingService buildingService;
    private final CustomerService customerService;
    private final StaffService staffService;
    private final ContractService contractService;

    @GetMapping
    public AdminDashboardDTO getDashboard(@AuthenticationPrincipal CustomUserDetails user) {
        int currentYear = LocalDate.now().getYear();
        int previousYear = currentYear - 1;
        int yearBeforeLast = currentYear - 2;

        Map<String, Long> buildingByDistrict = buildingService.getBuildingCountByDistrict();
        Map<String, Long> contractByBuilding = contractService.getContractCountByBuilding();
        Map<Long, Long> contractByYear = contractService.getContractCountByYear();
        Map<Long, Long> saleRate = contractService.getSaleContractRate();

        long totalForSale = saleRate.keySet().stream().findFirst().orElse(0L);
        long totalSold = saleRate.values().stream().findFirst().orElse(0L);

        return AdminDashboardDTO.of(
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                buildingService.countAll(),
                customerService.countAll(),
                staffService.countAllStaffs(),
                contractService.countAll(),
                currentYear,
                previousYear,
                yearBeforeLast,
                contractService.getMonthlyRevenue(currentYear),
                contractService.getMonthlyRevenue(previousYear),
                contractService.getYearlyRevenue(yearBeforeLast, previousYear, currentYear),
                new ArrayList<>(buildingByDistrict.keySet()),
                new ArrayList<>(buildingByDistrict.values()),
                new ArrayList<>(contractByBuilding.keySet()),
                new ArrayList<>(contractByBuilding.values()),
                new ArrayList<>(contractByYear.keySet()),
                new ArrayList<>(contractByYear.values()),
                totalForSale,
                totalSold,
                Math.max(totalForSale - totalSold, 0L),
                customerService.getTopCustomers(),
                contractService.getTopStaffs(),
                buildingService.findRecent()
        );
    }
}
