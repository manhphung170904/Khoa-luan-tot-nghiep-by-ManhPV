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

        List<ContractEntity> contracts = contractRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endOfYear, startOfYear);

        List<BigDecimal> revenue = new ArrayList<>(Collections.nCopies(12, BigDecimal.ZERO));

        int currentYear = LocalDate.now().getYear();
        int currentMonth = LocalDate.now().getMonthValue();

        for (ContractEntity c : contracts) {

            LocalDateTime start = c.getStartDate();
            LocalDateTime end = c.getEndDate();

            BigDecimal monthlyPrice = c.getRentPrice().multiply(BigDecimal.valueOf(c.getRentArea()));

            // XÃƒÂ¡c Ã„â€˜Ã¡Â»â€¹nh thÃƒÂ¡ng bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u trong nÃ„Æ’m
            int startMonth = start.getYear() < year ? 1 : start.getMonthValue();

            // XÃƒÂ¡c Ã„â€˜Ã¡Â»â€¹nh thÃƒÂ¡ng kÃ¡ÂºÂ¿t thÃƒÂºc trong nÃ„Æ’m
            int endMonth = end.getYear() > year ? 12 : end.getMonthValue();

            // LoÃ¡ÂºÂ¡i bÃ¡Â»Â thÃƒÂ¡ng chÃ†Â°a diÃ¡Â»â€¦n ra nÃ¡ÂºÂ¿u lÃƒÂ  nÃ„Æ’m hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i
            if (year == currentYear) {
                endMonth = Math.min(endMonth, currentMonth - 1);
            }

            // BÃ¡Â»Â qua hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng nÃ¡ÂºÂ¿u khÃƒÂ´ng cÃƒÂ²n thÃƒÂ¡ng hÃ¡Â»Â£p lÃ¡Â»â€¡ (VÃƒÂ­ dÃ¡Â»Â¥: ThÃƒÂ¡ng hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i lÃƒÂ  1 thÃƒÂ¬ endMonth = 0)
            if (startMonth > endMonth) continue;

            // CÃ¡Â»â„¢ng tiÃ¡Â»Ân vÃƒÂ o danh sÃƒÂ¡ch
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

        // TÃ¡ÂºÂ¡o list chÃ¡Â»Â©a DTO
        List<ContractListDTO> dtoList = new ArrayList<>();

        // DuyÃ¡Â»â€¡t qua tÃ¡Â»Â«ng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractListDTO dto = contractListConverter.toDto(c);
            dtoList.add(dto);
        }

        // TÃ¡ÂºÂ¡o PageImpl giÃ¡Â»Â¯ nguyÃƒÂªn thÃƒÂ´ng tin phÃƒÂ¢n trang gÃ¡Â»â€˜c
        Page<ContractListDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public Page<ContractListDTO> search(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);

        // TÃ¡ÂºÂ¡o list chÃ¡Â»Â©a DTO
        List<ContractListDTO> dtoList = new ArrayList<>();

        // DuyÃ¡Â»â€¡t qua tÃ¡Â»Â«ng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractListDTO dto = contractListConverter.toDto(c);

            dtoList.add(dto);
        }

        // TÃ¡ÂºÂ¡o PageImpl giÃ¡Â»Â¯ nguyÃƒÂªn thÃƒÂ´ng tin phÃƒÂ¢n trang gÃ¡Â»â€˜c
        Page<ContractListDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public Page<ContractDetailDTO> searchByStaff(ContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContractEntity> contractPage = contractRepository.searchContracts(filter, pageable);

        // TÃ¡ÂºÂ¡o list chÃ¡Â»Â©a DTO
        List<ContractDetailDTO> dtoList = new ArrayList<>();

        // DuyÃ¡Â»â€¡t qua tÃ¡Â»Â«ng ContractEntity
        for (ContractEntity c : contractPage) {
            // Convert entity sang DTO
            ContractDetailDTO dto = contractDetailConverter.toDto(c);

            dtoList.add(dto);
        }

        // TÃ¡ÂºÂ¡o PageImpl giÃ¡Â»Â¯ nguyÃƒÂªn thÃƒÂ´ng tin phÃƒÂ¢n trang gÃ¡Â»â€˜c
        Page<ContractDetailDTO> result = new PageImpl<>(dtoList, contractPage.getPageable(), contractPage.getTotalElements());

        return result;
    }

    @Override
    public void save(ContractFormDTO dto) {
        ContractEntity entity;

        StaffEntity staff = staffRepository.findById(dto.getStaffId()).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y nhÃƒÂ¢n viÃƒÂªn"));
        // KiÃ¡Â»Æ’m tra nhÃƒÂ¢n viÃƒÂªn cÃƒÂ³ quÃ¡ÂºÂ£n lÃƒÂ½ tÃƒÂ²a nhÃƒÂ  khÃƒÂ´ng
        if (!staffRepository.existsByStaffIdAndBuildingId(dto.getStaffId(), dto.getBuildingId())) {
            BuildingEntity building = buildingRepository.findById(dto.getBuildingId()).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y tÃƒÂ²a nhÃƒÂ "));
            throw new BusinessException("NhÃƒÂ¢n viÃƒÂªn " + staff.getFullName() + " hiÃ¡Â»â€¡n khÃƒÂ´ng quÃ¡ÂºÂ£n lÃƒÂ½ tÃƒÂ²a nhÃƒÂ  " + building.getName());
        }

        // KiÃ¡Â»Æ’m tra nhÃƒÂ¢n viÃƒÂªn cÃƒÂ³ quÃ¡ÂºÂ£n lÃƒÂ½ khÃƒÂ¡ch hÃƒÂ ng khÃƒÂ´ng
        if (!staffRepository.existsByStaffIdAndCustomerId(dto.getStaffId(), dto.getCustomerId())) {
            CustomerEntity customer = customerRepository.findById(dto.getCustomerId()).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y khÃƒÂ¡ch hÃƒÂ ng"));
            throw new BusinessException("NhÃƒÂ¢n viÃƒÂªn " + staff.getFullName() + " hiÃ¡Â»â€¡n khÃƒÂ´ng quÃ¡ÂºÂ£n lÃƒÂ½ khÃƒÂ¡ch hÃƒÂ ng " + customer.getFullName());
        }

        if (dto.getId() != null) {
            // Update
            entity = contractRepository.findById(dto.getId()).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng Ã„â€˜Ã¡Â»Æ’ sÃ¡Â»Â­a"));
        } else {
            // ThÃƒÂªm mÃ¡Â»â€ºi
            entity = new ContractEntity();
        }

        contractFormConverter.toEntity(entity, dto);

        // LÃ†Â°u hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng
        contractRepository.save(entity);

        // CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t trÃ¡ÂºÂ¡ng thÃƒÂ¡i yÃƒÂªu cÃ¡ÂºÂ§u
        if (dto.getFromRequestId() != null) {
            PropertyRequestEntity request = propertyRequestRepository.findById(dto.getFromRequestId())
                    .orElseThrow(() -> new BusinessException("Property request was not found"));
            if (!"PENDING".equals(request.getStatus())) {
                throw new BusinessException("Only pending requests can be converted into a contract");
            }
            if (!"RENT".equals(request.getRequestType())) {
                throw new BusinessException("Only RENT requests can be converted into a rental contract");
            }
            if (!request.getBuilding().getId().equals(dto.getBuildingId())
                    || !request.getCustomer().getId().equals(dto.getCustomerId())) {
                throw new BusinessException("Contract data does not match the selected request");
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
            throw new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng Ã„â€˜Ã¡Â»Æ’ xÃƒÂ³a");
        }
        contractRepository.deleteById(id);
    }

    @Override
    public ContractFormDTO findById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng"));
        return contractFormConverter.toDTO(contractEntity);
    }

    @Override
    public ContractDetailDTO viewById(Long id) {
        ContractEntity contractEntity = contractRepository.findById(id).orElseThrow(() -> new BusinessException("KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng"));
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
