package com.estate.service;

import com.estate.dto.*;
import org.springframework.data.domain.Page;

import java.util.List;

public interface PropertyRequestService {

    // ====== Customer ======
    void submit(PropertyRequestFormDTO dto, Long customerId);
    List<PropertyRequestListDTO> getRequestsByCustomer(Long customerId);
    void cancel(Long requestId, Long customerId);

    // ====== Admin ======
    Page<PropertyRequestListDTO> getRequests(String status, int page, int size);
    PropertyRequestDetailDTO getRequestDetail(Long id);
    void reject(Long requestId, Long staffId, String reason);
    void markApproved(Long requestId, Long staffId, Long contractId, Long saleContractId);
    Long getPendingCount();

    // ====== Auto-fill data cho form tạo hợp đồng ======
    ContractFormDTO toContractForm(Long requestId);
    SaleContractFormDTO toSaleContractForm(Long requestId);
}
