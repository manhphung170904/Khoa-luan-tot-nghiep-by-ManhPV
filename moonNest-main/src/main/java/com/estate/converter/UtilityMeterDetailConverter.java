package com.estate.converter;

import com.estate.dto.UtilityMeterDetailDTO;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.ContractRepository;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.UtilityMeterEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UtilityMeterDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ContractRepository contractRepository;

    public UtilityMeterDetailDTO toDTO(UtilityMeterEntity entity) {
        return modelMapper.map(entity, UtilityMeterDetailDTO.class);
    }

    public void toEntity(UtilityMeterDetailDTO dto, UtilityMeterEntity entity) {
        modelMapper.map(dto, entity);

        ContractEntity contract = contractRepository.findById(dto.getContractId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hợp đồng."));
        entity.setContract(contract);
    }
}
