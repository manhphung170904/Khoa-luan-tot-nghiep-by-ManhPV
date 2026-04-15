package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class AdminDashboardDTO {
    private final String updatedAt;
    private final long totalBuildings;
    private final long totalCustomers;
    private final long totalStaffs;
    private final long totalContracts;
    private final int currentYear;
    private final int lastYear;
    private final int yearBeforeLast;
    private final List<BigDecimal> monthlyRevenue;
    private final List<BigDecimal> monthlyRevenueLastYear;
    private final List<BigDecimal> yearlyRevenue;
    private final List<String> districtNames;
    private final List<Long> districtCounts;
    private final List<String> buildingNames;
    private final List<Long> buildingContractCounts;
    private final List<Long> contractYearLabels;
    private final List<Long> contractYearCounts;
    private final long totalForSale;
    private final long totalSold;
    private final long totalNotSold;
    private final List<PotentialCustomersDTO> potentialCustomers;
    private final List<StaffPerformanceDTO> topStaffs;
    private final List<BuildingListDTO> recentBuildings;
}
