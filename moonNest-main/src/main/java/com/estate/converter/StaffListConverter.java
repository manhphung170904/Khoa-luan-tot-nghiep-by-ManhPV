package com.estate.converter;

import com.estate.dto.StaffListDTO;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class StaffListConverter {
    @Autowired
    private ModelMapper modelMapper;

    public StaffListDTO toDto(StaffEntity entity) {
        StaffListDTO dto = modelMapper.map(entity, StaffListDTO.class);
        return dto;
    }
}
