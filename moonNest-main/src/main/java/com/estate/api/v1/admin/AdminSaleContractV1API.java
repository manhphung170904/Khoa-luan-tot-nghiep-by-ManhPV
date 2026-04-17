package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.PageResponse;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.dto.SaleContractListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.SaleContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/sale-contracts")
@RequiredArgsConstructor
public class AdminSaleContractV1API {
    private final SaleContractService saleContractService;

    @GetMapping
    public PageResponse<SaleContractListDTO> getSaleContracts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @ModelAttribute SaleContractFilterDTO filter
    ) {
        return PageResponse.from(saleContractService.search(filter, page - 1, size));
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addSaleContract(
            @Valid @RequestBody SaleContractFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        saleContractService.save(dto);
        return ResponseEntity.ok(ApiMessageResponse.of("T?o h?p ??ng mua b?n th?nh c?ng."));
    }

    @PutMapping("/{id}")
    public ApiMessageResponse<Void> editSaleContract(
            @PathVariable Long id,
            @Valid @RequestBody SaleContractFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        dto.setId(id);
        saleContractService.save(dto);
        return ApiMessageResponse.of("C?p nh?t h?p ??ng mua b?n th?nh c?ng.");
    }

    @DeleteMapping("/{id}")
    public ApiMessageResponse<Void> deleteSaleContract(@PathVariable Long id) {
        saleContractService.delete(id);
        return ApiMessageResponse.of("X?a h?p ??ng mua b?n th?nh c?ng.");
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
