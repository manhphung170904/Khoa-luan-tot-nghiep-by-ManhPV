package com.estate.converter;

import com.estate.dto.ContractListDTO;
import com.estate.repository.entity.ContractEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ContractListConverter {
    @Autowired
    private ModelMapper modelMapper;

    public ContractListDTO toDto(ContractEntity entity) {
        ContractListDTO dto = modelMapper.map(entity, ContractListDTO.class);
        dto.setBuilding(entity.getBuilding().getName());
        dto.setCustomer(entity.getCustomer().getFullName());
        return dto;
    }
}
