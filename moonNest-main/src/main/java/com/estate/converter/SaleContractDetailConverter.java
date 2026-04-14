package com.estate.converter;

import com.estate.dto.SaleContractDetailDTO;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.repository.entity.StaffEntity;
import org.springframework.stereotype.Component;

@Component
public class SaleContractDetailConverter {

    public SaleContractDetailDTO toDto(SaleContractEntity entity) {
        SaleContractDetailDTO dto = new SaleContractDetailDTO();
        dto.setId(entity.getId());
        dto.setSalePrice(entity.getSalePrice());
        dto.setTransferDate(entity.getTransferDate());
        dto.setNote(entity.getNote());
        dto.setCreatedDate(entity.getCreatedDate());
        dto.setModifiedDate(entity.getModifiedDate());

        if (entity.getCustomer() != null) {
            CustomerEntity c = entity.getCustomer();
            SaleContractDetailDTO.CustomerInfo ci = new SaleContractDetailDTO.CustomerInfo();
            ci.setId(c.getId());
            ci.setFullName(c.getFullName());
            ci.setPhone(c.getPhone());
            ci.setEmail(c.getEmail());
            dto.setCustomer(ci);
        }

        if (entity.getBuilding() != null) {
            BuildingEntity b = entity.getBuilding();
            SaleContractDetailDTO.BuildingInfo bi = new SaleContractDetailDTO.BuildingInfo();
            bi.setId(b.getId());
            bi.setName(b.getName());

            String districtName = b.getDistrict() != null ? b.getDistrict().getName() : "";
            String address = b.getStreet() + ", " + b.getWard() + ", " + districtName;
            bi.setAddress(address);

            bi.setLevel(b.getLevel().toString());
            dto.setBuilding(bi);
        }

        if (entity.getStaff() != null) {
            StaffEntity s = entity.getStaff();
            SaleContractDetailDTO.StaffInfo si = new SaleContractDetailDTO.StaffInfo();
            si.setId(s.getId());
            si.setFullName(s.getFullName());
            si.setPhone(s.getPhone());
            si.setEmail(s.getEmail());
            dto.setStaff(si);
        }

        return dto;
    }
}