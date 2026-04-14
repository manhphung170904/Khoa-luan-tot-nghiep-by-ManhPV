package com.estate.service;

import com.estate.dto.InvoiceFormDTO;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.repository.entity.UtilityMeterEntity;

public interface UtilityMeterService {
    UtilityMeterEntity findByContractIdAndMonthAndYear(Long contractId, Integer month, Integer year);
    void save(InvoiceEntity invoice, InvoiceFormDTO dto);
}
