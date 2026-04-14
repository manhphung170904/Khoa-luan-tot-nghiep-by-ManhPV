package com.estate.converter;

import com.estate.dto.CustomerContractDTO;
import com.estate.repository.entity.ContractEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class CustomerContractConverter {
    @Autowired
    private ModelMapper modelMapper;

    public CustomerContractDTO toDTO(ContractEntity entity) {
        CustomerContractDTO dto = modelMapper.map(entity, CustomerContractDTO.class);

        dto.setBuilding(entity.getBuilding().getName());

        dto.setStaff(entity.getStaff().getFullName());

        return dto;
    }
}
