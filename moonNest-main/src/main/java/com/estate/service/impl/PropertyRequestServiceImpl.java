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
        // Validate building tồn tại
        BuildingEntity building = buildingRepository.findById(dto.getBuildingId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy bất động sản"));

        // Ràng buộc #1: request_type phải match transaction_type
        if ("RENT".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_RENT) {
            throw new BusinessException("Bất động sản này không cho thuê");
        }
        if ("BUY".equals(dto.getRequestType()) && building.getTransactionType() != TransactionType.FOR_SALE) {
            throw new BusinessException("Bất động sản này không bán");
        }

        // Ràng buộc #3: Building FOR_SALE chưa có sale_contract
        if ("BUY".equals(dto.getRequestType()) && saleContractRepository.existsByBuilding_Id(building.getId())) {
            throw new BusinessException("Bất động sản này đã có hợp đồng mua bán");
        }

        // Ràng buộc #4: Không trùng request (cùng KH + cùng building + PENDING)
        if (propertyRequestRepository.existsByCustomerIdAndBuildingIdAndStatus(customerId, dto.getBuildingId(), "PENDING")) {
            throw new BusinessException("Bạn đã gửi yêu cầu cho bất động sản này rồi, vui lòng chờ xử lý");
        }

        // Validate ngày (cho RENT)
        if ("RENT".equals(dto.getRequestType())) {
            if (dto.getDesiredStartDate() != null && dto.getDesiredEndDate() != null) {
                if (!dto.getDesiredEndDate().isAfter(dto.getDesiredStartDate())) {
                    throw new BusinessException("Ngày kết thúc phải sau ngày bắt đầu");
                }
            }
        }

        // Tạo entity
        CustomerEntity customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng"));

        PropertyRequestEntity entity = new PropertyRequestEntity();
        entity.setCustomer(customer);
        entity.setBuilding(building);
        entity.setRequestType(dto.getRequestType());
        entity.setFullName(dto.getFullName());
        entity.setPhone(dto.getPhone());
        entity.setEmail(dto.getEmail());
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        if (!entity.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("Bạn không có quyền hủy yêu cầu này");
        }

        if (!"PENDING".equals(entity.getStatus())) {
            throw new BusinessException("Chỉ có thể hủy yêu cầu đang chờ xử lý");
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        return toDetailDTO(entity);
    }

    @Override
    public void reject(Long requestId, Long staffId, String reason) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        if (!"PENDING".equals(entity.getStatus())) {
            throw new BusinessException("Yêu cầu này đã được xử lý rồi");
        }

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        entity.setStatus("REJECTED");
        entity.setAdminNote(reason);
        entity.setProcessedBy(staff);
        propertyRequestRepository.save(entity);
    }

    @Override
    public void markApproved(Long requestId, Long staffId, Long contractId, Long saleContractId) {
        PropertyRequestEntity entity = propertyRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        entity.setStatus("APPROVED");
        entity.setProcessedBy(staff);

        if (contractId != null) {
            ContractEntity contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng"));
            entity.setContract(contract);
        }

        if (saleContractId != null) {
            SaleContractEntity saleContract = saleContractRepository.findById(saleContractId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng mua bán"));
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        ContractFormDTO form = new ContractFormDTO();
        form.setBuildingId(req.getBuilding().getId());
        form.setCustomerId(req.getCustomer().getId());
        form.setRentArea(req.getDesiredArea());

        // Giá: dùng giá KH đề xuất nếu có, nếu không dùng giá building
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu"));

        SaleContractFormDTO form = new SaleContractFormDTO();
        form.setBuildingId(req.getBuilding().getId());
        form.setCustomerId(req.getCustomer().getId());

        // Giá: dùng giá KH đề xuất nếu có, nếu không dùng giá building
        form.setSalePrice(req.getOfferedPrice() != null
                ? req.getOfferedPrice()
                : req.getBuilding().getSalePrice());

        form.setNote("Tạo từ yêu cầu #" + req.getId());

        return form;
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
