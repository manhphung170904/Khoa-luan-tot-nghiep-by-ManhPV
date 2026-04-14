package com.estate.service.impl;

import com.estate.converter.ContractDetailConverter;
import com.estate.converter.ContractFormConverter;
import com.estate.converter.ContractListConverter;
import com.estate.dto.*;
import com.estate.enums.TransactionType;
import com.estate.exception.BusinessException;
import com.estate.repository.*;
import com.estate.repository.entity.*;
import com.estate.service.ContractService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ContractServiceImpl implements ContractService {
    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private ContractListConverter contractListConverter;

    @Autowired
    private ContractFormConverter contractFormConverter;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ContractDetailConverter contractDetailConverter;

    @Autowired
    private SaleContractRepository saleContractRepository;

    @Override
    public Long countAll() {
        return contractRepository.count();
    }

    @Override
    public List<StaffPerformanceDTO> getTopStaffs() {
        List<Object[]> rawData = contractRepository.countContractsByStaff((Pageable) PageRequest.of(0, 5));

        long totalContracts = rawData.stream().mapToLong(r -> (Long) r[2]).sum();

        return rawData.stream().map(r -> {
            Long staffId = (Long) r[0];
            String fullName = (String) r[1];
            Long contractCount = (Long) r[2];

            double percent = totalContracts == 0 ? 0 : (contractCount * 100.0) / totalContracts;

            return new StaffPerformanceDTO(staffId, fullName, contractCount, Math.round(percent * 100) / 100.0);
        }).collect(Collectors.toList());
    }

    @Override
    public List<BigDecimal> getMonthlyRevenue(int year) {

        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59);

        List<ContractEntity> contracts = contractRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endOfYear, startOfYear);

        List<BigDecimal> revenue = new ArrayList<>(Collections.nCopies(12, BigDecimal.ZERO));

        int currentYear = LocalDate.now().getYear();
        int currentMonth = LocalDate.now().getMonthValue();

        for (ContractEntity c : contracts) {

            LocalDateTime start = c.getStartDate();
            LocalDateTime end = c.getEndDate();

            BigDecimal monthlyPrice = c.getRentPrice().multiply(BigDecimal.valueOf(c.getRentArea()));

            // Xác định tháng bắt đầu trong năm
            int startMonth = start.getYear() < year ? 1 : start.getMonthValue();

            // Xác định tháng kết thúc trong năm
            int endMonth = end.getYear() > year ? 12 : end.getMonthValue();

            // Loại bỏ tháng chưa diễn ra nếu là năm hiện tại
            if (year == currentYear) {
                endMonth = Math.min(endMonth, currentMonth - 1);
            }

            // Bỏ qua hợp đồng nếu không còn tháng hợp lệ (Ví dụ: Tháng hiện tại là 1 thì endMonth = 0)
            if (startMonth > endMonth) continue;

            // Cộng tiền vào danh sách
            for (int m = startMonth; m <= endMonth; m++) {
                revenue.set(m - 1, revenue.get(m - 1).add(monthlyPrice));
            }
        }

        List<SaleContractEntity> saleContracts = saleContractRepository.findByCreatedDateBetween(startOfYear, endOfYear);
        for (SaleContractEntity c : saleContracts) {
            revenue.set(
                    c.getCreatedDate().getMonthValue() - 1,
                    revenue.get(c.getCreatedDate().getMonthValue() - 1).add(c.getSalePrice())
            );
        }

        return revenue;
    }

    @Override
    public List<BigDecimal> getYearlyRevenue(int yearBeforeLast, int lastYear, int currentYear) {
        List<BigDecimal> finalRevenue = new ArrayList<>(Collections.nCopies(3, BigDecimal.ZERO));

        List<BigDecimal> yearBeforeLastRevenueByMonth = getMonthlyRevenue(yearBeforeLast);
        List<BigDecimal> lastYearRevenueByMonth = getMonthlyRevenue(lastYear);
        List<BigDecimal> currentYearRevenueByMonth = getMonthlyRevenue(currentYear);

        BigDecimal yearBeforeLastRevenue = BigDecimal.ZERO;
        BigDecimal lastYearRevenue = BigDecimal.ZERO;
        BigDecimal currentYearRevenue = BigDecimal.ZERO;

        for (int j = 0; j < 12; j++) {
            yearBeforeLastRevenue = yearBeforeLastRevenue.add(yearBeforeLastRevenueByMonth.get(j));
            lastYearRevenue = lastYearRevenue.add(lastYearRevenueByMonth.get(j));
            currentYearRevenue = currentYearRevenue.add(currentYearRevenueByMonth.get(j));
        }

        finalRevenue.set(0, yearBeforeLastRevenue);
        finalRevenue.set(1, lastYearRevenue);
        finalRevenue.set(2, currentYearRevenue);

        return finalRevenue;
    }

    @Override
    public Map<String, Long> getContractCountByBuilding() {
        List<Object[]> result = contractRepository.countContractsByBuilding((Pageable) PageRequest.of(0, 5));
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : result) {
            map.put((String) row[0], (Long) row[1]);
        }
        return map;
    }

    @Override
    public Map<Long, Long> getContractCountByYear() {
        List<Long[]> rentContracts = contractRepository.countRentContractsByYear();
        List<Long[]> saleContracts = contractRepository.countSaleContractsByYear();

        Map<Long, Long> map = new HashMap<>();

        if (rentContracts != null) {
            rentContracts.forEach(row -> map.put(row[0], row[1]));
        }
        if (saleContracts != null) {
            saleContracts.forEach(row -> map.merge(row[0], row[1], Long::sum));
        }

        return map;
    }

    @Override
    public Page<ContractListDTO> getContracts(int page, int size) {
        Page<ContractEntity> contractPage = contractRepository.findAll(PageRequest.of(page, size));

        // Tạo list chứa DTO
        List<ContractListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractListDTO dto = contractListConverter.toDto(c);
            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<ContractListDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public Page<ContractListDTO> search(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);

        // Tạo list chứa DTO
        List<ContractListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractListDTO dto = contractListConverter.toDto(c);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<ContractListDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public Page<ContractDetailDTO> searchByStaff(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);

        // Tạo list chứa DTO
        List<ContractDetailDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractDetailDTO dto = contractDetailConverter.toDto(c);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<ContractDetailDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public void save(ContractFormDTO dto) {
        ContractEntity entity;

        StaffEntity staff = staffRepository.findById(dto.getStaffId()).orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));
        // Kiểm tra nhân viên có quản lý tòa nhà không
        if (!staffRepository.existsByStaffIdAndBuildingId(dto.getStaffId(), dto.getBuildingId())) {
            BuildingEntity building = buildingRepository.findById(dto.getBuildingId()).orElseThrow(() -> new BusinessException("Không tìm thấy tòa nhà"));
            throw new BusinessException("Nhân viên " + staff.getFullName() + " hiện không quản lý tòa nhà " + building.getName());
        }

        // Kiểm tra nhân viên có quản lý khách hàng không
        if (!staffRepository.existsByStaffIdAndCustomerId(dto.getStaffId(), dto.getCustomerId())) {
            CustomerEntity customer = customerRepository.findById(dto.getCustomerId()).orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng"));
            throw new BusinessException("Nhân viên " + staff.getFullName() + " hiện không quản lý khách hàng " + customer.getFullName());
        }

        if (dto.getId() != null) {
            // Update
            entity = contractRepository.findById(dto.getId()).orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng để sửa"));
        } else {
            // Thêm mới
            entity = new ContractEntity();
        }

        contractFormConverter.toEntity(entity, dto);

        // Lưu hợp đồng
        contractRepository.save(entity);
    }

    @Override
    public void delete(Long id) {
        if (!contractRepository.existsById(id)) {
            throw new BusinessException("Không tìm thấy hợp đồng để xóa");
        }
        contractRepository.deleteById(id);
    }

    @Override
    public ContractFormDTO findById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id).orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng"));
        return contractFormConverter.toDTO(contractEntity);
    }

    @Override
    public ContractDetailDTO viewById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id).orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng"));
        return contractDetailConverter.toDto(contractEntity);
    }

    @Override
    public Long countActiveByBuildingId(Long buildingId) {
        return contractRepository.countByBuildingIdAndStatus(buildingId, "ACTIVE");
    }

    @Override
    public Long getContractCountByCustomer(Long id) {
        return contractRepository.countByCustomerId(id);
    }

    @Override
    public Long getActiveContractsCount(Long customerId) {
        return contractRepository.countByCustomerIdAndStatus(customerId, "ACTIVE");
    }

    @Override
    public Long getExpiredContractsCount(Long customerId) {
        return contractRepository.countByCustomerIdAndStatus(customerId, "EXPIRED");
    }

    @Override
    public List<ContractDetailDTO> getContractsByFilter(Long customerId, Long buildingId, String status) {
        List<ContractEntity> contracts = contractRepository.searchContracts(customerId, buildingId, status);

        List<ContractDetailDTO> res = new ArrayList<>();
        for (ContractEntity c : contracts) {
            res.add(contractDetailConverter.toDto(c));
        }

        return res;
    }

    @Override
    public Map<Long, List<Long>> getActiveContracts() {
        List<Long[]> activeContracts = contractRepository.getActiveContracts();

        Map<Long, List<Long>> result = new HashMap<>();

        for (Long[] row : activeContracts) {
            Long customerId = row[0];
            Long contractId = row[1];

            result.computeIfAbsent(customerId, k -> new ArrayList<>()).add(contractId);
        }

        return result;
    }

    @Override
    public Map<Long, ContractFeeDTO> getContractsFees() {
        List<Object[]> data = contractRepository.getContractsFees();

        Map<Long, ContractFeeDTO> result = new HashMap<>();

        for (Object[] row : data) {
            Long contractId = (Long) row[0];
            ContractFeeDTO fees = (ContractFeeDTO) row[1];

            result.put(contractId, fees);
        }

        return result;
    }

    @Override
    public void statusUpdate() {
        contractRepository.statusUpdate();
    }

    @Override
    public Long getContractCnt(Long staffId) {
        return contractRepository.countStaffIdByStaffId(staffId);
    }

    @Override
    public List<ContractListDTO> getExpiringContracts(Long staffId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime end = now.plusMonths(1).withHour(0).withMinute(0).withSecond(0);
        List<ContractEntity> contractLists = contractRepository.findByStaffId(staffId);

        List<Long> contractIds = contractLists.stream().map(ContractEntity::getId).toList();

        List<ContractEntity> contracts = contractRepository.getExpiringContracts(start, end, contractIds);

        return contracts.stream().map(c -> contractListConverter.toDto(c)).toList();
    }

    @Override
    public Map<Long, Long> getSaleContractRate() {
        Long totalBuildingForSale = buildingRepository.countByTransactionType(TransactionType.FOR_SALE);
        Long totalSoldBuilding = saleContractRepository.count();

        return Map.of(totalBuildingForSale, totalSoldBuilding);
    }

}
