package com.estate.api.staff;

import com.estate.dto.ApiErrorResponse;
import com.estate.dto.CustomerDetailDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.CustomerService;
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
import java.util.Map;

@RestController
@RequestMapping("/staff/customers")
@RequiredArgsConstructor
public class StaffCustomerAPI {
    private final CustomerService customerService;

    @GetMapping("/search")
    public Page<CustomerDetailDTO> getContractsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam Map<String, String> requestParams,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        requestParams.put("staffId", String.valueOf(user.getUserId()));
        return customerService.searchByStaff(requestParams, page - 1, size);
    }

    @RequestMapping(value = "/search", method = {RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    public ResponseEntity<ApiErrorResponse> rejectUnsupportedWrite(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiErrorResponse.of("METHOD_NOT_ALLOWED", "Method not allowed", request.getRequestURI(), OffsetDateTime.now()));
    }
}
