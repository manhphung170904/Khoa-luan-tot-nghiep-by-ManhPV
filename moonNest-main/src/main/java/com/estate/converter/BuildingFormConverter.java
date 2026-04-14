package com.estate.converter;

import com.estate.dto.BuildingFormDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.enums.PropertyType;
import com.estate.enums.TransactionType;
import com.estate.exception.BusinessException;
import com.estate.repository.DistrictRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.DistrictEntity;
import com.estate.repository.entity.RentAreaEntity;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class BuildingFormConverter {

    @Autowired private ModelMapper         modelMapper;
    @Autowired private DistrictRepository  districtRepository;
    @Autowired private StaffRepository     staffRepository;

    // ── Entity → DTO (dùng cho trang edit) ───────────────────────────────────
    public BuildingFormDTO toDTO(BuildingEntity entity) {
        BuildingFormDTO dto = modelMapper.map(entity, BuildingFormDTO.class);

        if (entity.getDirection() != null) {
            dto.setDirection(entity.getDirection().name());
        }

        if (entity.getLevel() != null) {
            dto.setLevel(entity.getLevel().name());
        }

        if (entity.getPropertyType() != null) {
            dto.setPropertyType(entity.getPropertyType().name());
        }

        if (entity.getTransactionType() != null) {
            dto.setTransactionType(entity.getTransactionType().name());
        }

        if (entity.getDistrict() != null) {
            dto.setDistrictId(entity.getDistrict().getId());
            String districtName =  entity.getDistrict().getName();
            dto.setDistrictName(districtName);
        }

        if (entity.getRentAreas() != null && !entity.getRentAreas().isEmpty()) {
            dto.setRentAreaValues(
                    entity.getRentAreas().stream()
                            .map(a -> a.getValue().toString())
                            .collect(Collectors.joining(","))
            );
        }

        if (entity.getStaffs_buildings() != null && !entity.getStaffs_buildings().isEmpty()) {
            dto.setStaffIds(
                    entity.getStaffs_buildings().stream()
                            .map(StaffEntity::getId)
                            .collect(Collectors.toList())
            );
        }

        return dto;
    }

    // ── DTO → Entity (dùng cho cả add và edit) ───────────────────────────────
    public void toEntity(BuildingEntity entity, BuildingFormDTO dto) {
        modelMapper.map(dto, entity);

        // Direction
        if (dto.getDirection() != null && !dto.getDirection().isBlank())
            entity.setDirection(Direction.valueOf(dto.getDirection()));
        else
            entity.setDirection(null);

        // Level
        if (dto.getLevel() != null && !dto.getLevel().isBlank())
            entity.setLevel(Level.valueOf(dto.getLevel()));
        else
            entity.setLevel(null);

        // PropertyType
        if (dto.getPropertyType() != null && !dto.getPropertyType().isBlank())
            entity.setPropertyType(PropertyType.valueOf(dto.getPropertyType()));

        // TransactionType
        if (dto.getTransactionType() != null && !dto.getTransactionType().isBlank())
            entity.setTransactionType(TransactionType.valueOf(dto.getTransactionType()));

        // Nếu FOR_SALE → null hết phí thuê; nếu FOR_RENT → null giá bán
        if (TransactionType.FOR_SALE.name().equals(dto.getTransactionType())) {
            entity.setRentPrice(null);
            entity.setServiceFee(null);
            entity.setCarFee(null);
            entity.setMotorbikeFee(null);
            entity.setWaterFee(null);
            entity.setElectricityFee(null);
            entity.setDeposit(null);
        } else {
            entity.setSalePrice(null);
        }

        // Tọa độ
        if (dto.getLatitude() != null)
            entity.setLatitude(BigDecimal.valueOf(dto.getLatitude()));
        else
            entity.setLatitude(null);

        if (dto.getLongitude() != null)
            entity.setLongitude(BigDecimal.valueOf(dto.getLongitude()));
        else
            entity.setLongitude(null);

        // District
        if (dto.getDistrictId() != null) {
            DistrictEntity district = districtRepository.findById(dto.getDistrictId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy quận/huyện"));
            entity.setDistrict(district);
        }

        // Staffs
        List<StaffEntity> staffs = dto.getStaffIds() != null
                ? staffRepository.findAllById(dto.getStaffIds())
                : List.of();
        entity.setStaffs_buildings(staffs);

        // RentAreas — chỉ áp dụng cho FOR_RENT
        entity.getRentAreas().clear();
        if (TransactionType.FOR_RENT.name().equals(dto.getTransactionType())
                && dto.getRentAreaValues() != null
                && !dto.getRentAreaValues().isBlank()) {
            List<RentAreaEntity> newAreas = Arrays.stream(dto.getRentAreaValues().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .map(v -> new RentAreaEntity(v, entity))
                    .toList();
            entity.getRentAreas().addAll(newAreas);
        }
    }
}