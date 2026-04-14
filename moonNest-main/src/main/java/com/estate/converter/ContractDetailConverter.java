package com.estate.converter;


import com.estate.dto.BuildingListDTO;
import com.estate.dto.ContractDetailDTO;
import com.estate.dto.CustomerListDTO;
import com.estate.dto.StaffListDTO;
import com.estate.repository.entity.ContractEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
public class ContractDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private BuildingListConverter buildingListConverter;

    @Autowired
    private StaffListConverter staffListConverter;

    @Autowired
    private CustomerListConverter customerListConverter;

    public ContractDetailDTO toDto(ContractEntity entity) {
        ContractDetailDTO dto = modelMapper.map(entity, ContractDetailDTO.class);

        String formattedStartDate = entity.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        dto.setFormattedStartDate(formattedStartDate);

        String formattedEndDate = entity.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        dto.setFormattedEndDate(formattedEndDate);

        BuildingListDTO buildingDto = buildingListConverter.toDto(entity.getBuilding(), "");
        dto.setBuilding(buildingDto);

        StaffListDTO staffDto = staffListConverter.toDto(entity.getStaff());
        dto.setStaff(staffDto);

        CustomerListDTO customerDto = customerListConverter.toDto(entity.getCustomer());
        dto.setCustomer(customerDto);

        return dto;
    }
}
