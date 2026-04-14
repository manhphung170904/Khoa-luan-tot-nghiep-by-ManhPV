package com.estate.converter;

import com.estate.dto.SaleContractListDTO;
import com.estate.repository.entity.SaleContractEntity;
import org.springframework.stereotype.Component;

@Component
public class SaleContractListConverter {

    public SaleContractListDTO toDto(SaleContractEntity entity) {
        SaleContractListDTO dto = new SaleContractListDTO();
        dto.setId(entity.getId());
        dto.setSalePrice(entity.getSalePrice());
        dto.setCreatedDate(entity.getCreatedDate());

        if (entity.getTransferDate() != null) {
            dto.setTransferDate(entity.getTransferDate().atStartOfDay());
        }

        if (entity.getBuilding() != null) {
            dto.setBuilding(entity.getBuilding().getName());
        }

        if (entity.getCustomer() != null) {
            dto.setCustomer(entity.getCustomer().getFullName());
        }

        if (entity.getStaff() != null) {
            dto.setStaff(entity.getStaff().getFullName());
        }

        return dto;
    }
}