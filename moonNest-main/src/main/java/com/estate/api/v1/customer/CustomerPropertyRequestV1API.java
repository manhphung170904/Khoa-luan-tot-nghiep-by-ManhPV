package com.estate.api.v1.customer;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.PropertyRequestFormDTO;
import com.estate.dto.PropertyRequestListDTO;
import com.estate.exception.InputValidationException;
import com.estate.security.CustomUserDetails;
import com.estate.service.PropertyRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customer/property-requests")
@RequiredArgsConstructor
public class CustomerPropertyRequestV1API {
    private final PropertyRequestService propertyRequestService;

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> submitRequest(
            @Valid @RequestBody PropertyRequestFormDTO dto,
            BindingResult result,
            @AuthenticationPrincipal CustomUserDetails user) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().isEmpty()
                    ? result.getAllErrors().getFirst().getDefaultMessage()
                    : result.getFieldErrors().getFirst().getDefaultMessage();
            throw new InputValidationException(message);
        }

        propertyRequestService.submit(dto, user.getUserId());
        return ResponseEntity.ok(ApiMessageResponse.of("Gửi yêu cầu thành công."));
    }

    @GetMapping
    public List<PropertyRequestListDTO> getMyRequests(@AuthenticationPrincipal CustomUserDetails user) {
        return propertyRequestService.getRequestsByCustomer(user.getUserId());
    }

    @DeleteMapping("/{id}")
    public ApiMessageResponse<Void> cancelRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        propertyRequestService.cancel(id, user.getUserId());
        return ApiMessageResponse.of("Hủy yêu cầu thành công.");
    }
}
