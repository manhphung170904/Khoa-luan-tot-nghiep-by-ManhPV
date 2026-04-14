package com.estate.converter;

import com.estate.dto.InvoiceFormDTO;
import com.estate.exception.BusinessException;
import com.estate.repository.ContractRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.UtilityMeterRepository;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.InvoiceEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class InvoiceFormConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UtilityMeterRepository utilityMeterRepository;

    public void toEntity(InvoiceEntity entity, InvoiceFormDTO dto) {
        modelMapper.map(dto, entity);

        ContractEntity contract = contractRepository.findById(dto.getContractId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng"));
        entity.setContract(contract);

        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng"));
        entity.setCustomer(customer);
    }

    public void toDTO(InvoiceEntity entity, InvoiceFormDTO dto) {
        modelMapper.map(entity, dto);

        dto.setCustomerId(entity.getCustomer().getId());
        dto.setContractId(entity.getContract().getId());

        Integer electricityUsage = utilityMeterRepository.getElectricityUsage(
                entity.getContract().getId(), entity.getMonth(), entity.getYear()
        );
        dto.setElectricityUsage(electricityUsage);

        Integer waterUsage = utilityMeterRepository.getWaterUsage(
                entity.getContract().getId(), entity.getMonth(), entity.getYear()
        );
        dto.setWaterUsage(waterUsage);
    }
}
