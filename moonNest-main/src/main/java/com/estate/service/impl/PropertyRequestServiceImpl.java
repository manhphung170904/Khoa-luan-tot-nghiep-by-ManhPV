package com.estate.service.impl;

import com.estate.dto.*;
import com.estate.enums.TransactionType;
import com.estate.exception.BusinessException;
import com.estate.repository.*;
import com.estate.repository.entity.*;
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

    // ======================== CUSTOMER ========================

    @Override
    public void submit(PropertyRequestFormDTO dto, Long customerId) {
        // Validate building tá»“n táº¡i
        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y báº¥t Ä‘á»™ng sáº£n"));

        // RÃ ng buá»™c #1: request_type pháº£i match transaction_type
        if ("RENT".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_RENT) {
            throw new BusinessException("Báº¥t Ä‘á»™ng sáº£n nÃ y khÃ´ng cho thuÃª");
        }
        if ("BUY".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_SALE) {
            throw new BusinessException("Báº¥t Ä‘á»™ng sáº£n nÃ y khÃ´ng bÃ¡n");
        }

        // RÃ ng buá»™c #3: Building FOR_SALE chÆ°a cÃ³ sale_contract
        if ("BUY".equals(dto.getRequestType()) && saleContractRepository.existsByBuilding_Id(building.getId())) {
            throw new BusinessException("Báº¥t Ä‘á»™ng sáº£n nÃ y Ä‘Ã£ cÃ³ há»£p Ä‘á»“ng mua bÃ¡n");
        }

        // RÃ ng buá»™c #4: KhÃ´ng trÃ¹ng request (cÃ¹ng KH + cÃ¹ng building + PENDING)
        if (propertyRequestRepository.existsByCustomerIdAndBuildingIdAndStatus(customerId, dto.getBuildingId(), "PENDING")) {
            throw new BusinessException("Báº¡n Ä‘Ã£ gá»­i yÃªu cáº§u cho báº¥t Ä‘á»™ng sáº£n nÃ y rá»“i, vui lÃ²ng chá» xá»­ lÃ½");
        }

        // Validate ngÃ y (cho RENT)
        if ("RENT".equals(dto.getRequestType())) {
            if (dto.getDesiredStartDate() != null && dto.getDesiredEndDate() != null) {
                if (!dto.getDesiredEndDate().isAfter(dto.getDesiredStartDate())) {
                    throw new BusinessException("NgÃ y káº¿t thÃºc pháº£i sau ngÃ y báº¯t Ä‘áº§u");
                }
            }
        }

        // Táº¡o entity
        CustomerEntity customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y khÃ¡ch hÃ ng"));

        PropertyRequestEntity entity = new PropertyRequestEntity();
        entity.setCustomer(customer);
        entity.setBuilding(building);
        entity.setRequestType(dto.getRequestType());
        entity.setFullName(customer.getFullName()); // Láº¥y tá»« thÃ´ng tin khÃ¡ch hÃ ng
        entity.setPhone(customer.getPhone());             // Láº¥y tá»« form ngÆ°á»i dÃ¹ng nháº­p
        entity.setEmail(customer.getEmail());             // Láº¥y tá»« form ngÆ°á»i dÃ¹ng nháº­p
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
        for (PropertyRequestEntity e : entities) {
            result.add(toListDTO(e));
        }
        return result;
    }

    @Override
    public void cancel(Long requestId, Long customerId) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        if (!entity.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("Báº¡n khÃ´ng cÃ³ quyá»n há»§y yÃªu cáº§u nÃ y");
        }

        if (!"PENDING".equals(entity.getStatus())) {
            throw new BusinessException("Chá»‰ cÃ³ thá»ƒ há»§y yÃªu cáº§u Ä‘ang chá» xá»­ lÃ½");
        }

        entity.setStatus("CANCELLED");
        propertyRequestRepository.save(entity);
    }

    // ======================== ADMIN ========================

    @Override
    public Page<PropertyRequestListDTO> getRequests(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PropertyRequestEntity> entityPage;

        if (status != null && !status.isBlank()) {
            entityPage = propertyRequestRepository.findByStatusOrderByCreatedDateDesc(status, pageable);
        } else {
            entityPage = propertyRequestRepository.findAllByOrderByCreatedDateDesc(pageable);
        }

        List<PropertyRequestListDTO> dtoList = new ArrayList<>();
        for (PropertyRequestEntity e : entityPage) {
            dtoList.add(toListDTO(e));
        }

        return new PageImpl<>(dtoList, entityPage.getPageable(), entityPage.getTotalElements());
    }

    @Override
    public PropertyRequestDetailDTO getRequestDetail(Long id) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        return toDetailDTO(entity);
    }

    @Override
    public void reject(Long requestId, Long staffId, String reason) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        if (!"PENDING".equals(entity.getStatus())) {
            throw new BusinessException("YÃªu cáº§u nÃ y Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½ rá»“i");
        }

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn"));

        entity.setStatus("REJECTED");
        entity.setAdminNote(reason);
        entity.setProcessedBy(staff);
        propertyRequestRepository.save(entity);
    }

    @Override
    public void markApproved(Long requestId, Long staffId, Long contractId, Long saleContractId) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn"));

        entity.setStatus("APPROVED");
        entity.setProcessedBy(staff);

        if (contractId != null) {
            ContractEntity contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y há»£p Ä‘á»“ng"));
            entity.setContract(contract);
        }

        if (saleContractId != null) {
            SaleContractEntity saleContract = saleContractRepository.findById(saleContractId)
                    .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y há»£p Ä‘á»“ng mua bÃ¡n"));
            entity.setSaleContract(saleContract);
        }

        propertyRequestRepository.save(entity);
    }

    @Override
    public Long getPendingCount() {
        return propertyRequestRepository.countByStatus("PENDING");
    }

    // ======================== AUTO-FILL ========================

    @Override
    public ContractFormDTO toContractForm(Long requestId) {
        PropertyRequestEntity req = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        validateRequestReadyForContract(req);

        ContractFormDTO form = new ContractFormDTO();
        form.setBuildingId(req.getBuilding().getId());
        form.setCustomerId(req.getCustomer().getId());
        form.setRentArea(req.getDesiredArea());

        // GiÃ¡: dÃ¹ng giÃ¡ KH Ä‘á» xuáº¥t náº¿u cÃ³, náº¿u khÃ´ng dÃ¹ng giÃ¡ building
        form.setRentPrice(req.getOfferedPrice() != null
                ? req.getOfferedPrice()
                : req.getBuilding().getRentPrice());

        form.setStartDate(req.getDesiredStartDate());
        form.setEndDate(req.getDesiredEndDate());
        form.setStatus("ACTIVE");

        return form;
    }

    @Override
    public SaleContractFormDTO toSaleContractForm(Long requestId) {
        PropertyRequestEntity req = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u"));

        validateRequestReadyForSaleContract(req);

        SaleContractFormDTO form = new SaleContractFormDTO();
        form.setBuildingId(req.getBuilding().getId());
        form.setCustomerId(req.getCustomer().getId());

        // GiÃ¡: dÃ¹ng giÃ¡ KH Ä‘á» xuáº¥t náº¿u cÃ³, náº¿u khÃ´ng dÃ¹ng giÃ¡ building
        form.setSalePrice(req.getOfferedPrice() != null
                ? req.getOfferedPrice()
                : req.getBuilding().getSalePrice());

        form.setNote("Táº¡o tá»« yÃªu cáº§u #" + req.getId());

        return form;
    }

    private void validateRequestReadyForContract(PropertyRequestEntity req) {
        if (!"PENDING".equals(req.getStatus())) {
            throw new BusinessException("Only pending requests can be converted into a contract");
        }
        if (!"RENT".equals(req.getRequestType())) {
            throw new BusinessException("Only RENT requests can be converted into a rental contract");
        }
    }

    private void validateRequestReadyForSaleContract(PropertyRequestEntity req) {
        if (!"PENDING".equals(req.getStatus())) {
            throw new BusinessException("Only pending requests can be converted into a sale contract");
        }
        if (!"BUY".equals(req.getRequestType())) {
            throw new BusinessException("Only BUY requests can be converted into a sale contract");
        }
    }

    // ======================== CONVERTER HELPERS ========================

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

        // KH info
        dto.setCustomerId(entity.getCustomer().getId());
        dto.setCustomerName(entity.getCustomer().getFullName());
        dto.setPhone(entity.getPhone());
        dto.setEmail(entity.getEmail());

        // Building info
        BuildingEntity b = entity.getBuilding();
        dto.setBuildingId(b.getId());
        dto.setBuildingName(b.getName());
        dto.setBuildingAddress(buildAddress(b));
        dto.setTransactionType(b.getTransactionType().name());
        dto.setBuildingRentPrice(b.getRentPrice());
        dto.setBuildingSalePrice(b.getSalePrice());

        // Request details
        dto.setRequestType(entity.getRequestType());
        dto.setRequestTypeLabel(getRequestTypeLabel(entity.getRequestType()));
        dto.setDesiredArea(entity.getDesiredArea());
        dto.setDesiredStartDate(entity.getDesiredStartDate());
        dto.setDesiredEndDate(entity.getDesiredEndDate());
        dto.setOfferedPrice(entity.getOfferedPrice());
        dto.setMessage(entity.getMessage());

        // Processing
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

    private String buildAddress(BuildingEntity b) {
        StringBuilder address = new StringBuilder();
        if (b.getStreet() != null) address.append(b.getStreet());
        if (b.getWard() != null) {
            if (!address.isEmpty()) address.append(", ");
            address.append(b.getWard());
        }
        if (b.getDistrict() != null) {
            if (!address.isEmpty()) address.append(", ");
            address.append(b.getDistrict().getName());
        }
        return address.toString();
    }

    private String getRequestTypeLabel(String type) {
        return switch (type) {
            case "RENT" -> "ThuÃª";
            case "BUY" -> "Mua";
            default -> type;
        };
    }

    private String getStatusLabel(String status) {
        return switch (status) {
            case "PENDING" -> "Chá» xá»­ lÃ½";
            case "APPROVED" -> "ÄÃ£ duyá»‡t";
            case "REJECTED" -> "ÄÃ£ tá»« chá»‘i";
            case "CANCELLED" -> "ÄÃ£ há»§y";
            default -> status;
        };
    }
}
