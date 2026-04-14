package com.estate.converter;

import com.estate.dto.CustomerContractDTO;
import com.estate.dto.CustomerDetailDTO;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomerDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private CustomerContractConverter customerContractConverter;

    public CustomerDetailDTO toDTO(CustomerEntity entity) {
        CustomerDetailDTO dto = modelMapper.map(entity, CustomerDetailDTO.class);

        if (entity.getStaffs_customers() != null && !entity.getStaffs_customers().isEmpty()) {
            dto.setStaffs(
                    entity.getStaffs_customers()
                            .stream()
                            .collect(Collectors.toMap(
                                    s -> s.getFullName(),   // key
                                    s -> s.getId()          // value
                            ))
            );
        }

        List<ContractEntity> contracts = entity.getContracts();
        List<CustomerContractDTO> customerContractDTO = new ArrayList<>();
        for (ContractEntity c : contracts) {
            CustomerContractDTO contract = customerContractConverter.toDTO(c);
            customerContractDTO.add(contract);
        }

        dto.setCustomerContracts(customerContractDTO);

        return dto;
    }
}
