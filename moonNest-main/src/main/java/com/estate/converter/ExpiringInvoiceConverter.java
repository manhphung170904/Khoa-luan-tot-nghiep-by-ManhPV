package com.estate.converter;

import com.estate.dto.ExpiringInvoiceDTO;
import com.estate.repository.entity.InvoiceEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ExpiringInvoiceConverter {
    @Autowired
    private ModelMapper modelMapper;

    public ExpiringInvoiceDTO toDto(InvoiceEntity entity) {
        ExpiringInvoiceDTO dto = modelMapper.map(entity, ExpiringInvoiceDTO.class);

        dto.setCustomerName(entity.getCustomer().getFullName());

        dto.setBuildingName(entity.getContract().getBuilding().getName());

        return dto;
    }
}
