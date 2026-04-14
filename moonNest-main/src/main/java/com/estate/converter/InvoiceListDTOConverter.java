package com.estate.converter;

import com.estate.dto.ContractDetailDTO;
import com.estate.dto.CustomerDetailDTO;
import com.estate.dto.InvoiceListDTO;
import com.estate.repository.entity.InvoiceEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class InvoiceListDTOConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ContractDetailConverter contractDetailConverter;

    @Autowired
    private CustomerDetailConverter customerDetailConverter;

    public InvoiceListDTO toDTO(InvoiceEntity entity) {
        InvoiceListDTO dto = modelMapper.map(entity, InvoiceListDTO.class);

        ContractDetailDTO contractDTO = contractDetailConverter.toDto(entity.getContract());
        dto.setContract(contractDTO);

        CustomerDetailDTO customerDTO = customerDetailConverter.toDTO(entity.getCustomer());
        dto.setCustomer(customerDTO);

        return dto;
    }
}
