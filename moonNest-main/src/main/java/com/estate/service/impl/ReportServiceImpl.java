package com.estate.service.impl;

import com.estate.dto.*;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.enums.TransactionType;
import com.estate.repository.*;
import com.estate.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportServiceImpl implements ReportService {

    @Autowired
    private ContractRepository contractRepository;
    @Autowired
    private SaleContractRepository saleContractRepository;
    @Autowired
    private BuildingRepository buildingRepository;

    private static final int EXPIRY_WARNING_DAYS = 30;
    private static final int TOP_N = 5;

    @Override
    public ReportDTO getReport(int year) {
        ReportDTO dto = new ReportDTO();

        int currentRealYear = LocalDate.now().getYear();
        int currentRealMonth = LocalDate.now().getMonthValue();

        dto.setCurrentYear(year);
        dto.setLastYear(year - 1);
        dto.setYearBeforeLast(year - 2);

        // ── cutoffMonth & cutoffLabel ─────────────────────────────────────────
        final int cutoffMonth = (year == currentRealYear) ? currentRealMonth - 1 : 12;
        dto.setCutoffMonth(cutoffMonth);
        if (cutoffMonth == 0) {
            dto.setCutoffLabel("Chưa có dữ liệu (tháng 1/" + year + ")");
        } else {
            dto.setCutoffLabel("Tích lũy đến hết T" + cutoffMonth + "/" + year);
        }

        // ── Load data 1 lần, dùng chung cho toàn bộ ──────────────────────────
        List<SaleContractEntity> allSaleContracts = saleContractRepository.findAll();
        List<ContractEntity> allContracts = contractRepository.findAll();

        // ── 1. Monthly rent revenue (12 tháng năm year) ──────────────────────
        List<BigDecimal> monthlyRent = calcMonthlyRentRevenue(year, cutoffMonth, allContracts);
        dto.setMonthlyRentRevenue(monthlyRent);

        // ── 2. Monthly sale revenue ───────────────────────────────────────────
        List<BigDecimal> monthlySale = calcMonthlySaleRevenue(year, allSaleContracts);
        dto.setMonthlySaleRevenue(monthlySale);

        // ── 3. Dữ liệu năm trước để tính tăng trưởng ────────────────────────
        // Năm trước luôn lấy đủ 12 tháng (đã là quá khứ)
        List<BigDecimal> monthlyRentLastYear = calcMonthlyRentRevenue(year - 1, 12, allContracts);
        List<BigDecimal> monthlySaleLastYear = calcMonthlySaleRevenue(year - 1, allSaleContracts);
        dto.setMonthlyRentLastYear(monthlyRentLastYear);
        dto.setMonthlySaleLastYear(monthlySaleLastYear);

        // ── 4. KPI: Tổng doanh thu thuê — tích lũy đến cutoffMonth của year ──
        BigDecimal totalRent = monthlyRent.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalRentRevenueCurrentYear(totalRent);

        // ── 5. KPI: Tổng giá trị mua bán — theo year (đến cutoffMonth) ───────
        BigDecimal totalSale = allSaleContracts.stream()
                .filter(sc -> sc.getCreatedDate() != null && sc.getSalePrice() != null)
                .filter(sc -> {
                    int y = sc.getCreatedDate().getYear();
                    int m = sc.getCreatedDate().getMonthValue();
                    if (y < year) return true;              // các năm trước year
                    if (y == year) return m <= cutoffMonth; // năm year: đến cutoffMonth
                    return false;
                })
                .map(SaleContractEntity::getSalePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalSaleRevenueAllTime(totalSale);

        // ── 6. KPI: Tỷ lệ lấp đầy FOR_RENT — theo year ──────────────────────
        long totalForRent = buildingRepository.countByTransactionType(TransactionType.FOR_RENT);
        long occupied = calcOccupiedForRent(year, cutoffMonth, allContracts);
        dto.setTotalForRentBuildings(totalForRent);
        dto.setOccupiedForRentBuildings(occupied);

        // ── 7. KPI: HĐ sắp hết hạn ≤30 ngày (chỉ có ý nghĩa với năm hiện tại)
        List<ContractEntity> expiringList = Collections.emptyList();
        long expiringCount = 0L;
        if (year == currentRealYear) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime in30 = now.plusDays(EXPIRY_WARNING_DAYS);
            List<ContractEntity> expiring = contractRepository
                    .findByStatusAndEndDateBetween("ACTIVE", now, in30);
            expiringCount = expiring.size();
            expiringList = expiring.stream()
                    .sorted(Comparator.comparing(ContractEntity::getEndDate))
                    .collect(Collectors.toList());
        }
        dto.setExpiringContractsCount(expiringCount);

        // ── 8. Yearly revenue (3 năm) ────────────────────────────────────────
        dto.setYearlyRentRevenue(calcYearlyRent(year - 2, year - 1, year,
                currentRealYear, currentRealMonth, allContracts));
        dto.setYearlySaleRevenue(calcYearlySale(year - 2, year - 1, year, allSaleContracts));

        // ── 9. Phân bổ BĐS theo loại hình ────────────────────────────────────
        Map<String, Long> byType = buildingRepository.countGroupByPropertyType()
                .stream()
                .collect(Collectors.toMap(
                        arr -> arr[0].toString(),
                        arr -> (Long) arr[1],
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
        dto.setBuildingByPropertyType(byType);

        long forRentCount = buildingRepository.countByTransactionType(TransactionType.FOR_RENT);
        long forSaleCount = buildingRepository.countByTransactionType(TransactionType.FOR_SALE);
        // Số BĐS mua bán đã có hợp đồng tính đến cutoffMonth của year
        long forSaleActive = allSaleContracts.stream()
                .filter(sc -> sc.getCreatedDate() != null)
                .filter(sc -> {
                    int y = sc.getCreatedDate().getYear();
                    int m = sc.getCreatedDate().getMonthValue();
                    if (y < year) return true;
                    if (y == year) return m <= cutoffMonth;
                    return false;
                })
                .count();
        dto.setForRentCount(forRentCount);
        dto.setForSaleCount(forSaleCount);
        dto.setForRentActiveCount(occupied);
        dto.setForSaleActiveCount(forSaleActive);

        // ── 10. Top 5 building doanh thu thuê ────────────────────────────────
        dto.setTopBuildingsByRentRevenue(calcTopBuildingRevenue(year, cutoffMonth, allContracts));

        // ── 11. HĐ sắp hết hạn — table ───────────────────────────────────────
        LocalDateTime now = LocalDateTime.now();
        List<ExpiringContractDTO> expiringDtoList = expiringList.stream()
                .map(c -> new ExpiringContractDTO(
                        c.getId(),
                        c.getBuilding() != null ? c.getBuilding().getName() : "—",
                        c.getCustomer() != null ? c.getCustomer().getFullName() : "—",
                        c.getEndDate(),
                        ChronoUnit.DAYS.between(now, c.getEndDate())
                ))
                .collect(Collectors.toList());
        dto.setExpiringContracts(expiringDtoList);

        // ── 12. Top 5 nhân viên theo tổng giá trị trong year ─────────────────
        dto.setTopStaffsByValue(calcTopStaff(year, cutoffMonth, allContracts, allSaleContracts));

        // ── 13. Top 5 khách hàng theo tổng giá trị trong year ────────────────
        dto.setTopCustomersByValue(calcTopCustomer(year, cutoffMonth, allContracts, allSaleContracts));

        return dto;
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private boolean isValidContract(ContractEntity c,
                                    LocalDateTime startOfYear,
                                    LocalDateTime endOfYear) {

        return c != null
                && c.getBuilding() != null
                && c.getRentPrice() != null
                && c.getRentArea() != null
                && c.getStartDate() != null
                && c.getEndDate() != null
                && !c.getStartDate().isAfter(endOfYear)
                && !c.getEndDate().isBefore(startOfYear);
    }

    private BigDecimal calculateRevenue(ContractEntity c,
                                        int targetYear,
                                        int cutoffMonth) {

        BigDecimal monthly = c.getRentPrice()
                .multiply(BigDecimal.valueOf(c.getRentArea()));

        int startMonth = (c.getStartDate().getYear() < targetYear)
                ? 1 : c.getStartDate().getMonthValue();

        int endMonth = (c.getEndDate().getYear() > targetYear)
                ? 12 : c.getEndDate().getMonthValue();

        startMonth = Math.max(1, startMonth);
        endMonth = Math.min(cutoffMonth, endMonth);

        if (startMonth > endMonth) {
            return BigDecimal.ZERO;
        }

        int months = endMonth - startMonth + 1;
        return monthly.multiply(BigDecimal.valueOf(months));
    }

    private Map<String, String> buildTaxCodeMap(List<ContractEntity> contracts) {
        return contracts.stream()
                .filter(c -> c.getBuilding() != null)
                .collect(Collectors.toMap(
                        c -> c.getBuilding().getName(),
                        c -> c.getBuilding().getTaxCode(),
                        (existing, replacement) -> existing // tránh duplicate key crash
                ));
    }

    /**
     * Doanh thu thuê theo tháng trong năm targetYear, chỉ tính đến cutoffMonth.
     * cutoffMonth = 0 → trả về list toàn 0 (chưa có tháng hoàn chỉnh nào).
     */
    private List<BigDecimal> calcMonthlyRentRevenue(int targetYear, int cutoffMonth,
                                                    List<ContractEntity> allContracts) {
        List<BigDecimal> revenue = new ArrayList<>(Collections.nCopies(12, BigDecimal.ZERO));
        if (cutoffMonth <= 0) return revenue;

        LocalDateTime startOfYear = LocalDateTime.of(targetYear, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(targetYear, 12, 31, 23, 59);

        for (ContractEntity c : allContracts) {
            if (c.getRentPrice() == null || c.getRentArea() == null) continue;
            if (c.getStartDate().isAfter(endOfYear)) continue;
            if (c.getEndDate().isBefore(startOfYear)) continue;

            BigDecimal monthlyValue = c.getRentPrice().multiply(BigDecimal.valueOf(c.getRentArea()));

            int startMonth = c.getStartDate().getYear() < targetYear ? 1 : c.getStartDate().getMonthValue();
            int endMonth = c.getEndDate().getYear() > targetYear ? 12 : c.getEndDate().getMonthValue();
            startMonth = Math.max(1, startMonth);
            endMonth = Math.min(cutoffMonth, endMonth); // cắt tại cutoffMonth

            if (startMonth > endMonth) continue;
            for (int m = startMonth; m <= endMonth; m++) {
                revenue.set(m - 1, revenue.get(m - 1).add(monthlyValue));
            }
        }
        return revenue;
    }

    /**
     * Doanh thu mua bán ghi nhận vào tháng created_date của sale_contract trong targetYear.
     */
    private List<BigDecimal> calcMonthlySaleRevenue(int targetYear,
                                                    List<SaleContractEntity> allSaleContracts) {
        List<BigDecimal> revenue = new ArrayList<>(Collections.nCopies(12, BigDecimal.ZERO));
        for (SaleContractEntity sc : allSaleContracts) {
            if (sc.getCreatedDate() == null || sc.getSalePrice() == null) continue;
            if (sc.getCreatedDate().getYear() != targetYear) continue;
            int month = sc.getCreatedDate().getMonthValue();
            revenue.set(month - 1, revenue.get(month - 1).add(sc.getSalePrice()));
        }
        return revenue;
    }

    /**
     * Tính số building FOR_RENT có hợp đồng ACTIVE tại thời điểm cuối cutoffMonth của targetYear.
     * Nếu cutoffMonth = 0 → trả về 0.
     */
    private long calcOccupiedForRent(int targetYear, int cutoffMonth,
                                     List<ContractEntity> allContracts) {
        if (cutoffMonth <= 0) return 0L;
        // Thời điểm tham chiếu: cuối ngày cuối tháng cutoffMonth
        LocalDateTime refPoint = LocalDateTime.of(targetYear, cutoffMonth,
                LocalDate.of(targetYear, cutoffMonth, 1).lengthOfMonth(), 23, 59);
        return allContracts.stream()
                .filter(c -> c.getBuilding() != null
                        && c.getStartDate() != null
                        && c.getEndDate() != null
                        && !c.getStartDate().isAfter(refPoint)
                        && !c.getEndDate().isBefore(refPoint))
                .map(c -> c.getBuilding().getId())
                .distinct()
                .count();
    }

    private List<BigDecimal> calcYearlyRent(int y1, int y2, int y3,
                                            int currentRealYear, int currentRealMonth,
                                            List<ContractEntity> allContracts) {
        List<BigDecimal> result = new ArrayList<>();
        for (int y : new int[]{y1, y2, y3}) {
            int cut = (y == currentRealYear) ? currentRealMonth - 1 : 12;
            result.add(calcMonthlyRentRevenue(y, cut, allContracts)
                    .stream().reduce(BigDecimal.ZERO, BigDecimal::add));
        }
        return result;
    }

    private List<BigDecimal> calcYearlySale(int y1, int y2, int y3,
                                            List<SaleContractEntity> allSaleContracts) {
        Map<Integer, BigDecimal> byYear = new HashMap<>();
        for (SaleContractEntity sc : allSaleContracts) {
            if (sc.getCreatedDate() == null || sc.getSalePrice() == null) continue;
            byYear.merge(sc.getCreatedDate().getYear(), sc.getSalePrice(), BigDecimal::add);
        }
        List<BigDecimal> result = new ArrayList<>();
        for (int y : new int[]{y1, y2, y3}) {
            result.add(byYear.getOrDefault(y, BigDecimal.ZERO));
        }
        return result;
    }

    /**
     * Top 5 building theo tổng doanh thu thuê trong targetYear đến cutoffMonth.
     */
    private List<BuildingRevenueDTO> calcTopBuildingRevenue(
            int targetYear,
            int cutoffMonth,
            List<ContractEntity> allContracts) {

        if (cutoffMonth <= 0 || allContracts == null || allContracts.isEmpty()) {
            return Collections.emptyList();
        }

        LocalDateTime startOfYear = LocalDateTime.of(targetYear, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(targetYear, 12, 31, 23, 59);

        // Map: buildingName -> taxCode (O(n))
        Map<String, String> taxCodeMap = buildTaxCodeMap(allContracts);

        // Map: buildingName -> totalRevenue
        Map<String, BigDecimal> revenueMap = new HashMap<>();

        for (ContractEntity c : allContracts) {
            if (!isValidContract(c, startOfYear, endOfYear)) continue;

            String buildingName = c.getBuilding().getName();
            BigDecimal revenue = calculateRevenue(c, targetYear, cutoffMonth);

            if (revenue.compareTo(BigDecimal.ZERO) > 0) {
                revenueMap.merge(buildingName, revenue, BigDecimal::add);
            }
        }

        return revenueMap.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(TOP_N)
                .map(e -> new BuildingRevenueDTO(
                        e.getKey(),
                        e.getValue(),
                        taxCodeMap.get(e.getKey())
                ))
                .collect(Collectors.toList());
    }

    /**
     * Top 5 nhân viên theo tổng giá trị trong targetYear đến cutoffMonth:
     * - Thuê: tổng rentPrice × rentArea × số tháng active trong [1..cutoffMonth] của targetYear
     * - Mua bán: tổng salePrice của sale_contract trong [targetYear-1-01-01 .. targetYear-cutoffMonth]
     * (tính lũy kế đến cutoffMonth của targetYear để nhất quán với totalSale KPI)
     */
    private List<StaffValueDTO> calcTopStaff(int targetYear, int cutoffMonth,
                                             List<ContractEntity> allContracts,
                                             List<SaleContractEntity> allSaleContracts) {
        // Doanh thu thuê trong targetYear
        Map<Long, BigDecimal> rentByStaff = new HashMap<>();
        Map<Long, String> staffNames = new HashMap<>();

        LocalDateTime startOfYear = LocalDateTime.of(targetYear, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(targetYear, 12, 31, 23, 59);

        for (ContractEntity c : allContracts) {
            if (c.getStaff() == null || c.getRentPrice() == null || c.getRentArea() == null) continue;
            if (c.getStartDate().isAfter(endOfYear) || c.getEndDate().isBefore(startOfYear)) continue;

            Long staffId = c.getStaff().getId();
            staffNames.put(staffId, c.getStaff().getFullName());

            BigDecimal monthly = c.getRentPrice().multiply(BigDecimal.valueOf(c.getRentArea()));
            int startMonth = c.getStartDate().getYear() < targetYear ? 1 : c.getStartDate().getMonthValue();
            int endMonth = c.getEndDate().getYear() > targetYear ? 12 : c.getEndDate().getMonthValue();
            startMonth = Math.max(1, startMonth);
            endMonth = Math.min(cutoffMonth, endMonth);
            if (startMonth > endMonth) continue;

            BigDecimal total = monthly.multiply(BigDecimal.valueOf(endMonth - startMonth + 1));
            rentByStaff.merge(staffId, total, BigDecimal::add);
        }

        // Doanh thu mua bán lũy kế đến cutoffMonth của targetYear
        Map<Long, BigDecimal> saleByStaff = new HashMap<>();
        for (SaleContractEntity sc : allSaleContracts) {
            if (sc.getStaff() == null || sc.getSalePrice() == null || sc.getCreatedDate() == null) continue;
            int y = sc.getCreatedDate().getYear();
            int m = sc.getCreatedDate().getMonthValue();
            if (y > targetYear) continue;
            if (y == targetYear && m > cutoffMonth) continue;
            Long staffId = sc.getStaff().getId();
            staffNames.put(staffId, sc.getStaff().getFullName());
            saleByStaff.merge(staffId, sc.getSalePrice(), BigDecimal::add);
        }

        Set<Long> allIds = new HashSet<>();
        allIds.addAll(rentByStaff.keySet());
        allIds.addAll(saleByStaff.keySet());

        return allIds.stream()
                .map(id -> new StaffValueDTO(
                        id,
                        staffNames.getOrDefault(id, "NV-" + id),
                        rentByStaff.getOrDefault(id, BigDecimal.ZERO),
                        saleByStaff.getOrDefault(id, BigDecimal.ZERO)
                ))
                .sorted(Comparator.comparing(StaffValueDTO::getTotal).reversed())
                .limit(TOP_N)
                .collect(Collectors.toList());
    }

    /**
     * Top 5 khách hàng theo tổng giá trị trong targetYear đến cutoffMonth.
     * - Thuê: tổng giá trị hợp đồng active trong targetYear (đến cutoffMonth)
     * - Mua bán: lũy kế đến cutoffMonth của targetYear
     */
    private List<CustomerValueDTO> calcTopCustomer(int targetYear, int cutoffMonth,
                                                   List<ContractEntity> allContracts,
                                                   List<SaleContractEntity> allSaleContracts) {
        Map<Long, BigDecimal> rentByCust = new HashMap<>();
        Map<Long, String> custNames = new HashMap<>();
        Map<Long, String> custTaxCodes = new HashMap<>();

        LocalDateTime startOfYear = LocalDateTime.of(targetYear, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(targetYear, 12, 31, 23, 59);

        for (ContractEntity c : allContracts) {
            if (c.getCustomer() == null || c.getRentPrice() == null || c.getRentArea() == null) continue;
            if (c.getStartDate().isAfter(endOfYear) || c.getEndDate().isBefore(startOfYear)) continue;

            Long custId = c.getCustomer().getId();
            custNames.put(custId, c.getCustomer().getFullName());
            custTaxCodes.put(custId, c.getCustomer().getTaxCode());

            BigDecimal monthly = c.getRentPrice().multiply(BigDecimal.valueOf(c.getRentArea()));
            int startMonth = c.getStartDate().getYear() < targetYear ? 1 : c.getStartDate().getMonthValue();
            int endMonth = c.getEndDate().getYear() > targetYear ? 12 : c.getEndDate().getMonthValue();
            startMonth = Math.max(1, startMonth);
            endMonth = Math.min(cutoffMonth, endMonth);
            if (startMonth > endMonth) continue;

            BigDecimal total = monthly.multiply(BigDecimal.valueOf(endMonth - startMonth + 1));
            rentByCust.merge(custId, total, BigDecimal::add);
        }

        Map<Long, BigDecimal> saleByCust = new HashMap<>();
        for (SaleContractEntity sc : allSaleContracts) {
            if (sc.getCustomer() == null || sc.getSalePrice() == null || sc.getCreatedDate() == null) continue;
            int y = sc.getCreatedDate().getYear();
            int m = sc.getCreatedDate().getMonthValue();
            if (y > targetYear) continue;
            if (y == targetYear && m > cutoffMonth) continue;
            Long custId = sc.getCustomer().getId();
            custNames.put(custId, sc.getCustomer().getFullName());
            custTaxCodes.put(custId, sc.getCustomer().getTaxCode());
            saleByCust.merge(custId, sc.getSalePrice(), BigDecimal::add);
        }

        Set<Long> allIds = new HashSet<>();
        allIds.addAll(rentByCust.keySet());
        allIds.addAll(saleByCust.keySet());

        return allIds.stream()
                .map(id -> new CustomerValueDTO(
                        id,
                        custNames.getOrDefault(id, "KH-" + id),
                        custTaxCodes.getOrDefault(id, null),           // ← thêm
                        rentByCust.getOrDefault(id, BigDecimal.ZERO),
                        saleByCust.getOrDefault(id, BigDecimal.ZERO)
                ))
                .sorted(Comparator.comparing(CustomerValueDTO::getTotal).reversed())
                .limit(TOP_N)
                .collect(Collectors.toList());
    }
}