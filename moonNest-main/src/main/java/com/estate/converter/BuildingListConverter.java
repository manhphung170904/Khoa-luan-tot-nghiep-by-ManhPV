package com.estate.converter;

import com.estate.dto.BuildingListDTO;
import com.estate.repository.entity.BuildingEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class BuildingListConverter {
    @Autowired
    private ModelMapper modelMapper;

    public BuildingListDTO toDto(BuildingEntity entity, String managerNameStr) {
        BuildingListDTO dto = modelMapper.map(entity, BuildingListDTO.class);

        dto.setAddress(
                String.join(", ",
                        nullSafe(entity.getStreet()),
                        nullSafe(entity.getWard()),
                        entity.getDistrict() == null ? "" : nullSafe(entity.getDistrict().getName())
                ).trim()
        );
        dto.setManagerName(managerNameStr);

        if (entity.getStaffs_buildings() != null && !entity.getStaffs_buildings().isEmpty()) {
            dto.setPhone(entity.getStaffs_buildings().getFirst().getPhone());
        }

        return dto;
    }

    private String nullSafe(String v) {
        return v != null ? v : "";
    }

}
