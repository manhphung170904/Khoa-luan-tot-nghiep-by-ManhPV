package com.estate.api.customer;

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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer/property-request")
@RequiredArgsConstructor
public class CustomerPropertyRequestAPI {
    private final PropertyRequestService propertyRequestService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitRequest(
            @Valid @RequestBody PropertyRequestFormDTO dto,
            BindingResult result,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().isEmpty()
                    ? result.getAllErrors().getFirst().getDefaultMessage()
                    : result.getFieldErrors().getFirst().getDefaultMessage();
            throw new InputValidationException(message);
        }

        propertyRequestService.submit(dto, user.getUserId());
        return ResponseEntity.ok("Gửi yêu cầu thành công! Chúng tôi sẽ liên hệ bạn sớm nhất.");
    }

    @GetMapping("/list")
    public List<PropertyRequestListDTO> getMyRequests(
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        return propertyRequestService.getRequestsByCustomer(user.getUserId());
    }

    @DeleteMapping("/cancel/{id}")
    public ResponseEntity<?> cancelRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        propertyRequestService.cancel(id, user.getUserId());
        return ResponseEntity.ok("Đã hủy yêu cầu");
    }
}
