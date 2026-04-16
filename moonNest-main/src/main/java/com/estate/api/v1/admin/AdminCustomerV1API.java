package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.CustomerFormDTO;
import com.estate.dto.CustomerListDTO;
import com.estate.dto.PageResponse;
import com.estate.exception.InputValidationException;
import com.estate.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/customers")
@RequiredArgsConstructor
public class AdminCustomerV1API {
    private final CustomerService customerService;

    @GetMapping
    public PageResponse<CustomerListDTO> getCustomers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String fullName
    ) {
        return PageResponse.from(customerService.search(fullName, page - 1, size));
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addCustomer(
            @Valid @RequestBody CustomerFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        customerService.save(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiMessageResponse.of("Th?m kh?ch h?ng th?nh c?ng."));
    }

    @DeleteMapping("/{id}")
    public ApiMessageResponse<Void> deleteCustomer(@PathVariable Long id) {
        customerService.delete(id);
        return ApiMessageResponse.of("X?a kh?ch h?ng th?nh c?ng.");
    }

    private void validate(BindingResult result) {
        if (result.hasErrors()) {
            if (!result.getFieldErrors().isEmpty()) {
                throw new InputValidationException(result.getFieldErrors().getFirst().getDefaultMessage());
            }
            throw new InputValidationException(result.getAllErrors().getFirst().getDefaultMessage());
        }
    }
}
