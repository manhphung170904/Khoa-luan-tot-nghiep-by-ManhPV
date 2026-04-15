package com.estate.api.admin;

import com.estate.dto.*;
import com.estate.security.CustomUserDetails;
import com.estate.service.PropertyRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/property-request")
@RequiredArgsConstructor
public class AdminPropertyRequestAPI {
    private final PropertyRequestService propertyRequestService;

    @GetMapping("/list/page")
    public Page<PropertyRequestListDTO> getRequestsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status
    ) {
        return propertyRequestService.getRequests(status, page - 1, size);
    }

    @GetMapping("/{id}")
    public PropertyRequestDetailDTO getRequestDetail(@PathVariable Long id) {
        return propertyRequestService.getRequestDetail(id);
    }

    @PutMapping("/reject/{id}")
    public ResponseEntity<?> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        String reason = body.getOrDefault("reason", "");
        propertyRequestService.reject(id, user.getUserId(), reason);
        return ResponseEntity.ok("Đã từ chối yêu cầu");
    }

    @PutMapping("/approve/{id}")
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long contractId = body.get("contractId");
        Long saleContractId = body.get("saleContractId");
        propertyRequestService.markApproved(id, user.getUserId(), contractId, saleContractId);
        return ResponseEntity.ok("Đã duyệt yêu cầu");
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
    public Long getPendingCount() {
        return propertyRequestService.getPendingCount();
    }
}
