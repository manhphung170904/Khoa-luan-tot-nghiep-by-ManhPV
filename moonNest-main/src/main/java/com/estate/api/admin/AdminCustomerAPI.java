package com.estate.api.admin;

import com.estate.dto.CustomerFormDTO;
import com.estate.dto.CustomerListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/customer")
@RequiredArgsConstructor
public class AdminCustomerAPI {
    private final CustomerService customerService;

    @GetMapping("/list/page")
    public Page<CustomerListDTO> getCustomersPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return customerService.getCustomers(page - 1, size);
    }

    @GetMapping("/search/page")
    public Page<CustomerListDTO> getCustomersSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String fullName
    ) {
        return customerService.search(fullName, page - 1, size);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addCustomer(
            @Valid @RequestBody CustomerFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message;

            if (!result.getFieldErrors().isEmpty()) {
                message = result.getFieldErrors().getFirst().getDefaultMessage();
            } else {
                message = result.getAllErrors().getFirst().getDefaultMessage();
            }

            throw new InputValidationException(message);
        }

        customerService.save(dto);
        return ResponseEntity.ok("Thêm khách hàng thành công");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        customerService.delete(id);
        return ResponseEntity.ok().build();
    }
}
