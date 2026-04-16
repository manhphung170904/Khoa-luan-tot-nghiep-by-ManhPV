package com.estate.service.impl;

import com.estate.dto.ContractFormDTO;
import com.estate.dto.PropertyRequestDetailDTO;
import com.estate.dto.PropertyRequestFormDTO;
import com.estate.dto.PropertyRequestListDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.enums.TransactionType;
import com.estate.exception.BusinessException;
import com.estate.exception.ForbiddenOperationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.ContractRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.PropertyRequestRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.PropertyRequestEntity;
import com.estate.repository.entity.SaleContractEntity;
import com.estate.service.PropertyRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class PropertyRequestServiceImpl implements PropertyRequestService {

    @Autowired
    private PropertyRequestRepository propertyRequestRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private SaleContractRepository saleContractRepository;

    @Override
    public void submit(PropertyRequestFormDTO dto, Long customerId) {
        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new ResourceNotFoundException("Building was not found"));

        validateRequestTypeAgainstBuilding(dto, building);
        validateNoDuplicatePendingRequest(customerId, dto.getBuildingId());
        validateDateRange(dto);

        CustomerEntity customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer was not found"));

        PropertyRequestEntity entity = new PropertyRequestEntity();
        entity.setCustomer(customer);
        entity.setBuilding(building);
        entity.setRequestType(dto.getRequestType());
        entity.setFullName(customer.getFullName());
        entity.setPhone(customer.getPhone());
        entity.setEmail(customer.getEmail());
        entity.setDesiredArea(dto.getDesiredArea());
        entity.setDesiredStartDate(dto.getDesiredStartDate());
        entity.setDesiredEndDate(dto.getDesiredEndDate());
        entity.setOfferedPrice(dto.getOfferedPrice());
        entity.setMessage(dto.getMessage());
        entity.setStatus("PENDING");

        propertyRequestRepository.save(entity);
    }

    @Override
    public List<PropertyRequestListDTO> getRequestsByCustomer(Long customerId) {
        List<PropertyRequestEntity> entities = propertyRequestRepository.findByCustomerIdOrderByCreatedDateDesc(customerId);
        List<PropertyRequestListDTO> result = new ArrayList<>();
        for (PropertyRequestEntity entity : entities) {
            result.add(toListDTO(entity));
        }
        return result;
    }

    @Override
    public void cancel(Long requestId, Long customerId) {
        PropertyRequestEntity entity = requireRequest(requestId);

        if (!Objects.equals(entity.getCustomer().getId(), customerId)) {
            throw new ForbiddenOperationException("You cannot cancel another customer's request");
        }
        ensurePending(entity, "Only pending requests can be cancelled");

        entity.setStatus("CANCELLED");
        propertyRequestRepository.save(entity);
    }

    @Override
    public Page<PropertyRequestListDTO> getRequests(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PropertyRequestEntity> entityPage = status != null && !status.isBlank()
                ? propertyRequestRepository.findByStatusOrderByCreatedDateDesc(status, pageable)
                : propertyRequestRepository.findAllByOrderByCreatedDateDesc(pageable);

        List<PropertyRequestListDTO> dtoList = new ArrayList<>();
        for (PropertyRequestEntity entity : entityPage) {
            dtoList.add(toListDTO(entity));
        }
        return new PageImpl<>(dtoList, entityPage.getPageable(), entityPage.getTotalElements());
    }

    @Override
    public PropertyRequestDetailDTO getRequestDetail(Long id) {
        return toDetailDTO(requireRequest(id));
    }

    @Override
    public void reject(Long requestId, Long staffId, String reason) {
        PropertyRequestEntity entity = requireRequest(requestId);
        ensurePending(entity, "Only pending requests can be rejected");

        entity.setStatus("REJECTED");
        entity.setAdminNote(reason == null ? "" : reason.trim());
        entity.setProcessedBy(
                staffRepository.findById(staffId)
                        .orElseThrow(() -> new ResourceNotFoundException("Processing staff was not found"))
        );
        propertyRequestRepository.save(entity);
    }

    @Override
    public void markApproved(Long requestId, Long staffId, Long contractId, Long saleContractId) {
        PropertyRequestEntity entity = requireRequest(requestId);
        ensurePending(entity, "Only pending requests can be approved");
        validateApprovalPayload(entity, contractId, saleContractId);

        entity.setStatus("APPROVED");
        entity.setAdminNote(null);
        entity.setProcessedBy(
                staffRepository.findById(staffId)
                        .orElseThrow(() -> new ResourceNotFoundException("Processing staff was not found"))
        );
        entity.setContract(null);
        entity.setSaleContract(null);

        if (contractId != null) {
            ContractEntity contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new ResourceNotFoundException("Contract was not found"));
            validateContractMatchesRequest(entity, contract);
            entity.setContract(contract);
        }

        if (saleContractId != null) {
            SaleContractEntity saleContract = saleContractRepository.findById(saleContractId)
                    .orElseThrow(() -> new ResourceNotFoundException("Sale contract was not found"));
            validateSaleContractMatchesRequest(entity, saleContract);
            entity.setSaleContract(saleContract);
        }

        propertyRequestRepository.save(entity);
    }

    @Override
    public Long getPendingCount() {
        return propertyRequestRepository.countByStatus("PENDING");
    }

    @Override
    public ContractFormDTO toContractForm(Long requestId) {
        PropertyRequestEntity request = requireRequest(requestId);
        validateRequestReadyForContract(request);

        ContractFormDTO form = new ContractFormDTO();
        form.setBuildingId(request.getBuilding().getId());
        form.setCustomerId(request.getCustomer().getId());
        form.setRentArea(request.getDesiredArea());
        form.setRentPrice(request.getOfferedPrice() != null ? request.getOfferedPrice() : request.getBuilding().getRentPrice());
        form.setStartDate(request.getDesiredStartDate());
        form.setEndDate(request.getDesiredEndDate());
        form.setStatus("ACTIVE");
        return form;
    }

    @Override
    public SaleContractFormDTO toSaleContractForm(Long requestId) {
        PropertyRequestEntity request = requireRequest(requestId);
        validateRequestReadyForSaleContract(request);

        SaleContractFormDTO form = new SaleContractFormDTO();
        form.setBuildingId(request.getBuilding().getId());
        form.setCustomerId(request.getCustomer().getId());
        form.setSalePrice(request.getOfferedPrice() != null ? request.getOfferedPrice() : request.getBuilding().getSalePrice());
        form.setNote("Created from property request #" + request.getId());
        return form;
    }

    private PropertyRequestEntity requireRequest(Long requestId) {
        return propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Property request was not found"));
    }

    private void validateRequestTypeAgainstBuilding(PropertyRequestFormDTO dto, BuildingEntity building) {
        if ("RENT".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_RENT) {
            throw new BusinessException("This building is not available for rent");
        }
        if ("BUY".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_SALE) {
            throw new BusinessException("This building is not available for sale");
        }
        if ("BUY".equals(dto.getRequestType()) && saleContractRepository.existsByBuilding_Id(building.getId())) {
            throw new BusinessException("This building already has a sale contract");
        }
    }

    private void validateNoDuplicatePendingRequest(Long customerId, Long buildingId) {
        if (propertyRequestRepository.existsByCustomerIdAndBuildingIdAndStatus(customerId, buildingId, "PENDING")) {
            throw new BusinessException("A pending request already exists for this building");
        }
    }

    private void validateDateRange(PropertyRequestFormDTO dto) {
        if (!"RENT".equals(dto.getRequestType())) {
            return;
        }
        if (dto.getDesiredStartDate() != null
                && dto.getDesiredEndDate() != null
                && !dto.getDesiredEndDate().isAfter(dto.getDesiredStartDate())) {
            throw new BusinessException("Desired end date must be after desired start date");
        }
    }

    private void ensurePending(PropertyRequestEntity entity, String message) {
        if (!"PENDING".equals(entity.getStatus())) {
            throw new BusinessException(message);
        }
    }

    private void validateApprovalPayload(PropertyRequestEntity entity, Long contractId, Long saleContractId) {
        boolean hasContract = contractId != null;
        boolean hasSaleContract = saleContractId != null;

        if (hasContract == hasSaleContract) {
            throw new BusinessException("Approval requires exactly one downstream contract reference");
        }
        if ("RENT".equals(entity.getRequestType()) && !hasContract) {
            throw new BusinessException("RENT requests must be linked to a rental contract");
        }
        if ("BUY".equals(entity.getRequestType()) && !hasSaleContract) {
            throw new BusinessException("BUY requests must be linked to a sale contract");
        }
    }

    private void validateContractMatchesRequest(PropertyRequestEntity request, ContractEntity contract) {
        if (!Objects.equals(contract.getBuilding().getId(), request.getBuilding().getId())
                || !Objects.equals(contract.getCustomer().getId(), request.getCustomer().getId())) {
            throw new BusinessException("Contract does not match the selected property request");
        }
    }

    private void validateSaleContractMatchesRequest(PropertyRequestEntity request, SaleContractEntity saleContract) {
        if (!Objects.equals(saleContract.getBuilding().getId(), request.getBuilding().getId())
                || !Objects.equals(saleContract.getCustomer().getId(), request.getCustomer().getId())) {
            throw new BusinessException("Sale contract does not match the selected property request");
        }
    }

    private void validateRequestReadyForContract(PropertyRequestEntity request) {
        ensurePending(request, "Only pending requests can be converted into a contract");
        if (!"RENT".equals(request.getRequestType())) {
            throw new BusinessException("Only RENT requests can be converted into a rental contract");
        }
    }

    private void validateRequestReadyForSaleContract(PropertyRequestEntity request) {
        ensurePending(request, "Only pending requests can be converted into a sale contract");
        if (!"BUY".equals(request.getRequestType())) {
            throw new BusinessException("Only BUY requests can be converted into a sale contract");
        }
    }

    private PropertyRequestListDTO toListDTO(PropertyRequestEntity entity) {
        PropertyRequestListDTO dto = new PropertyRequestListDTO();
        dto.setId(entity.getId());
        dto.setCustomerName(entity.getCustomer().getFullName());
        dto.setBuildingName(entity.getBuilding().getName());
        dto.setRequestType(entity.getRequestType());
        dto.setRequestTypeLabel(getRequestTypeLabel(entity.getRequestType()));
        dto.setStatus(entity.getStatus());
        dto.setStatusLabel(getStatusLabel(entity.getStatus()));
        dto.setCreatedDate(entity.getCreatedDate());
        return dto;
    }

    private PropertyRequestDetailDTO toDetailDTO(PropertyRequestEntity entity) {
        PropertyRequestDetailDTO dto = new PropertyRequestDetailDTO();
        dto.setId(entity.getId());
        dto.setCustomerId(entity.getCustomer().getId());
        dto.setCustomerName(entity.getCustomer().getFullName());
        dto.setPhone(entity.getPhone());
        dto.setEmail(entity.getEmail());

        BuildingEntity building = entity.getBuilding();
        dto.setBuildingId(building.getId());
        dto.setBuildingName(building.getName());
        dto.setBuildingAddress(buildAddress(building));
        dto.setTransactionType(building.getTransactionType().name());
        dto.setBuildingRentPrice(building.getRentPrice());
        dto.setBuildingSalePrice(building.getSalePrice());

        dto.setRequestType(entity.getRequestType());
        dto.setRequestTypeLabel(getRequestTypeLabel(entity.getRequestType()));
        dto.setDesiredArea(entity.getDesiredArea());
        dto.setDesiredStartDate(entity.getDesiredStartDate());
        dto.setDesiredEndDate(entity.getDesiredEndDate());
        dto.setOfferedPrice(entity.getOfferedPrice());
        dto.setMessage(entity.getMessage());
        dto.setStatus(entity.getStatus());
        dto.setStatusLabel(getStatusLabel(entity.getStatus()));
        dto.setAdminNote(entity.getAdminNote());
        if (entity.getProcessedBy() != null) {
            dto.setProcessedByName(entity.getProcessedBy().getFullName());
        }
        if (entity.getContract() != null) {
            dto.setContractId(entity.getContract().getId());
        }
        if (entity.getSaleContract() != null) {
            dto.setSaleContractId(entity.getSaleContract().getId());
        }
        dto.setCreatedDate(entity.getCreatedDate());
        dto.setModifiedDate(entity.getModifiedDate());
        return dto;
    }

    private String buildAddress(BuildingEntity building) {
        StringBuilder address = new StringBuilder();
        if (building.getStreet() != null) {
            address.append(building.getStreet());
        }
        if (building.getWard() != null) {
            if (!address.isEmpty()) {
                address.append(", ");
            }
            address.append(building.getWard());
        }
        if (building.getDistrict() != null) {
            if (!address.isEmpty()) {
                address.append(", ");
            }
            address.append(building.getDistrict().getName());
        }
        return address.toString();
    }

    private String getRequestTypeLabel(String type) {
        return switch (type) {
            case "RENT" -> "Thuê";
            case "BUY" -> "Mua";
            default -> type;
        };
    }

    private String getStatusLabel(String status) {
        return switch (status) {
            case "PENDING" -> "Chờ xử lý";
            case "APPROVED" -> "Đã duyệt";
            case "REJECTED" -> "Đã từ chối";
            case "CANCELLED" -> "Đã hủy";
            default -> status;
        };
    }
}
