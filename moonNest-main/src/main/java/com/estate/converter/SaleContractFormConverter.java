package com.estate.converter;

import com.estate.dto.SaleContractFormDTO;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.repository.entity.StaffEntity;
import org.springframework.stereotype.Component;

@Component
public class SaleContractFormConverter {

    public SaleContractEntity toEntity(SaleContractFormDTO dto) {
        SaleContractEntity entity = new SaleContractEntity();
        return mergeToEntity(dto, entity);
    }

    public SaleContractEntity mergeToEntity(SaleContractFormDTO dto, SaleContractEntity entity) {
        entity.setSalePrice(dto.getSalePrice());
        entity.setTransferDate(dto.getTransferDate());
        entity.setNote(dto.getNote());

        BuildingEntity building = new BuildingEntity();
        building.setId(dto.getBuildingId());
        entity.setBuilding(building);

        CustomerEntity customer = new CustomerEntity();
        customer.setId(dto.getCustomerId());
        entity.setCustomer(customer);

        StaffEntity staff = new StaffEntity();
        staff.setId(dto.getStaffId());
        entity.setStaff(staff);

        return entity;
    }
}