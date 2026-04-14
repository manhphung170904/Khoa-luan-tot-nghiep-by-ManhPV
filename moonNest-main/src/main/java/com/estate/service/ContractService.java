package com.estate.service;

import com.estate.dto.*;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface ContractService {
    Long countAll();
    List<StaffPerformanceDTO> getTopStaffs();
    List<BigDecimal> getMonthlyRevenue(int year);
    List<BigDecimal> getYearlyRevenue(int yearBeforeLast, int lastYear, int currentYear);
    Map<String, Long> getContractCountByBuilding();
    Map<Long, Long> getContractCountByYear();
    Page<ContractListDTO> getContracts(int page, int size);
    Page<ContractListDTO> search(ContractFilterDTO filter, int page, int size);
    Page<ContractDetailDTO> searchByStaff(ContractFilterDTO filter, int page, int size);
    void save(ContractFormDTO dto);
    void delete(Long id);
    ContractFormDTO findById(Long id);
    ContractDetailDTO viewById(Long id);
    Long countActiveByBuildingId(Long buildingId);
    Long getContractCountByCustomer(Long id);
    Long getActiveContractsCount(Long customerId);
    Long getExpiredContractsCount(Long customerId);
    List<ContractDetailDTO> getContractsByFilter(Long customerId, Long buildingId, String status);
    Map<Long, List<Long>> getActiveContracts();
    Map<Long, ContractFeeDTO> getContractsFees();
    void statusUpdate();
    Long getContractCnt(Long staffId);
    List<ContractListDTO> getExpiringContracts(Long staffID);
    Map<Long, Long> getSaleContractRate();
}
