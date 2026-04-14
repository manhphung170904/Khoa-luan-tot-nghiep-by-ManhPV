package com.estate.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class ReportDTO {
    private BigDecimal totalRentRevenueCurrentYear = BigDecimal.ZERO;   // Tổng doanh thu thuê năm hiện tại
    private BigDecimal totalSaleRevenueAllTime = BigDecimal.ZERO;       // Tổng giá trị mua bán đã ký (all-time)
    private Long totalForRentBuildings;               // Số building FOR_RENT
    private Long occupiedForRentBuildings;            // Số building FOR_RENT đang có HĐ ACTIVE
    private Long expiringContractsCount;              // HĐ sắp hết hạn ≤30 ngày
    private List<BigDecimal> monthlyRentRevenue = new ArrayList<>();      // 12 phần tử — chỉ doanh thu thuê
    private List<BigDecimal> monthlySaleRevenue = new ArrayList<>();      // 12 phần tử — doanh thu mua bán (ghi nhận theo tháng ký)
    private List<BigDecimal> monthlyRentLastYear = new ArrayList<>();     // 12 phần tử — thuê năm trước
    private List<BigDecimal> monthlySaleLastYear = new ArrayList<>();     // 12 phần tử — mua bán năm trước
    private List<BigDecimal> yearlyRentRevenue = new ArrayList<>();       // [yearBeforeLast, lastYear, currentYear]
    private List<BigDecimal> yearlySaleRevenue = new ArrayList<>();       // [yearBeforeLast, lastYear, currentYear]
    private int yearBeforeLast;
    private int lastYear;
    private int currentYear;
    private Map<String, Long> buildingByPropertyType; // OFFICE→N, APARTMENT→N, ...
    private Long forRentCount;
    private Long forSaleCount;
    private Long forRentActiveCount;   // FOR_RENT đang có HĐ ACTIVE
    private Long forSaleActiveCount;   // FOR_SALE đã bán
    private List<BuildingRevenueDTO> topBuildingsByRentRevenue = new ArrayList<>();
    private List<ExpiringContractDTO> expiringContracts = new ArrayList<>();
    private List<StaffValueDTO> topStaffsByValue = new ArrayList<>();
    private List<CustomerValueDTO> topCustomersByValue = new ArrayList<>();
    private int cutoffMonth;
    private String cutoffLabel;
}