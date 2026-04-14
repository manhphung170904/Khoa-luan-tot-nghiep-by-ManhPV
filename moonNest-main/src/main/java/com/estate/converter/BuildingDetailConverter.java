package com.estate.converter;

import com.estate.dto.BuildingDetailDTO;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class BuildingDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    public BuildingDetailDTO toDTO(BuildingEntity entity) {
        BuildingDetailDTO dto = modelMapper.map(entity, BuildingDetailDTO.class);

        String address = String.join(", ",
                safe(entity.getStreet()),
                safe(entity.getWard()),
                safe(entity.getDistrict().getName())
        );
        dto.setAddress(address);

        dto.setPropertyType(entity.getPropertyType().name());

        dto.setTransactionType(entity.getTransactionType().name());

        if (entity.getDirection() != null) {
            dto.setDirection(entity.getDirection().getLabel());
        }

        if (entity.getLevel() != null) {
            dto.setLevel(entity.getLevel().getLabel());
        }

        if (entity.getRentAreas() != null && !entity.getRentAreas().isEmpty()) {
            String rentAreaValues = entity.getRentAreas().stream()
                    .map(a -> a.getValue().toString())
                    .collect(Collectors.joining(","));
            dto.setRentAreaValues(rentAreaValues);
        }

        if (entity.getStaffs_buildings() != null && !entity.getStaffs_buildings().isEmpty()) {
            dto.setStaffs(
                    entity.getStaffs_buildings()
                            .stream()
                            .collect(Collectors.toMap(
                                    StaffEntity::getFullName,
                                    StaffEntity::getId
                            ))
            );
        }
        return dto;
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
