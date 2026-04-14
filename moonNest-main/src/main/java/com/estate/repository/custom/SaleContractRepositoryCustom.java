package com.estate.repository.custom;

import com.estate.dto.SaleContractFilterDTO;
import com.estate.repository.entity.SaleContractEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SaleContractRepositoryCustom {
    Page<SaleContractEntity> searchSaleContracts(SaleContractFilterDTO filter, Pageable pageable);
}