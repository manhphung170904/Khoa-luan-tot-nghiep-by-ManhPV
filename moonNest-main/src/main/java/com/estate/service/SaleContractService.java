package com.estate.service;

import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.dto.SaleContractListDTO;
import org.springframework.data.domain.Page;

public interface SaleContractService {
    Long countByBuildingId(Long buildingId);
    Long countByStaffId(Long staffId);
    Page<SaleContractListDTO> getSaleContracts(int page, int size);
    Page<SaleContractListDTO> search(SaleContractFilterDTO filter, int page, int size);
    Page<SaleContractDetailDTO> searchDetails(SaleContractFilterDTO filter, int page, int size);
    SaleContractDetailDTO viewById(Long id);
    void delete(Long id);
    void save(SaleContractFormDTO dto);
    SaleContractFormDTO findById(Long id);
}
