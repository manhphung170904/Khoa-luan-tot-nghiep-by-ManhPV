package com.estate.service.impl;

import com.estate.converter.SaleContractDetailConverter;
import com.estate.converter.SaleContractFormConverter;
import com.estate.converter.SaleContractListConverter;
import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.dto.SaleContractListDTO;
import com.estate.exception.ResourceNotFoundException;
import com.estate.exception.SaleContractValidationException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.PropertyRequestRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.PropertyRequestEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.service.SaleContractService;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SaleContractServiceImpl implements SaleContractService {
    @Autowired
    private SaleContractRepository saleContractRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private SaleContractListConverter saleContractListConverter;

    @Autowired
    private SaleContractDetailConverter saleContractDetailConverter;

    @Autowired
    private SaleContractFormConverter saleContractFormConverter;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private PropertyRequestRepository propertyRequestRepository;

    @Override
    public Long countByBuildingId(Long buildingId) {
        return saleContractRepository.countByBuildingId(buildingId);
    }

    @Override
    public Long countByStaffId(Long staffId) {
        return saleContractRepository.countByStaffId(staffId);
    }

    @Override
    public Page<SaleContractListDTO> getSaleContracts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return toPageDTO(saleContractRepository.findAll(pageable));
    }

    @Override
    public Page<SaleContractListDTO> search(SaleContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return toPageDTO(saleContractRepository.searchSaleContracts(filter, pageable));
    }

    @Override
    public Page<SaleContractDetailDTO> searchDetails(SaleContractFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<SaleContractEntity> entityPage = saleContractRepository.searchSaleContracts(filter, pageable);
        List<SaleContractDetailDTO> dtoList = new ArrayList<>();
        for (SaleContractEntity entity : entityPage) {
            dtoList.add(saleContractDetailConverter.toDto(entity));
        }
        return new PageImpl<>(dtoList, pageable, entityPage.getTotalElements());
    }

    @Override
    public SaleContractDetailDTO viewById(Long id) {
        return saleContractDetailConverter.toDto(findEntityById(id));
    }

    @Override
    public SaleContractFormDTO findById(Long id) {
        SaleContractEntity entity = findEntityById(id);
        SaleContractFormDTO dto = new SaleContractFormDTO();
        dto.setId(entity.getId());
        dto.setSalePrice(entity.getSalePrice());
        dto.setTransferDate(entity.getTransferDate());
        dto.setNote(entity.getNote());
        if (entity.getBuilding() != null) dto.setBuildingId(entity.getBuilding().getId());
        if (entity.getCustomer() != null) dto.setCustomerId(entity.getCustomer().getId());
        if (entity.getStaff() != null) dto.setStaffId(entity.getStaff().getId());
        return dto;
    }

    @Override
    public void save(SaleContractFormDTO dto) {
        if (dto.getId() == null) {
            saveNew(dto);
        } else {
            saveEdit(dto);
        }
    }

    private void saveNew(SaleContractFormDTO dto) {
        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new ResourceNotFoundException("Building was not found"));

        if (!"FOR_SALE".equals(building.getTransactionType().toString())) {
            throw new SaleContractValidationException(
                    "Building \"" + building.getName() + "\" is not a sale property"
            );
        }

        if (saleContractRepository.existsByBuilding_Id(dto.getBuildingId())) {
            throw new SaleContractValidationException(
                    "Building \"" + building.getName() + "\" has already been sold"
            );
        }

        validateStaffAssignment(dto.getBuildingId(), dto.getCustomerId(), dto.getStaffId());

        SaleContractEntity entity = saleContractFormConverter.toEntity(dto);
        saleContractRepository.save(entity);

        if (dto.getFromRequestId() != null) {
            PropertyRequestEntity request = propertyRequestRepository.findById(dto.getFromRequestId())
                    .orElseThrow(() -> new ResourceNotFoundException("Property request was not found"));
            if (!"PENDING".equals(request.getStatus())) {
                throw new SaleContractValidationException("Only pending requests can be converted into a sale contract");
            }
            if (!"BUY".equals(request.getRequestType())) {
                throw new SaleContractValidationException("Only BUY requests can be converted into a sale contract");
            }
            if (!request.getBuilding().getId().equals(dto.getBuildingId())
                    || !request.getCustomer().getId().equals(dto.getCustomerId())) {
                throw new SaleContractValidationException("Sale contract data does not match the selected request");
            }
            request.setStatus("APPROVED");
            request.setProcessedBy(entity.getStaff());
            request.setAdminNote(null);
            request.setContract(null);
            request.setSaleContract(entity);
            propertyRequestRepository.save(request);
        }
    }

    private void saveEdit(SaleContractFormDTO dto) {
        SaleContractEntity entity = findEntityById(dto.getId());
        if (dto.getTransferDate() != null && entity.getCreatedDate() != null) {
            LocalDate signedDate = entity.getCreatedDate().toLocalDate();
            if (!dto.getTransferDate().isAfter(signedDate)) {
                throw new SaleContractValidationException(
                        "Transfer date must be after the contract date ("
                                + signedDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")"
                );
            }
        }
        entity.setTransferDate(dto.getTransferDate());
        saleContractRepository.save(entity);
    }

    @Override
    public void delete(Long id) {
        saleContractRepository.deleteById(id);
    }

    private void validateStaffAssignment(Long buildingId, Long customerId, Long staffId) {
        if (!staffRepository.existsByStaffIdAndBuildingId(staffId, buildingId)) {
            throw new SaleContractValidationException(
                    "Selected staff does not manage the target building"
            );
        }
        if (!staffRepository.existsByStaffIdAndCustomerId(staffId, customerId)) {
            throw new SaleContractValidationException(
                    "Selected staff does not manage the target customer"
            );
        }
    }

    private SaleContractEntity findEntityById(Long id) {
        return saleContractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale contract was not found"));
    }

    private Page<SaleContractListDTO> toPageDTO(Page<SaleContractEntity> entityPage) {
        List<SaleContractListDTO> dtoList = new ArrayList<>();
        for (SaleContractEntity saleContract : entityPage) {
            dtoList.add(saleContractListConverter.toDto(saleContract));
        }
        return new PageImpl<>(dtoList, entityPage.getPageable(), entityPage.getTotalElements());
    }
}
