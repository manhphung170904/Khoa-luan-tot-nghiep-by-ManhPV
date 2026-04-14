package com.estate.service.impl;

import com.estate.dto.InvoiceFormDTO;
import com.estate.exception.BusinessException;
import com.estate.repository.UtilityMeterRepository;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.repository.entity.UtilityMeterEntity;
import com.estate.service.UtilityMeterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UtilityMeterServiceImpl implements UtilityMeterService {
    @Autowired
    UtilityMeterRepository utilityMeterRepository;

    @Override
    public UtilityMeterEntity findByContractIdAndMonthAndYear(Long contractId, Integer month, Integer year) {
        return utilityMeterRepository
                .findByContractIdAndMonthAndYear(contractId, month, year)
                .orElseThrow(() -> new BusinessException("Không tìm thấy dữ liệu chỉ số điện nước hóa đơn"));
    }

    @Override
    public void save(InvoiceEntity invoice, InvoiceFormDTO dto) {
        Long contractId = invoice.getContract().getId();
        int month = invoice.getMonth();
        int year = invoice.getYear();

        // Tìm utility meter của tháng hiện tại
        UtilityMeterEntity meter = utilityMeterRepository
                .findByContractIdAndMonthAndYear(contractId, month, year)
                .orElseGet(UtilityMeterEntity::new);

        // Nếu là bản ghi mới
        if (meter.getId() == null) {
            meter.setContract(invoice.getContract());
            meter.setMonth(month);
            meter.setYear(year);

            // ===== LẤY CHỈ SỐ CŨ TỪ THÁNG TRƯỚC =====
            int preMonth = (month == 1) ? 12 : month - 1;
            int preYear = (month == 1) ? year - 1 : year;

            utilityMeterRepository
                    .findByContractIdAndMonthAndYear(contractId, preMonth, preYear)
                    .ifPresentOrElse(
                            pre -> {
                                meter.setElectricityOld(pre.getElectricityNew());
                                meter.setWaterOld(pre.getWaterNew());
                            },
                            () -> {
                                meter.setElectricityOld(0);
                                meter.setWaterOld(0);
                            }
                    );
        }

        // ===== UPDATE CHỈ SỐ MỚI =====
        meter.setElectricityNew(
                meter.getElectricityOld() + dto.getElectricityUsage()
        );

        meter.setWaterNew(
                meter.getWaterOld() + dto.getWaterUsage()
        );

        utilityMeterRepository.save(meter);
    }
}
