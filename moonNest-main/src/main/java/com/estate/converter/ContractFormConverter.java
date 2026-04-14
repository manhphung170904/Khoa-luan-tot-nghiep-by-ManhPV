package com.estate.converter;

import com.estate.dto.BuildingFormDTO;
import com.estate.dto.ContractFormDTO;
import com.estate.exception.BusinessException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class ContractFormConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private CustomerRepository customerRepository;

    public ContractEntity toEntity(ContractEntity entity, ContractFormDTO dto) {
        modelMapper.map(dto, entity);

        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy tòa nhà"));
        entity.setBuilding(building);

        StaffEntity staff = staffRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));
        entity.setStaff(staff);

        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng"));
        entity.setCustomer(customer);

        return entity;
    }

    public ContractFormDTO toDTO(ContractEntity entity) {
        ContractFormDTO dto = modelMapper.map(entity, ContractFormDTO.class);
        dto.setBuildingId(entity.getBuilding().getId());
        dto.setCustomerId(entity.getCustomer().getId());
        dto.setStaffId(entity.getStaff().getId());
        return dto;
    }
}
