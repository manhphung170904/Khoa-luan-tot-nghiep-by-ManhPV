package com.estate.converter;

import com.estate.dto.CustomerListDTO;
import com.estate.repository.entity.CustomerEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class CustomerListConverter {
    @Autowired
    private ModelMapper modelMapper;

    public CustomerListDTO toDto(CustomerEntity entity) {
        CustomerListDTO dto = modelMapper.map(entity, CustomerListDTO.class);
        return dto;
    }
}
