package com.estate.api.staff;

import com.estate.dto.ApiErrorResponse;
import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.SaleContractService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/staff/sale-contracts")
@RequiredArgsConstructor
public class StaffSaleContractAPI {
    private final SaleContractService saleContractService;

    @GetMapping("/search")
    public Page<SaleContractDetailDTO> getSaleContractsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            SaleContractFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        // Luôn ép filter theo staffId của nhân viên đang đăng nhập
        filter.setStaffId(user.getUserId());
        return saleContractService.searchDetails(filter, page - 1, size);
    }
    @RequestMapping(value = "/search", method = {RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    public ResponseEntity<ApiErrorResponse> rejectUnsupportedWrite(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiErrorResponse.of("METHOD_NOT_ALLOWED", "Method not allowed", request.getRequestURI(), OffsetDateTime.now()));
    }
}
