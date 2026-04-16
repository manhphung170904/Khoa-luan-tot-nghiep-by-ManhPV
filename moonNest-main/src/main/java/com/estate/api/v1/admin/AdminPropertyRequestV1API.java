package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.ContractFormDTO;
import com.estate.dto.PendingCountResponseDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.PropertyRequestApprovalDTO;
import com.estate.dto.PropertyRequestDetailDTO;
import com.estate.dto.PropertyRequestListDTO;
import com.estate.dto.PropertyRequestRejectionDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.PropertyRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/property-requests")
@RequiredArgsConstructor
public class AdminPropertyRequestV1API {
    private final PropertyRequestService propertyRequestService;

    @GetMapping
    public PageResponse<PropertyRequestListDTO> getRequestsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status
    ) {
        return PageResponse.from(propertyRequestService.getRequests(status, page - 1, size));
    }

    @GetMapping("/{id}")
    public PropertyRequestDetailDTO getRequestDetail(@PathVariable Long id) {
        return propertyRequestService.getRequestDetail(id);
    }

    @PostMapping("/{id}/reject")
    public ApiMessageResponse<Void> rejectRequest(
            @PathVariable Long id,
            @RequestBody(required = false) PropertyRequestRejectionDTO body,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        String reason = body == null || body.getReason() == null ? "" : body.getReason();
        propertyRequestService.reject(id, user.getUserId(), reason);
        return ApiMessageResponse.of("Yêu cầu của bạn đã bị từ chối.");
    }

    @PostMapping("/{id}/approve")
    public ApiMessageResponse<Void> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) PropertyRequestApprovalDTO body,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long contractId = body == null ? null : body.getContractId();
        Long saleContractId = body == null ? null : body.getSaleContractId();
        propertyRequestService.markApproved(id, user.getUserId(), contractId, saleContractId);
        return ApiMessageResponse.of("Yêu cầu của bạn đã được chấp thuận.");
    }

    @GetMapping("/{id}/contract-data")
    public ContractFormDTO getContractData(@PathVariable Long id) {
        return propertyRequestService.toContractForm(id);
    }

    @GetMapping("/{id}/sale-contract-data")
    public SaleContractFormDTO getSaleContractData(@PathVariable Long id) {
        return propertyRequestService.toSaleContractForm(id);
    }

    @GetMapping("/pending-count")
    public PendingCountResponseDTO getPendingCount() {
        return PendingCountResponseDTO.of(propertyRequestService.getPendingCount());
    }
}
