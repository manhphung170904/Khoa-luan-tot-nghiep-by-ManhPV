package com.estate.repository.custom;

import com.estate.dto.ContractFilterDTO;
import com.estate.repository.entity.ContractEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ContractRepositoryCustom {
    Page<ContractEntity> searchContracts(ContractFilterDTO filter, Pageable pageable);
}
