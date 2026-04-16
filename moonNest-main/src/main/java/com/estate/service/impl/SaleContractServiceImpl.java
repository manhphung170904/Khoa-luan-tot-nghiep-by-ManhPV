package com.estate.service.impl;

import com.estate.converter.SaleContractDetailConverter;
import com.estate.converter.SaleContractFormConverter;
import com.estate.converter.SaleContractListConverter;
import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.dto.SaleContractListDTO;
import com.estate.exception.SaleContractValidationException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.PropertyRequestRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.PropertyRequestEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.service.SaleContractService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    // -------------------------------------------------------------------------
    // READ
    // -------------------------------------------------------------------------

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
        if (entity.getBuilding() != null)  dto.setBuildingId(entity.getBuilding().getId());
        if (entity.getCustomer() != null)  dto.setCustomerId(entity.getCustomer().getId());
        if (entity.getStaff() != null)     dto.setStaffId(entity.getStaff().getId());
        return dto;
    }

    // -------------------------------------------------------------------------
    // SAVE (ADD + EDIT)
    // -------------------------------------------------------------------------

    @Override
    public void save(SaleContractFormDTO dto) {
        if (dto.getId() == null) {
            saveNew(dto);
        } else {
            saveEdit(dto);
        }
    }

    /** ADD: validate đầy đủ 3 điều kiện, rồi tạo entity mới */
    private void saveNew(SaleContractFormDTO dto) {
        // 1. Building phải FOR_SALE
        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy bất động sản"));

        if (!"FOR_SALE".equals(building.getTransactionType().toString())) {
            throw new SaleContractValidationException(
                    "Bất động sản \"" + building.getName() + "\" không phải loại mua bán");
        }

        // 2. Building chưa có hợp đồng mua bán nào
        if (saleContractRepository.existsByBuilding_Id(dto.getBuildingId())) {
            throw new SaleContractValidationException(
                    "Bất động sản \"" + building.getName() + "\" đã được bán");
        }

        // 3. Staff phải quản lý cả building lẫn customer
        validateStaffAssignment(dto.getBuildingId(), dto.getCustomerId(), dto.getStaffId());

        SaleContractEntity entity = saleContractFormConverter.toEntity(dto);
        saleContractRepository.save(entity);

        // Cập nhật trạng thái yêu cầu
        if (dto.getFromRequestId() != null) {
            PropertyRequestEntity request = propertyRequestRepository.findById(dto.getFromRequestId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy yêu cầu"));
            request.setStatus("APPROVED");
            propertyRequestRepository.save(request);
        }
    }

    /** EDIT: chỉ cho phép cập nhật transferDate */
    private void saveEdit(SaleContractFormDTO dto) {
        SaleContractEntity entity = findEntityById(dto.getId());

        if (dto.getTransferDate() != null && entity.getCreatedDate() != null) {
            LocalDate signedDate = entity.getCreatedDate().toLocalDate();
            if (!dto.getTransferDate().isAfter(signedDate)) {
                throw new SaleContractValidationException(
                        "Ngày bàn giao phải sau ngày ký hợp đồng ("
                                + signedDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")");
            }
        }

        entity.setTransferDate(dto.getTransferDate());
        saleContractRepository.save(entity);
    }

    // -------------------------------------------------------------------------
    // DELETE
    // -------------------------------------------------------------------------

    @Override
    public void delete(Long id) {
        saleContractRepository.deleteById(id);
    }

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    private void validateStaffAssignment(Long buildingId, Long customerId, Long staffId) {
        if (!staffRepository.existsByStaffIdAndBuildingId(staffId, buildingId)) {
            throw new SaleContractValidationException(
                    "Nhân viên được chọn không quản lý bất động sản này");
        }
        if (!staffRepository.existsByStaffIdAndCustomerId(staffId, customerId)) {
            throw new SaleContractValidationException(
                    "Nhân viên được chọn không quản lý khách hàng này");
        }
    }

    private SaleContractEntity findEntityById(Long id) {
        return saleContractRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy hợp đồng mua bán với id: " + id));
    }

    private Page<SaleContractListDTO> toPageDTO(Page<SaleContractEntity> entityPage) {
        List<SaleContractListDTO> dtoList = new ArrayList<>();
        for (SaleContractEntity sc : entityPage) {
            dtoList.add(saleContractListConverter.toDto(sc));
        }
        return new PageImpl<>(dtoList, entityPage.getPageable(), entityPage.getTotalElements());
    }
}
