package com.estate.converter;

import com.estate.dto.OverdueInvoiceDTO;
import com.estate.repository.entity.InvoiceEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class OverdueInvoiceListConverter {
    @Autowired
    ModelMapper modelMapper;

    @Autowired
    CustomerListConverter customerListConverter;

    public OverdueInvoiceDTO toDTO(InvoiceEntity entity) {
        OverdueInvoiceDTO dto = new OverdueInvoiceDTO();
        modelMapper.map(entity, dto);

        if (entity.getCustomer() != null) {
            dto.setCustomer(customerListConverter.toDto(entity.getCustomer()));
        }

        return dto;
    }
}
