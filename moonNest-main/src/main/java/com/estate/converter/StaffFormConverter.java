package com.estate.converter;

import com.estate.dto.StaffFormDTO;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class StaffFormConverter {
    @Autowired
    private ModelMapper modelMapper;

    public StaffEntity toEntity(StaffFormDTO dto) {
        StaffEntity entity = modelMapper.map(dto, StaffEntity.class);
        return entity;
    }
}
