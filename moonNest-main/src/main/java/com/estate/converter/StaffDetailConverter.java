package com.estate.converter;

import com.estate.dto.BuildingListDTO;
import com.estate.dto.CustomerContractDTO;
import com.estate.dto.CustomerListDTO;
import com.estate.dto.StaffDetailDTO;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class StaffDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private BuildingListConverter buildingListConverter;

    @Autowired
    private CustomerListConverter customerListConverter;

    public StaffDetailDTO toDTO(StaffEntity entity) {
        StaffDetailDTO dto = modelMapper.map(entity, StaffDetailDTO.class);

        List<BuildingEntity> buildings = entity.getBuildings();
        List<BuildingListDTO> buildingListDTO = new ArrayList<>();
        for (BuildingEntity b : buildings) {
            BuildingListDTO building = buildingListConverter.toDto(b, "");
            buildingListDTO.add(building);
        }

        dto.setBuildings(buildingListDTO);

        List<CustomerEntity> customers = entity.getCustomers();
        List<CustomerListDTO> customerListDTO = new ArrayList<>();
        for (CustomerEntity c : customers) {
            CustomerListDTO customer = customerListConverter.toDto(c);
            customerListDTO.add(customer);
        }

        dto.setBuildings(buildingListDTO);

        return dto;
    }
}
