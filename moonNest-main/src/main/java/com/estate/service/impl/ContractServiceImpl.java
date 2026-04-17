package com.estate.service.impl;

import com.estate.converter.ContractDetailConverter;
import com.estate.converter.ContractFormConverter;
import com.estate.converter.ContractListConverter;
import com.estate.dto.ContractDetailDTO;
import com.estate.dto.ContractFeeDTO;
import com.estate.dto.ContractFilterDTO;
import com.estate.dto.ContractFormDTO;
import com.estate.dto.ContractListDTO;
import com.estate.dto.StaffPerformanceDTO;
import com.estate.enums.TransactionType;
import com.estate.exception.BusinessException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.ContractRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.PropertyRequestRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.PropertyRequestEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.service.ContractService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    @Autowired
    private PropertyRequestRepository propertyRequestRepository;

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
        List<ContractEntity> contracts =
                contractRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endOfYear, startOfYear);
        List<BigDecimal> revenue = new ArrayList<>(Collections.nCopies(12, BigDecimal.ZERO));
        int currentYear = LocalDate.now().getYear();
        int currentMonth = LocalDate.now().getMonthValue();

        for (ContractEntity contract : contracts) {
            LocalDateTime start = contract.getStartDate();
            LocalDateTime end = contract.getEndDate();
            BigDecimal monthlyPrice = contract.getRentPrice().multiply(BigDecimal.valueOf(contract.getRentArea()));
            int startMonth = start.getYear() < year ? 1 : start.getMonthValue();
            int endMonth = end.getYear() > year ? 12 : end.getMonthValue();
            if (year == currentYear) {
                endMonth = Math.min(endMonth, currentMonth - 1);
            }
            if (startMonth > endMonth) {
                continue;
            }
            for (int month = startMonth; month <= endMonth; month++) {
                revenue.set(month - 1, revenue.get(month - 1).add(monthlyPrice));
            }
        }

        List<SaleContractEntity> saleContracts = saleContractRepository.findByCreatedDateBetween(startOfYear, endOfYear);
        for (SaleContractEntity contract : saleContracts) {
            int monthIndex = contract.getCreatedDate().getMonthValue() - 1;
            revenue.set(monthIndex, revenue.get(monthIndex).add(contract.getSalePrice()));
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
        for (int month = 0; month < 12; month++) {
            yearBeforeLastRevenue = yearBeforeLastRevenue.add(yearBeforeLastRevenueByMonth.get(month));
            lastYearRevenue = lastYearRevenue.add(lastYearRevenueByMonth.get(month));
            currentYearRevenue = currentYearRevenue.add(currentYearRevenueByMonth.get(month));
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
        List<ContractListDTO> dtoList = new ArrayList<>();
        for (ContractEntity contract : contractPage) {
            dtoList.add(contractListConverter.toDto(contract));
        }
        return new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());
    }

    @Override
    public Page<ContractListDTO> search(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);
        List<ContractListDTO> dtoList = new ArrayList<>();
        for (ContractEntity contract : contractPage) {
            dtoList.add(contractListConverter.toDto(contract));
        }
        return new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());
    }

    @Override
    public Page<ContractDetailDTO> searchByStaff(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);
        List<ContractDetailDTO> dtoList = new ArrayList<>();
        for (ContractEntity contract : contractPage) {
            dtoList.add(contractDetailConverter.toDto(contract));
        }
        return new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());
    }

    @Override
    public void save(ContractFormDTO dto) {
        StaffEntity staff = staffRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        if (!staffRepository.existsByStaffIdAndBuildingId(dto.getStaffId(), dto.getBuildingId())) {
            BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bất động sản."));
            throw new BusinessException("Nhân viên được chọn không phụ trách bất động sản " + building.getName());
        }
        if (!staffRepository.existsByStaffIdAndCustomerId(dto.getStaffId(), dto.getCustomerId())) {
            CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
            throw new BusinessException("Nhân viên được chọn không phụ trách khách hàng " + customer.getFullName());
        }
        if (dto.getStartDate() != null && dto.getEndDate() != null && dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new BusinessException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        ContractEntity entity = dto.getId() != null
                ? contractRepository.findById(dto.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hợp đồng."))
                : new ContractEntity();
        contractFormConverter.toEntity(entity, dto);
        contractRepository.save(entity);

        if (dto.getFromRequestId() != null) {
            PropertyRequestEntity request = propertyRequestRepository.findById(dto.getFromRequestId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu bất động sản."));
            if (!"PENDING".equals(request.getStatus())) {
                throw new BusinessException("Chỉ có thể chuyển yêu cầu đang chờ xử lý thành hợp đồng.");
            }
            if (!"RENT".equals(request.getRequestType())) {
                throw new BusinessException("Chỉ yêu cầu thuê mới có thể chuyển thành hợp đồng thuê.");
            }
            if (!request.getBuilding().getId().equals(dto.getBuildingId())
                    || !request.getCustomer().getId().equals(dto.getCustomerId())) {
                throw new BusinessException("Dữ liệu hợp đồng không khớp với yêu cầu đã chọn.");
            }
            request.setStatus("APPROVED");
            request.setProcessedBy(staff);
            request.setAdminNote(null);
            request.setContract(entity);
            request.setSaleContract(null);
            propertyRequestRepository.save(request);
        }
    }

    @Override
    public void delete(Long id) {
        if (!contractRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy hợp đồng.");
        }
        contractRepository.deleteById(id);
    }

    @Override
    public ContractFormDTO findById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hợp đồng."));
        return contractFormConverter.toDTO(contractEntity);
    }

    @Override
    public ContractDetailDTO viewById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hợp đồng."));
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
        List<ContractDetailDTO> result = new ArrayList<>();
        for (ContractEntity contract : contracts) {
            result.add(contractDetailConverter.toDto(contract));
        }
        return result;
    }

    @Override
    public Map<Long, List<Long>> getActiveContracts() {
        List<Long[]> activeContracts = contractRepository.getActiveContracts();
        Map<Long, List<Long>> result = new HashMap<>();
        for (Long[] row : activeContracts) {
            result.computeIfAbsent(row[0], key -> new ArrayList<>()).add(row[1]);
        }
        return result;
    }

    @Override
    public Map<Long, ContractFeeDTO> getContractsFees() {
        List<Object[]> data = contractRepository.getContractsFees();
        Map<Long, ContractFeeDTO> result = new HashMap<>();
        for (Object[] row : data) {
            result.put((Long) row[0], (ContractFeeDTO) row[1]);
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
        return contracts.stream().map(contractListConverter::toDto).toList();
    }

    @Override
    public Map<Long, Long> getSaleContractRate() {
        Long totalBuildingForSale = buildingRepository.countByTransactionType(TransactionType.FOR_SALE);
        Long totalSoldBuilding = saleContractRepository.count();
        return Map.of(totalBuildingForSale, totalSoldBuilding);
    }
}
